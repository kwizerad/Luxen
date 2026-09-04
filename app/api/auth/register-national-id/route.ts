import { NextRequest, NextResponse } from "next/server";
import { fetchCitizenFullDetails, type CitizenFullProfile } from "@/lib/live-exam/irembo";
import { saveNationalIdRecord } from "@/lib/live-exam/save-record";
import { createAdminClient } from "@/lib/supabase/admin";

interface RegisterNationalIdBody {
  national_id?: string;
  verification_type?: string;
  verification_value?: string;
  password?: string;
  mode?: "register" | "login" | "verify";
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

function verifyCitizenDobMatch(
  userInput: string,
  citizen: CitizenFullProfile,
  existingProfile?: { birthdate?: string | null } | null
): boolean {
  const cleanInput = userInput.trim();
  if (!cleanInput) return false;

  const inputDates = parseDates(cleanInput);
  const docDates = [
    ...parseDates(citizen.dateOfBirth),
    ...(existingProfile?.birthdate ? parseDates(existingProfile.birthdate) : []),
  ];
  const embeddedYear = citizen.embeddedBirthYear || (citizen.nationalId.length === 16 ? citizen.nationalId.substring(1, 5) : "");

  for (const inD of inputDates) {
    for (const docD of docDates) {
      if (inD === docD) return true;
      if (inD.length === 4 && docD.startsWith(inD)) return true;
    }
    if (inD.length === 4 && embeddedYear && inD === embeddedYear) return true;
    if (inD.startsWith(embeddedYear) && docDates.length === 0) return true;
  }
  return false;
}

function verifyCitizenNameMatch(
  userInput: string,
  citizen: CitizenFullProfile,
  existingProfile?: { full_name?: string | null; first_name?: string | null; last_name?: string | null } | null
): boolean {
  const cleanInput = userInput.trim();
  if (!cleanInput) return false;

  const inputNorm = normalizeText(cleanInput);
  const inputTokens = cleanInput
    .split(/[\s,.-]+/)
    .map(normalizeText)
    .filter((t) => t.length >= 2);

  const docFull = [
    citizen.firstName,
    citizen.lastName,
    citizen.middleName,
    citizen.fullName,
    existingProfile?.full_name,
    existingProfile?.first_name,
    existingProfile?.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  const docTokens = docFull
    .split(/[\s,.-]+/)
    .map(normalizeText)
    .filter((t) => t.length >= 2);

  // Exact substring or full name match
  const docFullNorm = normalizeText(docFull);
  if (docFullNorm && (docFullNorm.includes(inputNorm) || inputNorm.includes(docFullNorm))) {
    if (inputNorm.length >= 3) return true;
  }

  // Token matching with fuzzy tolerance
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

function verifyCitizenMatch(
  userInput: string,
  citizen: CitizenFullProfile,
  existingProfile?: { full_name?: string | null; first_name?: string | null; last_name?: string | null; birthdate?: string | null } | null,
  verificationType?: string
): { isVerified: boolean; mismatchField: "name" | "dob" | "general" } {
  if (verificationType === "name") {
    const isVerified = verifyCitizenNameMatch(userInput, citizen, existingProfile);
    return { isVerified, mismatchField: "name" };
  }
  if (verificationType === "dob") {
    const isVerified = verifyCitizenDobMatch(userInput, citizen, existingProfile);
    return { isVerified, mismatchField: "dob" };
  }

  const nameMatch = verifyCitizenNameMatch(userInput, citizen, existingProfile);
  if (nameMatch) return { isVerified: true, mismatchField: "general" };
  const dobMatch = verifyCitizenDobMatch(userInput, citizen, existingProfile);
  if (dobMatch) return { isVerified: true, mismatchField: "general" };

  return { isVerified: false, mismatchField: "general" };
}

export async function POST(request: NextRequest) {
  let body: RegisterNationalIdBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { status: "error", message: "Invalid request body." },
      { status: 400 }
    );
  }

  const rawId = body.national_id || "";
  const cleanId = rawId.replace(/\D/g, "");

  if (cleanId.length !== 16) {
    return NextResponse.json(
      {
        status: "error",
        code: "invalid_id_format",
        message: "Invalid National ID. Please enter exactly 16 digits.",
      },
      { status: 400 }
    );
  }

  const verificationValue = (body.verification_value || "").trim();
  const rawPassword = body.password || "";
  const mode = body.mode || "register";

  if (!verificationValue) {
    return NextResponse.json(
      {
        status: "error",
        code: "missing_verification_value",
        message: "Please enter your Name (First or Last Name) or Date of Birth to verify identity.",
      },
      { status: 400 }
    );
  }

  // If user provided a password, ensure it's at least 6 chars; otherwise use deterministic auth secret
  let finalPassword = rawPassword;
  if (!finalPassword) {
    // Deterministic secure fallback password for ID-verified passwordless accounts
    finalPassword = `!Nid_Sec_${cleanId}_rw!`;
  } else if (finalPassword.length < 6) {
    return NextResponse.json(
      {
        status: "error",
        code: "invalid_password",
        message: "Password must be at least 6 characters long.",
      },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  try {
    // 1. Fetch citizen details from Irembo APIs (Police / Theory Exam / DL / Registrations)
    const citizenDoc = await fetchCitizenFullDetails(cleanId);

    // 2. Also check if user already exists in local DB
    const { data: existingProfile } = await adminClient
      .from("user_profiles")
      .select("id, email, full_name, first_name, last_name, birthdate, avatar_url, role")
      .eq("national_id", cleanId)
      .maybeSingle();

    // If neither Irembo nor local database has record of this citizen
    if (!citizenDoc.hasOfficialRecord && !existingProfile) {
      return NextResponse.json(
        {
          status: "error",
          code: "id_not_found",
          message:
            "National ID was not found in the official registry. Please ensure you entered the correct 16-digit ID.",
        },
        { status: 404 }
      );
    }

    // 3. Verify user input against official citizen data
    const verificationType = body.verification_type;
    const { isVerified, mismatchField } = verifyCitizenMatch(
      verificationValue,
      citizenDoc,
      existingProfile,
      verificationType
    );

    if (!isVerified) {
      let mismatchMsg = "The Name or Date of Birth you entered does not match this National ID. Please try again.";
      if (mismatchField === "name" || verificationType === "name") {
        mismatchMsg = "The name you entered does not match the official names on this National ID. Please try again.";
      } else if (mismatchField === "dob" || verificationType === "dob") {
        mismatchMsg = "The date of birth you entered does not match this National ID. Please try again.";
      }

      return NextResponse.json(
        {
          status: "error",
          code: "verification_mismatch",
          message: mismatchMsg,
        },
        { status: 400 }
      );
    }

    // 4. Verification successful! Prepare citizen profile metadata
    const firstName =
      citizenDoc.firstName ||
      existingProfile?.first_name ||
      citizenDoc.fullName.split(/\s+/)[0] ||
      existingProfile?.full_name?.split(/\s+/)[0] ||
      "";
    const lastName =
      citizenDoc.lastName ||
      existingProfile?.last_name ||
      citizenDoc.fullName.split(/\s+/).slice(1).join(" ") ||
      existingProfile?.full_name?.split(/\s+/).slice(1).join(" ") ||
      "";
    const fullName =
      citizenDoc.fullName ||
      existingProfile?.full_name ||
      `${firstName} ${lastName}`.trim() ||
      `Citizen ${cleanId.slice(-4)}`;

    const gender =
      citizenDoc.gender?.toLowerCase() === "female" || citizenDoc.gender?.toLowerCase() === "f"
        ? "female"
        : "male";

    const birthdate =
      parseDates(citizenDoc.dateOfBirth)[0] ||
      parseDates(existingProfile?.birthdate)[0] ||
      (citizenDoc.embeddedBirthYear ? `${citizenDoc.embeddedBirthYear}-01-01` : null);

    const avatarUrl =
      citizenDoc.photoUrl ||
      existingProfile?.avatar_url ||
      null;

    const syntheticEmail = `${cleanId}@nid.rw`;

    // If mode is 'verify', return verification status without creating or mutating auth user yet
    if (mode === "verify") {
      return NextResponse.json({
        status: "success",
        verified: true,
        national_id: cleanId,
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
        gender: gender,
        birthdate: birthdate,
        avatar_url: avatarUrl,
        is_existing: Boolean(existingProfile),
        message: "Umwirondoro wemejwe neza! (Identity verified successfully)",
      });
    }

    let userId: string;

    // Check if an auth user with this email already exists
    const { data: listData } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    });
    const existingAuthUser = listData?.users?.find(
      (u) =>
        u.email?.toLowerCase() === syntheticEmail.toLowerCase() ||
        (existingProfile?.email &&
          u.email?.toLowerCase() === existingProfile.email.toLowerCase())
    );

    // Ensure user_metadata never contains bulky base64 data URIs (which blow up the session JWT / cookies)
    const safeMetaAvatarUrl =
      avatarUrl && !avatarUrl.startsWith("data:")
        ? avatarUrl
        : null;

    if (existingAuthUser) {
      userId = existingAuthUser.id;
      const existingMetaAvatar = existingAuthUser.user_metadata?.avatar_url;
      const safeExistingMeta =
        existingMetaAvatar && !existingMetaAvatar.startsWith("data:")
          ? existingMetaAvatar
          : null;

      const cleanMetadata: Record<string, any> = {
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
        national_id: cleanId,
        gender: gender,
        birthdate: birthdate,
        avatar_url: safeMetaAvatarUrl || safeExistingMeta || null,
        role: existingAuthUser.user_metadata?.role || "Student",
      };

      const { error: updateAuthError } =
        await adminClient.auth.admin.updateUserById(userId, {
          password: finalPassword,
          user_metadata: cleanMetadata,
        });
      if (updateAuthError) {
        console.error("Auth user update error:", updateAuthError);
      }
    } else {
      const { data: newUser, error: createAuthError } =
        await adminClient.auth.admin.createUser({
          email: syntheticEmail,
          password: finalPassword,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            first_name: firstName,
            last_name: lastName,
            national_id: cleanId,
            gender: gender,
            birthdate: birthdate,
            avatar_url: safeMetaAvatarUrl || null,
            role: "Student",
          },
        });

      if (createAuthError) {
        console.error("Auth user creation error:", createAuthError);
        throw createAuthError;
      }
      userId = newUser.user.id;
    }

    // 5. Upsert user_profiles record (full profile, can hold photo in database)
    const { error: profileError } = await adminClient
      .from("user_profiles")
      .upsert(
        {
          id: userId,
          email: syntheticEmail,
          national_id: cleanId,
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          gender: gender,
          birthdate: birthdate,
          avatar_url: avatarUrl || existingProfile?.avatar_url || null,
          role: existingProfile?.role || existingAuthUser?.user_metadata?.role || "Student",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (profileError) {
      console.warn("user_profiles upsert warning:", profileError);
    }

    // 6. Save canonical National ID record
    await saveNationalIdRecord(cleanId, userId, {
      isVerified: true,
      userName: fullName,
      userEmail: syntheticEmail,
    });

    // 7. Send notification if new registration
    if (!existingAuthUser && !existingProfile) {
      try {
        await adminClient.from("notifications").insert({
          type: "user_joined",
          title: "New Citizen Registered via National ID",
          message: `${fullName} (${cleanId}) has registered with verified National ID.`,
          target_role: "admin",
          data: {
            national_id: cleanId,
            full_name: fullName,
            email: syntheticEmail,
          },
        });
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      status: "success",
      email: syntheticEmail,
      auth_password: finalPassword,
      national_id: cleanId,
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
      avatar_url: avatarUrl,
      is_existing: Boolean(existingAuthUser || existingProfile),
      message:
        mode === "login" || existingProfile
          ? "Identity verified successfully. Logging you in!"
          : "Identity verified successfully. Account created!",
    });
  } catch (error) {
    const msg =
      error instanceof Error
        ? error.message
        : "Failed to process National ID request.";
    console.error("Register/Login National ID error:", error);
    return NextResponse.json(
      {
        status: "error",
        code: "internal_error",
        message: msg,
      },
      { status: 500 }
    );
  }
}

