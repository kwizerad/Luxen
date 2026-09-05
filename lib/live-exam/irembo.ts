import type { ExamResultDetails, DLInfoResponse, TheoryExamDLInfoResponse } from "./types";
import { getCachedResult, setCachedResult, hasCachedResult } from "./cache";

export const IREMBO_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9,rw;q=0.8",
  "Access-Control-Allow-Origin": "*",
  Origin: "https://irembo.gov.rw",
  Referer:
    "https://irembo.gov.rw/user/citizen/service/rnp/registration_for_driving_license_test_supplementary",
  "x-irembo-service-code":
    "REGISTRATION_FOR_DRIVING_LICENSE_TEST_SUPPLEMENTARY",
  Servicecode: "CHECK_EXAM_RESULT",
  "X-Requested-With": "XMLHttpRequest",
  nls: "Kinyarwanda",
  rpk: "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCjEaaCYCJ31M/7sVj8/HKeK2bBiiq9hZrWgA2DHbdsgdc9bOpA7mtufZsCW6JmNOp+GswSMGvQGm5HIApjeR9WPmf1NryVzQ2bEo0dGK3IgLqL/MvC7Svp8hEOajXo9QHlF7gjGPX3Jpo4Aywlxuzg2AYpPF21CuT4e85sYOW9vwIDAQAB",
  "Sec-Ch-Ua":
    '"Not=A?Brand";v="99", "Google Chrome";v="151", "Chromium";v="151"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
};

const IREMBO_BASE = "https://irembo.gov.rw/irembo/rest/public/police/v2";
const REGISTRATION_CODE_URL = `${IREMBO_BASE}/request/exam/registration/registration-code`;
const APPLICANT_CODE_URL = `${IREMBO_BASE}/request/applicant-dl-registration-code`;
const DL_INFO_URL = `${IREMBO_BASE}/request/get-dl-by-national-id`;
const THEORY_EXAM_DL_INFO_URL = `${IREMBO_BASE}/request/theory-exam/get-dl-by-national-id`;

export function formatExamDate(dateStr: string): string {
  if (!dateStr) return "N/A";

  const formats: { pattern: RegExp; parts: number }[] = [
    { pattern: /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/, parts: 5 },
    { pattern: /^(\d{4})-(\d{2})-(\d{2})$/, parts: 3 },
  ];

  for (const fmt of formats) {
    const match = dateStr.match(fmt.pattern);
    if (match) {
      const [, year, month, day, hour, minute] = match;
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        hour ? parseInt(hour) : 0,
        minute ? parseInt(minute) : 0
      );

      const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ];
      const monthName = months[parseInt(month) - 1];

      if (fmt.parts === 5) {
        let h = parseInt(hour);
        const ampm = h >= 12 ? "PM" : "AM";
        h = h % 12 || 12;
        return `${monthName} ${parseInt(day)}, ${year} at ${h}:${minute} ${ampm}`;
      }
      return `${monthName} ${parseInt(day)}, ${year}`;
    }
  }

  return dateStr;
}

interface ExamCenter {
  name?: string;
  locationName?: string;
}

export function formatTestCenter(examCenters?: ExamCenter[]): string {
  if (!examCenters || examCenters.length === 0) return "N/A";

  const center = examCenters[0];
  const centerName = center.name || "";
  const locationName = center.locationName || "";

  if (centerName && locationName) {
    return `${centerName} (${locationName})`;
  }
  return centerName || locationName || "N/A";
}

function createDefaultDetails(code: string): ExamResultDetails {
  return {
    registrationCode: code,
    status: "N/A",
    examType: "UNKNOWN",
    examTypeRaw: "UNKNOWN",
    isPractical: false,
    isTheory: false,
    licenseCategory: "N/A",
    examDate: "N/A",
    testCenter: "N/A",
    marksObtained: 0,
    totalMarks: 20,
    passMark: 20,
    passed: false,
    grade: "N/A",
    candidateName: "N/A",
    nationalId: "N/A",
  };
}

