import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchCitizenFullDetails, type CitizenFullProfile } from "@/lib/live-exam/irembo";
import { saveNationalIdRecord } from "@/lib/live-exam/save-record";

export const dynamic = "force-dynamic";

interface VerifyIdBody {
  national_id?: string;
  verification_type?: "name" | "dob";
  verification_value?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  dob?: string;
}

function normalizeText(text?: string | null): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics/accents
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
    results.push(`${m1[1]}-${m1[2].padStart(2, "0")}-${m1[3].padStart(2, "0")}`);
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const m2 = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m2) {
    results.push(`${m2[3]}-${m2[2].padStart(2, "0")}-${m2[1].padStart(2, "0")}`);
  }

  // 4-digit Year only
  const m3 = clean.match(/^(\d{4})$/);
  if (m3) {
    results.push(m3[1]);
  }

  return results;
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function checkSingleNameMatch(
  inputName: string,
  citizen: CitizenFullProfile,
  existingNames: (string | null | undefined)[] = []
): boolean {
  const cleanInput = (inputName || "").trim();
  if (!cleanInput) return false;

  const inputNorm = normalizeText(cleanInput);
  if (inputNorm.length < 2) return false;

  const allNamesList = [
    citizen.firstName,
    citizen.lastName,
    citizen.middleName,
    citizen.fullName,
    ...existingNames,
  ]
    .filter(Boolean)
    .join(" ");

  if (!allNamesList.trim()) return false;

  const docFullNorm = normalizeText(allNamesList);
  if (docFullNorm && (docFullNorm.includes(inputNorm) || inputNorm.includes(docFullNorm))) {
    if (inputNorm.length >= 3) return true;
  }

  const inputTokens = cleanInput
    .split(/[\s,.-]+/)
    .map(normalizeText)
    .filter((t) => t.length >= 2);

  const docTokens = allNamesList
    .split(/[\s,.-]+/)
    .map(normalizeText)
    .filter((t) => t.length >= 2);

  if (inputTokens.length === 0 || docTokens.length === 0) return false;

  for (const inTok of inputTokens) {
    for (const docTok of docTokens) {
      if (inTok === docTok) return true;
      if (inTok.length >= 3 && (docTok.startsWith(inTok) || inTok.startsWith(docTok))) return true;
      if (inTok.length >= 4 && docTok.length >= 4) {
        const dist = levenshteinDistance(inTok, docTok);
        if (dist <= 1 || (inTok.length >= 6 && dist <= 2)) return true;
      }
    }
  }

  return false;
}

function checkDobMatch(
  inputDob: string,
  citizen: CitizenFullProfile,
  cleanId: string,
  existingBirthdate?: string | null
): boolean {
  const cleanInput = (inputDob || "").trim();
  if (!cleanInput) return false;

  const inputDates = parseDates(cleanInput);
  const docDates = [
    ...parseDates(citizen.dateOfBirth),
    ...(existingBirthdate ? parseDates(existingBirthdate) : []),
  ];
  const embeddedYear = citizen.embeddedBirthYear || (cleanId.length === 16 ? cleanId.substring(1, 5) : "");

  if (docDates.length === 0 && !embeddedYear) return false;

  for (const inD of inputDates) {
    for (const docD of docDates) {
      if (inD === docD) return true;
      if (inD.length === 4 && docD.startsWith(inD)) return true;
    }
    // Only match embeddedYear if year string matches exactly and is valid
    if (inD.length === 4 && embeddedYear && inD === embeddedYear) return true;
    if (inD.startsWith(embeddedYear) && docDates.length === 0) return true;
  }

  return false;
}

// Verification attempt tracker: max 3 tries before 15-minute temporary lockout
interface VerificationAttemptRecord {
  failedCount: number;
  firstFailedAt: number;
  lastFailedAt: number;
  lockedUntil: number | null;
}

