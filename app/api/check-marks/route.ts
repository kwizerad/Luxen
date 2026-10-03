import { NextRequest, NextResponse } from "next/server";
import {
  fetchRegistrationCodes,
  fetchCodeDetails,
  fetchDLInfoByNationalId,
  fetchTheoryExamDLInfo,
  type CitizenFullProfile,
} from "@/lib/live-exam/irembo";
import { saveNationalIdRecord } from "@/lib/live-exam/save-record";
import { createClient } from "@/lib/supabase/server";
import type { CheckMarksResponse } from "@/lib/live-exam/types";

function normalizeText(text?: string | null): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function parseDates(str?: string | null): string[] {
  if (!str) return [];
  const results: string[] = [];
  const clean = str.trim();

  // YYYY-MM-DD or YYYY/MM/DD
  const m1 = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m1) {
    const yyyy = m1[1];
    const p1 = m1[2].padStart(2, "0");
    const p2 = m1[3].padStart(2, "0");
    results.push(`${yyyy}-${p1}-${p2}`);
    results.push(`${yyyy}-${p2}-${p1}`);
    results.push(yyyy);
  }

  // DD/MM/YYYY or MM/DD/YYYY
  const m2 = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m2) {
    const p1 = m2[1].padStart(2, "0");
    const p2 = m2[2].padStart(2, "0");
    const yyyy = m2[3];
    results.push(`${yyyy}-${p2}-${p1}`);
    results.push(`${yyyy}-${p1}-${p2}`);
    results.push(yyyy);
  }

  const m3 = clean.match(/^(\d{4})$/);
  if (m3) {
    results.push(m3[1]);
  }

  return Array.from(new Set(results));
}

function checkNameMatch(
  inputName: string,
  citizen: CitizenFullProfile | null,
  candidateNames: string[]
): boolean {
  const cleanInput = (inputName || "").trim();
  const inputNorm = normalizeText(cleanInput);
  if (inputNorm.length < 2) return false;

  const combinedNames = [
    citizen?.firstName,
    citizen?.lastName,
    citizen?.middleName,
    citizen?.fullName,
    ...candidateNames,
  ]
    .filter((n) => n && n !== "N/A")
    .join(" ");

  if (!combinedNames.trim()) {
    // If upstream didn't return a name on any endpoint, allow valid non-empty name
    return inputNorm.length >= 2;
  }

  const fullNorm = normalizeText(combinedNames);
  if (fullNorm && (fullNorm.includes(inputNorm) || inputNorm.includes(fullNorm))) {
    return true;
  }

  const inputTokens = cleanInput
    .split(/[\s,.-]+/)
    .map(normalizeText)
    .filter((t) => t.length >= 2);

  const docTokens = combinedNames
    .split(/[\s,.-]+/)
    .map(normalizeText)
    .filter((t) => t.length >= 2);

  for (const inTok of inputTokens) {
    for (const docTok of docTokens) {
      if (inTok === docTok) return true;
      if (inTok.length >= 3 && (docTok.startsWith(inTok) || inTok.startsWith(docTok))) {
        return true;
      }
    }
  }

  return false;
}

function checkDobMatch(
  inputDob: string,
  citizen: CitizenFullProfile | null,
  nationalId: string
): boolean {
  const cleanInput = (inputDob || "").trim();
  if (!cleanInput) return false;

  const inputDates = parseDates(cleanInput);
  const docDates = parseDates(citizen?.dateOfBirth);
  const embeddedYear =
    citizen?.embeddedBirthYear || (nationalId.length === 16 ? nationalId.substring(1, 5) : "");

  if (docDates.length > 0) {
    for (const inD of inputDates) {
      for (const docD of docDates) {
        if (inD === docD) return true;
      }
    }
  }

  if (embeddedYear) {
    for (const inD of inputDates) {
      if (inD === embeddedYear || inD.startsWith(embeddedYear)) {
        return true;
      }
    }
    if (cleanInput.includes(embeddedYear)) {
      return true;
    }
  }

  return false;
}