export async function fetchCodeDetails(code: string): Promise<ExamResultDetails> {
  if (hasCachedResult(code)) {
    return getCachedResult(code)!;
  }

  const headers: Record<string, string> = {
    ...IREMBO_HEADERS,
    Registrationcode: code,
  };

  const details = createDefaultDetails(code);

  try {
    const response = await fetch(REGISTRATION_CODE_URL, {
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      const detailData = await response.json();
      if (detailData.status && detailData.data) {
        const reg = detailData.data.dlExamRegistration;
        if (reg) {
          const schedule = reg.dlExamSchedule || {};
          const exam = reg.dlExamination || {};
          const candidate = reg.dlExamCandidate || {};

          const examType = schedule.examType || "UNKNOWN";
          details.status = reg.status || "N/A";
          details.examType =
            examType === "PRACTICAL"
              ? "Practical"
              : examType === "THEORY"
                ? "Theory"
                : examType;
          details.examTypeRaw = examType;
          details.isPractical = examType === "PRACTICAL";
          details.isTheory = examType === "THEORY";
          details.licenseCategory = schedule.licenseCategoryName || "N/A";
          details.examDate = formatExamDate(
            schedule.examStartDate || schedule.examEndDate || ""
          );
          details.testCenter = formatTestCenter(schedule.examCenters);
          details.marksObtained = exam.gainedMark || 0;
          details.totalMarks = exam.totalMark || 20;
          details.passMark = exam.passMark || 20;
          details.passed = exam.grade === "PASS";
          details.grade = exam.grade || "N/A";
          const firstName = candidate.firstName || "";
          const lastName = candidate.lastName || "";
          details.candidateName =
            `${firstName} ${lastName}`.trim() || "N/A";
          details.nationalId = candidate.nid || "N/A";
        }
      }
    }
  } catch {
    // Silently fail — return default details
  }

  setCachedResult(code, details);
  return details;
}

export async function fetchRegistrationCodes(
  nationalId: string
): Promise<Response> {
  const headers: Record<string, string> = {
    ...IREMBO_HEADERS,
    Nationalid: nationalId,
  };

  return fetch(APPLICANT_CODE_URL, {
    headers,
    signal: AbortSignal.timeout(10000),
  });
}

export async function fetchMarksByCode(
  registrationCode: string
): Promise<Response> {
  const headers: Record<string, string> = {
    ...IREMBO_HEADERS,
    Registrationcode: registrationCode,
  };

  return fetch(REGISTRATION_CODE_URL, {
    headers,
    signal: AbortSignal.timeout(10000),
  });
}

export function parseVehicleClass(vehicleClass: string): string[] {
  if (!vehicleClass) return [];
  return vehicleClass
    .split(";")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

export async function fetchDLInfoByNationalId(
  nationalId: string
): Promise<DLInfoResponse> {
  const headers: Record<string, string> = {
    ...IREMBO_HEADERS,
    Nationalid: nationalId,
  };

  const response = await fetch(DL_INFO_URL, {
    headers,
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`DL info request failed with status ${response.status}`);
  }

  const data = await response.json();
  return data as DLInfoResponse;
}

export async function fetchTheoryExamDLInfo(
  nationalId: string
): Promise<TheoryExamDLInfoResponse> {
  const headers: Record<string, string> = {
    ...IREMBO_HEADERS,
    Nationalid: nationalId,
  };

  const response = await fetch(THEORY_EXAM_DL_INFO_URL, {
    headers,
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Theory exam DL info request failed with status ${response.status}`);
  }

  const data = await response.json();
  return data as TheoryExamDLInfoResponse;
}

export interface CitizenFullProfile {
  nationalId: string;
  firstName: string;
  lastName: string;
  middleName: string;
  fullName: string;
  dateOfBirth: string;
  embeddedBirthYear?: string;
  gender: string;
  photoUrl: string;
  signatureUrl?: string;
  nationality: string;
  hasOfficialRecord: boolean;
  fatherNames?: string;
  motherNames?: string;
  placeOfBirth?: string;
  placeOfIssue?: string;
  civilStatus?: string;
  spouse?: string | null;
  province?: string;
  district?: string;
  sector?: string;
  cell?: string;
  village?: string;
  villageId?: string;
  licenseNumber?: string;
  vehicleClass?: string;
  licenseStatus?: string;
  dateOfIssue?: string;
  dateOfExpiry?: string;
}

/**
 * Robust, multi-endpoint citizen details resolution for Rwanda National IDs.
 * Queries Driving License Info, Theory Exam DL Info, and Applicant Exam Registration Codes.
 */
export async function fetchCitizenFullDetails(
  nationalId: string
): Promise<CitizenFullProfile> {
  const cleanId = nationalId.trim().replace(/\D/g, "");

  const profile: CitizenFullProfile = {
    nationalId: cleanId,
    firstName: "",
    lastName: "",
    middleName: "",
    fullName: "",
    dateOfBirth: "",
    gender: "Other",
    photoUrl: "",
    signatureUrl: "",
    nationality: "Rwandan",
    hasOfficialRecord: false,
  };

  // Decode Rwandan National ID embedded data:
  // Format: 1 YYYY G NNNNNNN C (e.g. 1 2005 8 00491500 2 5)
  // Digits 2-5 = Birth Year, Digit 6 = Gender (8: Male, 7: Female)
  if (cleanId.length === 16) {
    const yearStr = cleanId.substring(1, 5);
    const genderDigit = cleanId.substring(5, 6);
    if (!isNaN(Number(yearStr)) && Number(yearStr) >= 1900 && Number(yearStr) <= 2026) {
      profile.embeddedBirthYear = yearStr;
    }
    if (genderDigit === "8") profile.gender = "Male";
    else if (genderDigit === "7") profile.gender = "Female";
  }

  // Query endpoints in parallel with resilient error handling
  const [dlResult, theoryResult, codesResult] = await Promise.allSettled([
    fetchDLInfoByNationalId(cleanId).catch(() => null),
    fetchTheoryExamDLInfo(cleanId).catch(() => null),
    fetchRegistrationCodes(cleanId).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);

  // 1. Process DL Info (Driving license / existing records)
  if (dlResult.status === "fulfilled" && dlResult.value?.status && dlResult.value.data) {
    const data = dlResult.value.data;
    const doc = data.document;
    const lic = data.license;

    if (doc) {
      if (doc.firstName) profile.firstName = doc.firstName;
      if (doc.lastName) profile.lastName = doc.lastName;
      if (doc.names && !profile.firstName && !profile.lastName) {
        const parts = doc.names.trim().split(/\s+/);
        profile.firstName = parts[0] || "";
        profile.lastName = parts.slice(1).join(" ") || "";
      }
      if (doc.dateOfBirth) profile.dateOfBirth = doc.dateOfBirth;
      if (doc.sex) profile.gender = doc.sex === "male" ? "Male" : doc.sex === "female" ? "Female" : doc.sex;
      if (doc.civilStatus) profile.civilStatus = doc.civilStatus;
      if (doc.spouse) profile.spouse = doc.spouse;
      if (doc.nationality) profile.nationality = doc.nationality === "RW" ? "Rwandan" : doc.nationality;
      if (doc.fatherNames) profile.fatherNames = doc.fatherNames;
      if (doc.motherNames) profile.motherNames = doc.motherNames;
      if (doc.placeOfBirth) profile.placeOfBirth = doc.placeOfBirth;
      if (doc.placeOfIssue) profile.placeOfIssue = doc.placeOfIssue;
      if (doc.province) profile.province = doc.province;
      if (doc.district) profile.district = doc.district;
      if (doc.sector) profile.sector = doc.sector;
      if (doc.cell) profile.cell = doc.cell;
      if (doc.village) profile.village = doc.village;
      if (doc.villageId) profile.villageId = doc.villageId;
      if (doc.photo) profile.photoUrl = `data:image/jpeg;base64,${doc.photo}`;
      if (doc.signature) profile.signatureUrl = `data:image/jpeg;base64,${doc.signature}`;
      profile.hasOfficialRecord = true;
    }

    if (lic) {
      if (!profile.firstName && lic.firstName) profile.firstName = lic.firstName;
      if (!profile.lastName && lic.lastName) profile.lastName = lic.lastName;
      if (!profile.dateOfBirth && lic.dob) profile.dateOfBirth = lic.dob;
      if (!profile.placeOfBirth && lic.placeOfBirth) profile.placeOfBirth = lic.placeOfBirth;
      if (!profile.placeOfIssue && lic.placeOfIssue) profile.placeOfIssue = lic.placeOfIssue;
      if (lic.licenseNumber) profile.licenseNumber = lic.licenseNumber;
      if (lic.vehicleClass) profile.vehicleClass = lic.vehicleClass;
      if (lic.status) profile.licenseStatus = lic.status;
      if (lic.dateOfIssue) profile.dateOfIssue = lic.dateOfIssue;
      if (lic.expiryDate) profile.dateOfExpiry = lic.expiryDate;
      profile.hasOfficialRecord = true;
    }
  }

  // 2. Process Theory Exam DL Info
  if (theoryResult.status === "fulfilled" && theoryResult.value?.status && theoryResult.value.data?.document) {
    const doc = theoryResult.value.data.document;
    if (!profile.firstName && doc.firstName) profile.firstName = doc.firstName;
    if (!profile.lastName && doc.lastName) profile.lastName = doc.lastName;
    if (!profile.dateOfBirth && doc.dateOfBirth) profile.dateOfBirth = doc.dateOfBirth;
    if (doc.sex && (!profile.gender || profile.gender === "Other")) {
      profile.gender = doc.sex === "male" ? "Male" : doc.sex === "female" ? "Female" : doc.sex;
    }
    if (!profile.civilStatus && doc.civilStatus) profile.civilStatus = doc.civilStatus;
    if (!profile.spouse && doc.spouse) profile.spouse = doc.spouse;
    if (!profile.nationality && doc.nationality) profile.nationality = doc.nationality === "RW" ? "Rwandan" : doc.nationality;
    if (!profile.fatherNames && doc.fatherNames) profile.fatherNames = doc.fatherNames;
    if (!profile.motherNames && doc.motherNames) profile.motherNames = doc.motherNames;
    if (!profile.placeOfBirth && doc.placeOfBirth) profile.placeOfBirth = doc.placeOfBirth;
    if (!profile.placeOfIssue && doc.placeOfIssue) profile.placeOfIssue = doc.placeOfIssue;
    if (!profile.province && doc.province) profile.province = doc.province;
    if (!profile.district && doc.district) profile.district = doc.district;
    if (!profile.sector && doc.sector) profile.sector = doc.sector;
    if (!profile.cell && doc.cell) profile.cell = doc.cell;
    if (!profile.village && doc.village) profile.village = doc.village;
    if (!profile.villageId && doc.villageId) profile.villageId = doc.villageId;
    if (!profile.photoUrl && doc.photo) profile.photoUrl = `data:image/jpeg;base64,${doc.photo}`;
    if (!profile.signatureUrl && doc.signature) profile.signatureUrl = `data:image/jpeg;base64,${doc.signature}`;
    profile.hasOfficialRecord = true;
  }

  // 3. Process Applicant Codes if names are still missing or codes are present
  if (codesResult.status === "fulfilled" && codesResult.value?.data?.registrationCodes) {
    const codes = codesResult.value.data.registrationCodes;
    if (Array.isArray(codes) && codes.length > 0) {
      profile.hasOfficialRecord = true;
      if (!profile.firstName || !profile.lastName) {
        try {
          const markPromises = codes.map(async (c: string) => {
            try {
              const marksRes = await fetchMarksByCode(c);
              if (marksRes.ok) {
                const detailData = await marksRes.json();
                return detailData?.data?.dlExamRegistration?.dlExamCandidate || null;
              }
            } catch {
              return null;
            }
            return null;
          });

          const candidates = await Promise.all(markPromises);
          for (const cand of candidates) {
            if (cand) {
              if (cand.firstName && !profile.firstName) profile.firstName = cand.firstName;
              if (cand.lastName && !profile.lastName) profile.lastName = cand.lastName;
              if (cand.middleName && !profile.middleName) profile.middleName = cand.middleName;
              if (cand.dob && !profile.dateOfBirth) profile.dateOfBirth = cand.dob;
              profile.hasOfficialRecord = true;
              break;
            }
          }
        } catch {
          // ignore code details error
        }
      }
    }
  }

  // Fallback date of birth to embedded birth year if exact DOB is absent
  if (!profile.dateOfBirth && profile.embeddedBirthYear) {
    profile.dateOfBirth = profile.embeddedBirthYear;
  }

  // Construct combined full name
  const nameParts = [profile.firstName, profile.middleName, profile.lastName]
    .map((s) => (s || "").trim())
    .filter(Boolean);
  profile.fullName = nameParts.join(" ");

  return profile;
}