const verificationAttemptsMap = new Map<string, VerificationAttemptRecord>();
const MAX_VERIFICATION_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: NextRequest) {
  let body: VerifyIdBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const rawId = body.national_id || "";
  const cleanId = rawId.trim().replace(/\D/g, "");

  if (!cleanId || cleanId.length !== 16) {
    return NextResponse.json(
      { error: "Please enter a valid 16-digit Rwandan National ID number." },
      { status: 400 }
    );
  }

  // Determine verification method: Single Name or Date of Birth alone
  let verificationType: "name" | "dob" = body.verification_type || "name";
  let nameValue = (body.name || body.verification_value || body.first_name || body.last_name || "").trim();
  let dobValue = (body.dob || (body.verification_type === "dob" ? body.verification_value : "") || "").trim();

  // If verification_value was sent without explicit type, check if it looks like a date
  if (!body.verification_type && body.verification_value) {
    if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(body.verification_value) || /^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/.test(body.verification_value) || /^\d{4}$/.test(body.verification_value)) {
      verificationType = "dob";
      dobValue = body.verification_value;
    } else {
      verificationType = "name";
      nameValue = body.verification_value;
    }
  } else if (body.dob && !body.name && !body.first_name && !body.last_name && !body.verification_value) {
    verificationType = "dob";
  }

  if (verificationType === "dob" && !dobValue) {
    return NextResponse.json(
      { error: "Please provide your Date of Birth as it appears on your National ID." },
      { status: 400 }
    );
  }

  if (verificationType === "name" && !nameValue) {
    return NextResponse.json(
      { error: "Please provide either your First Name or Last Name to verify your ID." },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required to verify ID." }, { status: 401 });
    }

    const now = Date.now();
    const userAttemptKey = user.id;
    let attemptRecord = verificationAttemptsMap.get(userAttemptKey);

    // Check if user is locked out
    if (attemptRecord?.lockedUntil && attemptRecord.lockedUntil > now) {
      const remainingMinutes = Math.max(1, Math.ceil((attemptRecord.lockedUntil - now) / 60000));
      return NextResponse.json(
        {
          success: false,
          error: `You have reached the maximum number of attempts (3). Please wait ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"} before trying again.`,
          attempts_remaining: 0,
          locked: true,
          locked_until: attemptRecord.lockedUntil,
        },
        { status: 429 }
      );
    }

    // Reset attempt record if lockout has passed or last fail was over 15 mins ago
    if (
      attemptRecord &&
      ((attemptRecord.lockedUntil && attemptRecord.lockedUntil <= now) ||
        now - attemptRecord.lastFailedAt > LOCKOUT_DURATION_MS)
    ) {
      verificationAttemptsMap.delete(userAttemptKey);
      attemptRecord = undefined;
    }

    const adminSupabase = createAdminClient();

    // Check if this National ID is already registered to ANOTHER user profile
    const { data: existingUser } = await adminSupabase
      .from("user_profiles")
      .select("id, email, full_name, first_name, last_name, birthdate, avatar_url")
      .eq("national_id", cleanId)
      .neq("id", user.id)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        {
          error: "This National ID is already registered and verified on another account.",
        },
        { status: 409 }
      );
    }

    // Query Irembo / Police / Theory Exam APIs for official citizen profile
    const citizen = await fetchCitizenFullDetails(cleanId);

    // Also check if current user or national_id_records has existing record
    const { data: existingRecord } = await adminSupabase
      .from("national_id_records")
      .select("national_id, user_name, user_email, is_verified")
      .eq("national_id", cleanId)
      .maybeSingle();

    const { data: currentProfile } = await adminSupabase
      .from("user_profiles")
      .select("id, full_name, first_name, last_name, birthdate")
      .eq("id", user.id)
      .maybeSingle();

    const hasOfficialRecord =
      citizen.hasOfficialRecord ||
      Boolean(citizen.firstName) ||
      Boolean(citizen.lastName) ||
      Boolean(existingRecord?.user_name);

    const helperRecordFailed = () => {
      const currentAttempts = (attemptRecord?.failedCount || 0) + 1;
      const remainingAttempts = Math.max(0, MAX_VERIFICATION_ATTEMPTS - currentAttempts);
      const isLockedNow = remainingAttempts === 0;
      const lockedUntilTime = isLockedNow ? now + LOCKOUT_DURATION_MS : null;

      verificationAttemptsMap.set(userAttemptKey, {
        failedCount: currentAttempts,
        firstFailedAt: attemptRecord?.firstFailedAt || now,
        lastFailedAt: now,
        lockedUntil: lockedUntilTime,
      });

      return { remainingAttempts, isLockedNow, lockedUntilTime };
    };

    // If ID doesn't exist in official registry or database, REJECT immediately!
    if (!hasOfficialRecord) {
      const { remainingAttempts, isLockedNow, lockedUntilTime } = helperRecordFailed();

      if (isLockedNow) {
        return NextResponse.json(
          {
            success: false,
            error:
              "National ID was not found in the official registry. You have used all 3 attempts. Please wait 15 minutes before trying again.",
            attempts_remaining: 0,
            locked: true,
            locked_until: lockedUntilTime,
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: `National ID was not found in the official registry. Please check your 16-digit ID. (${remainingAttempts} ${remainingAttempts === 1 ? "attempt" : "attempts"} remaining)`,
          attempts_remaining: remainingAttempts,
          locked: false,
        },
        { status: 404 }
      );
    }

    // Check verification using either Single Name OR DOB
    let isMatching = false;
    let mismatchMessage = "";

    if (verificationType === "name") {
      const existingNames = [
        existingRecord?.user_name,
        currentProfile?.full_name,
        currentProfile?.first_name,
        currentProfile?.last_name,
      ];
      isMatching = checkSingleNameMatch(nameValue, citizen, existingNames);
      if (!isMatching) {
        mismatchMessage = "The name you entered does not match the official names on this National ID. Please try again.";
      }
    } else {
      // DOB alone verification
      isMatching = checkDobMatch(dobValue, citizen, cleanId, currentProfile?.birthdate);
      if (!isMatching) {
        mismatchMessage = "The date of birth does not match this National ID. Please try again.";
      }
    }

    if (!isMatching) {
      const { remainingAttempts, isLockedNow, lockedUntilTime } = helperRecordFailed();

      if (isLockedNow) {
        return NextResponse.json(
          {
            success: false,
            error: `${mismatchMessage} You have used all 3 attempts. Please wait 15 minutes before trying again.`,
            attempts_remaining: 0,
            locked: true,
            locked_until: lockedUntilTime,
          },
          { status: 422 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: `${mismatchMessage} (${remainingAttempts} ${remainingAttempts === 1 ? "attempt" : "attempts"} remaining)`,
          attempts_remaining: remainingAttempts,
          locked: false,
        },
        { status: 422 }
      );
    }

    // Success: Match verified! Clear failed attempts
    verificationAttemptsMap.delete(userAttemptKey);

    const resolvedFirstName = citizen.firstName || currentProfile?.first_name || (nameValue ? nameValue.split(" ")[0] : "");
    const resolvedLastName = citizen.lastName || currentProfile?.last_name || (nameValue ? nameValue.split(" ").slice(1).join(" ") : "");
    const resolvedFullName =
      citizen.fullName ||
      existingRecord?.user_name ||
      currentProfile?.full_name ||
      [resolvedFirstName, resolvedLastName].filter(Boolean).join(" ");

    const resolvedBirthdate =
      citizen.dateOfBirth && /^\d{4}-\d{2}-\d{2}$/.test(citizen.dateOfBirth)
        ? citizen.dateOfBirth
        : dobValue && /^\d{4}-\d{2}-\d{2}$/.test(dobValue)
        ? dobValue
        : citizen.embeddedBirthYear
        ? `${citizen.embeddedBirthYear}-01-01`
        : undefined;

    const profileUpdates: Record<string, any> = {
      national_id: cleanId,
      is_id_verified: true,
      updated_at: new Date().toISOString(),
    };

    if (resolvedFirstName) profileUpdates.first_name = resolvedFirstName;
    if (resolvedLastName) profileUpdates.last_name = resolvedLastName;
    if (resolvedFullName) profileUpdates.full_name = resolvedFullName;
    if (resolvedBirthdate) profileUpdates.birthdate = resolvedBirthdate;
    if (citizen.photoUrl) profileUpdates.avatar_url = citizen.photoUrl;
    if (citizen.nationality) profileUpdates.nationality = citizen.nationality;
    if (citizen.gender) {
      const gLower = citizen.gender.toLowerCase();
      if (gLower === "male" || gLower === "female" || gLower === "other") {
        profileUpdates.gender = gLower;
      }
    }

    // Update user profile in database
    const { error: updateError } = await adminSupabase
      .from("user_profiles")
      .update(profileUpdates)
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating user profile:", updateError);
    }

    // Update user auth metadata (safely avoiding large base64 data URIs)
    const safeMetaAvatarUrl =
      citizen.photoUrl && !citizen.photoUrl.startsWith("data:")
        ? citizen.photoUrl
        : user.user_metadata?.avatar_url;

    try {
      await adminSupabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          national_id: cleanId,
          is_id_verified: true,
          first_name: resolvedFirstName || user.user_metadata?.first_name,
          last_name: resolvedLastName || user.user_metadata?.last_name,
          full_name: resolvedFullName || user.user_metadata?.full_name,
          avatar_url: safeMetaAvatarUrl || null,
          birthdate: resolvedBirthdate || user.user_metadata?.birthdate,
        },
      });
    } catch (metaErr) {
      console.warn("Failed to update auth metadata:", metaErr);
    }

    // Save record to national_id_records as verified
    await saveNationalIdRecord(cleanId, user.id, {
      isVerified: true,
      userName: resolvedFullName,
      userEmail: user.email,
    });

    return NextResponse.json({
      success: true,
      message: "National ID verified and linked successfully!",
      citizen: {
        nationalId: cleanId,
        firstName: resolvedFirstName,
        lastName: resolvedLastName,
        fullName: resolvedFullName,
        dateOfBirth: citizen.dateOfBirth || resolvedBirthdate,
        photoUrl: citizen.photoUrl,
        gender: citizen.gender,
        province: citizen.province,
        district: citizen.district,
      },
    });
  } catch (err: any) {
    console.error("ID verification error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to verify National ID. Please try again." },
      { status: 500 }
    );
  }
}
