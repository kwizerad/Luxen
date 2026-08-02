import type { ExamResultDetails, DLInfoResponse } from "./types";
import { getCachedResult, setCachedResult, hasCachedResult } from "./cache";

export const IREMBO_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "rw,en-US;q=0.9,en;q=0.8",
  Origin: "https://irembo.gov.rw",
  Referer:
    "https://irembo.gov.rw/user/citizen/service/rnp/check_exam_result",
  Servicecode: "CHECK_EXAM_RESULT",
  "X-Requested-With": "XMLHttpRequest",
  "Sec-Ch-Ua":
    '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
};

const IREMBO_BASE = "https://irembo.gov.rw/irembo/rest/public/police/v2";
const REGISTRATION_CODE_URL = `${IREMBO_BASE}/request/exam/registration/registration-code`;
const APPLICANT_CODE_URL = `${IREMBO_BASE}/request/applicant-dl-registration-code`;
const DL_INFO_URL = `${IREMBO_BASE}/request/get-dl-by-national-id`;

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