export async function POST(request: NextRequest) {
  let body: {
    national_id?: string;
    verification_type?: "name" | "dob";
    verification_value?: string;
    name?: string;
    dob?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<CheckMarksResponse>(
      {
        status: "error",
        code: "INVALID_REQUEST",
        message:
          "Invalid request body. Please send a JSON object with a national_id field.",
      },
      { status: 400 }
    );
  }

  const nationalId = (body.national_id || "").trim().replace(/\D/g, "");
  if (!nationalId || nationalId.length !== 16) {
    return NextResponse.json<CheckMarksResponse>(
      {
        status: "error",
        code: "INVALID_ID",
        message:
          "Invalid National ID. Please enter a valid 16-digit ID.",
      },
      { status: 400 }
    );
  }

  const verificationType = body.verification_type;
  const verificationValue = (
    body.verification_value ||
    (verificationType === "name" ? body.name : body.dob) ||
    body.name ||
    body.dob ||
    ""
  ).trim();

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id;

    // 1. Fetch registration codes and lightweight DL/Theory profile in parallel (no duplicate code fetches)
    const [response, dlRes, theoryRes] = await Promise.all([
      fetchRegistrationCodes(nationalId),
      verificationValue
        ? fetchDLInfoByNationalId(nationalId).catch(() => null)
        : Promise.resolve(null),
      verificationValue
        ? fetchTheoryExamDLInfo(nationalId).catch(() => null)
        : Promise.resolve(null),
    ]);

    const citizenProfile: CitizenFullProfile = {
      nationalId,
      firstName: "",
      lastName: "",
      middleName: "",
      fullName: "",
      dateOfBirth: "",
      embeddedBirthYear:
        nationalId.length === 16 ? nationalId.substring(1, 5) : undefined,
      gender: "Other",
      photoUrl: "",
      nationality: "Rwandan",
      hasOfficialRecord: false,
    };

    if (dlRes?.status && dlRes.data) {
      const doc = dlRes.data.document;
      const lic = dlRes.data.license;
      if (doc) {
        if (doc.firstName) citizenProfile.firstName = doc.firstName;
        if (doc.lastName) citizenProfile.lastName = doc.lastName;
        if (doc.dateOfBirth) citizenProfile.dateOfBirth = doc.dateOfBirth;
        citizenProfile.hasOfficialRecord = true;
      }
      if (lic) {
        if (!citizenProfile.firstName && lic.firstName) citizenProfile.firstName = lic.firstName;
        if (!citizenProfile.lastName && lic.lastName) citizenProfile.lastName = lic.lastName;
        if (!citizenProfile.dateOfBirth && lic.dob) citizenProfile.dateOfBirth = lic.dob;
        citizenProfile.hasOfficialRecord = true;
      }
    }

    if (theoryRes?.status && theoryRes.data?.document) {
      const doc = theoryRes.data.document;
      if (!citizenProfile.firstName && doc.firstName) citizenProfile.firstName = doc.firstName;
      if (!citizenProfile.lastName && doc.lastName) citizenProfile.lastName = doc.lastName;
      if (!citizenProfile.dateOfBirth && doc.dateOfBirth) citizenProfile.dateOfBirth = doc.dateOfBirth;
      citizenProfile.hasOfficialRecord = true;
    }

    citizenProfile.fullName = [
      citizenProfile.firstName,
      citizenProfile.middleName,
      citizenProfile.lastName,
    ]
      .map((s) => (s || "").trim())
      .filter(Boolean)
      .join(" ");

    if (response.status === 404 || response.status === 400) {
      return NextResponse.json<CheckMarksResponse>({
        status: "error",
        code: "NO_CODES",
        message:
          "This user has no existing exam codes.",
      });
    }

    if (!response.ok) {
      return NextResponse.json<CheckMarksResponse>({
        status: "error",
        code: "SERVER_ERROR",
        message: `Unable to connect to the verification system. Status code: ${response.status}`,
      });
    }

    const resData = await response.json();

    if (!resData.status) {
      return NextResponse.json<CheckMarksResponse>({
        status: "error",
        code: "NO_CODES",
        message:
          "This user has no existing exam codes.",
      });
    }

    if (!resData.data || !resData.data.registrationCodes) {
      await saveNationalIdRecord(nationalId, userId);
      return NextResponse.json<CheckMarksResponse>({
        status: "error",
        code: "NO_CODES",
        message:
          "This user has no existing exam codes.",
      });
    }

    const codesList: string[] = resData.data.registrationCodes;
    if (!codesList || codesList.length === 0) {
      await saveNationalIdRecord(nationalId, userId);
      return NextResponse.json<CheckMarksResponse>({
        status: "error",
        code: "NO_CODES",
        message:
          "This user has no existing exam codes.",
      });
    }

    const codeDetails = await Promise.all(
      codesList.map((code) => fetchCodeDetails(code))
    );

    const practicalCodes: string[] = [];
    const theoryCodes: string[] = [];
    const candidateNames: string[] = [];
    let candidateName = citizenProfile?.fullName || "N/A";
    let resultNationalId = nationalId;

    for (const result of codeDetails) {
      if (result.isPractical) {
        practicalCodes.push(result.registrationCode);
      } else {
        theoryCodes.push(result.registrationCode);
      }

      if (result.candidateName && result.candidateName !== "N/A") {
        candidateNames.push(result.candidateName);
        if (candidateName === "N/A") {
          candidateName = result.candidateName;
        }
      }
      if (result.nationalId && result.nationalId !== "N/A") {
        resultNationalId = result.nationalId;
      }
    }

    // Verify Name or Date of Birth when provided by the verification modal
    if (verificationType === "name") {
      if (!verificationValue || !checkNameMatch(verificationValue, citizenProfile, candidateNames)) {
        return NextResponse.json<CheckMarksResponse>(
          {
            status: "error",
            code: "VERIFICATION_FAILED",
            message:
              "The name you entered does not match the official record for this National ID.",
          },
          { status: 422 }
        );
      }
    } else if (verificationType === "dob") {
      if (!verificationValue || !checkDobMatch(verificationValue, citizenProfile, nationalId)) {
        return NextResponse.json<CheckMarksResponse>(
          {
            status: "error",
            code: "VERIFICATION_FAILED",
            message:
              "The Date of Birth you entered does not match the official record for this National ID.",
          },
          { status: 422 }
        );
      }
    }

    const results: Record<string, (typeof codeDetails)[0]> = {};
    for (const detail of codeDetails) {
      results[detail.registrationCode] = detail;
    }

    // Save to database
    await saveNationalIdRecord(nationalId, userId);

    return NextResponse.json<CheckMarksResponse>({
      status: "success",
      candidateName,
      nationalId: resultNationalId,
      practical_codes: practicalCodes,
      theory_codes: theoryCodes,
      results,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json<CheckMarksResponse>({
        status: "error",
        code: "TIMEOUT",
        message:
          "The request took too long to complete. Please check your internet connection and try again.",
      });
    }

    return NextResponse.json<CheckMarksResponse>({
      status: "error",
      code: "SYSTEM_ERROR",
      message: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
