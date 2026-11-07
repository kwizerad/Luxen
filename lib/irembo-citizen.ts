import { fetchCitizenFullDetails, type CitizenFullProfile } from "@/lib/live-exam/irembo";

export { fetchCitizenFullDetails, type CitizenFullProfile };

export function normalizeText(text?: string | null): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics/accents
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export function parseDates(str?: string | null): string[] {
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

export function levenshteinDistance(a: string, b: string): number {
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

export function verifyCitizenDobMatch(
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

export function verifyCitizenNameMatch(
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

export function verifyCitizenMatch(
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
