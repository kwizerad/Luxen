import { NextRequest, NextResponse } from "next/server";
import {
  fetchCitizenFullDetails,
  fetchDLInfoByNationalId,
  fetchTheoryExamDLInfo,
  fetchRegistrationCodes,
  fetchMarksByCode,
} from "@/lib/live-exam/irembo";
import { saveNationalIdRecord } from "@/lib/live-exam/save-record";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DLInfoAPIResponse, ExamResultDetails, TheoryExamDLInfoAPIResponse } from "@/lib/live-exam/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawId = body.national_id || body.nationalId;
    const userId = body.user_id || body.userId;

    const cleanId = String(rawId || "").replace(/\D/g, "").slice(0, 16);
    if (!cleanId || cleanId.length !== 16) {
      return NextResponse.json(
        { status: "error", message: "A valid 16-digit National ID is required." },
        { status: 400 }
      );
    }

    // 1. Fetch citizen profile, DL info, theory exam info, and exam codes concurrently from Irembo
    const [citizenProfileResult, dlResult, theoryResult, codesResult] = await Promise.allSettled([
      fetchCitizenFullDetails(cleanId),
      fetchDLInfoByNationalId(cleanId).catch(() => null),
      fetchTheoryExamDLInfo(cleanId).catch(() => null),
      fetchRegistrationCodes(cleanId).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);

    const citizenProfile = citizenProfileResult.status === "fulfilled" ? citizenProfileResult.value : null;
    const rawDl = dlResult.status === "fulfilled" ? dlResult.value : null;
    const rawTheory = theoryResult.status === "fulfilled" ? theoryResult.value : null;
    const rawCodesData = codesResult.status === "fulfilled" ? codesResult.value : null;

    // Process Driving License data
    let dlInfo: DLInfoAPIResponse | null = null;
    if (rawDl?.status && rawDl.data) {
      dlInfo = {
        status: "success",
        license: rawDl.data.license,
        document: rawDl.data.document,
        categoriesAllowed: rawDl.data.categoriesAllowed || [],
        categoryCount: rawDl.data.categoriesAllowed?.length || 0,
      };
    }

    // Process Theory Exam info
    let theoryExamInfo: TheoryExamDLInfoAPIResponse | null = null;
    if (rawTheory?.status && rawTheory.data) {
      theoryExamInfo = {
        status: "success",
        document: rawTheory.data.document,
        categoriesAllowed: rawTheory.data.categoriesAllowed || [],
        hasCategories: (rawTheory.data.categoriesAllowed?.length || 0) > 0,
      };
    }

    // Process Exam Codes and results
    const practicalCodes: string[] = [];
    const theoryCodes: string[] = [];
    const examResults: Record<string, ExamResultDetails> = {};

    const rawCodes: string[] = Array.isArray(rawCodesData?.data?.registrationCodes)
      ? rawCodesData.data.registrationCodes
      : [];

    if (rawCodes.length > 0) {
      await Promise.all(
        rawCodes.map(async (code) => {
          try {
            const marksRes = await fetchMarksByCode(code);
            if (marksRes.ok) {
              const detailData = await marksRes.json();
              if (detailData?.status && detailData?.data) {
                const reg = detailData.data.dlExamRegistration;
                if (reg) {
                  const schedule = reg.dlExamSchedule || {};
                  const exam = reg.dlExamination || {};
                  const candidate = reg.dlExamCandidate || {};
                  const examType = schedule.examType || "UNKNOWN";
                  const isPractical = examType === "PRACTICAL";
                  const isTheory = examType === "THEORY";

                  if (isPractical) {
                    if (!practicalCodes.includes(code)) practicalCodes.push(code);
                  } else {
                    if (!theoryCodes.includes(code)) theoryCodes.push(code);
                  }

                  const candFirst = candidate.firstName || "";
                  const candLast = candidate.lastName || "";

                  if (citizenProfile) {
                    if (candFirst && !citizenProfile.firstName) citizenProfile.firstName = candFirst;
                    if (candLast && !citizenProfile.lastName) citizenProfile.lastName = candLast;
                    if (!citizenProfile.fullName && (candFirst || candLast)) {
                      citizenProfile.fullName = `${candFirst} ${candLast}`.trim();
                    }
                    if (candidate.dob && !citizenProfile.dateOfBirth) citizenProfile.dateOfBirth = candidate.dob;
                    citizenProfile.hasOfficialRecord = true;
                  }

                  examResults[code] = {
                    registrationCode: code,
                    status: reg.status || "COMPLETED",
                    examType: isPractical ? "Practical" : isTheory ? "Theory" : examType,
                    examTypeRaw: examType,
                    isPractical,
                    isTheory,
                    licenseCategory: schedule.licenseCategoryName || "N/A",
                    examDate: schedule.examStartDate || schedule.examEndDate || "N/A",
                    testCenter: schedule.examCenters?.[0]?.name || schedule.examCenters?.[0]?.locationName || "N/A",
                    marksObtained: exam.gainedMark || 0,
                    totalMarks: exam.totalMark || 20,
                    passMark: exam.passMark || 20,
                    passed: exam.grade === "PASS" || (exam.gainedMark || 0) >= (exam.passMark || 20),
                    grade: exam.grade || (exam.gainedMark >= 20 ? "PASS" : "FAIL"),
                    candidateName: `${candFirst} ${candLast}`.trim() || citizenProfile?.fullName || "N/A",
                    nationalId: cleanId,
                  };
                }
              } else {
                // Exam code exists on Irembo but marks are awaiting police approval or exam is upcoming
                const isPracticalCode = code.startsWith("PR") || code.includes("02") || code.includes("03");
                if (isPracticalCode) {
                  if (!practicalCodes.includes(code)) practicalCodes.push(code);
                } else {
                  if (!theoryCodes.includes(code)) theoryCodes.push(code);
                }

                examResults[code] = {
                  registrationCode: code,
                  status: "PENDING_APPROVAL",
                  examType: isPracticalCode ? "Practical (Registered)" : "Theory (Registered)",
                  examTypeRaw: "PENDING",
                  isPractical: isPracticalCode,
                  isTheory: !isPracticalCode,
                  licenseCategory: "—",
                  examDate: "Scheduled",
                  testCenter: "RNP Examination Center",
                  marksObtained: 0,
                  totalMarks: 20,
                  passMark: 12,
                  passed: false,
                  grade: "PENDING",
                  candidateName: citizenProfile?.fullName || "Candidate",
                  nationalId: cleanId,
                };
              }
            } else {
              if (!theoryCodes.includes(code)) theoryCodes.push(code);
            }
          } catch {
            if (!theoryCodes.includes(code)) theoryCodes.push(code);
          }
        })
      );
    }

    // 2. Persist updated record into Supabase safely (non-blocking)
    const now = new Date().toISOString();
    try {
      await saveNationalIdRecord(cleanId, userId, {
        isVerified: true,
        userName: citizenProfile?.fullName || undefined,
      });

      const supabase = createAdminClient();

      // Determine target user id
      let targetUserId = userId;
      if (!targetUserId || String(targetUserId).startsWith("manual-") || String(targetUserId).startsWith("national-id-") || String(targetUserId).startsWith("user-")) {
        // Try finding user by national_id or nid email
        const { data: matchedProfile } = await supabase
          .from("user_profiles")
          .select("id, role, email")
          .or(`national_id.eq.${cleanId},email.eq.${cleanId}@nid.rw`)
          .limit(1)
          .maybeSingle();

        if (matchedProfile?.id) {
          const isTargetAdmin =
            matchedProfile.role === "Admin" ||
            matchedProfile.role === "admin" ||
            matchedProfile.email === "kwizeradiementwari@gmail.com" ||
            matchedProfile.email === "navo@admin.jn";
          if (!isTargetAdmin) {
            targetUserId = matchedProfile.id;
          }
        }
      }

      // Check if targetUserId is an admin
      let isTargetAdmin = false;
      if (targetUserId && !String(targetUserId).startsWith("manual-") && !String(targetUserId).startsWith("national-id-") && !String(targetUserId).startsWith("user-")) {
        const { data: checkTarget } = await supabase
          .from("user_profiles")
          .select("role, email")
          .eq("id", targetUserId)
          .maybeSingle();
        if (
          checkTarget?.role === "Admin" ||
          checkTarget?.role === "admin" ||
          checkTarget?.email === "kwizeradiementwari@gmail.com" ||
          checkTarget?.email === "navo@admin.jn"
        ) {
          isTargetAdmin = true;
        }
      }

      // If a real student user account is linked or found, synchronize official details to user_profiles
      if (!isTargetAdmin && targetUserId && !String(targetUserId).startsWith("manual-") && !String(targetUserId).startsWith("national-id-") && !String(targetUserId).startsWith("user-")) {
        const updateFields: Record<string, any> = {
          national_id: cleanId,
          updated_at: now,
        };

        const resolvedFullName =
          citizenProfile?.fullName ||
          (rawDl?.data?.document?.firstName && rawDl?.data?.document?.lastName
            ? `${rawDl.data.document.firstName} ${rawDl.data.document.lastName}`.trim()
            : null) ||
          (rawTheory?.data?.document?.firstName && rawTheory?.data?.document?.lastName
            ? `${rawTheory.data.document.firstName} ${rawTheory.data.document.lastName}`.trim()
            : null) ||
          rawDl?.data?.document?.names ||
          undefined;

        const resolvedFirstName =
          citizenProfile?.firstName ||
          rawDl?.data?.document?.firstName ||
          rawTheory?.data?.document?.firstName ||
          undefined;

        const resolvedLastName =
          citizenProfile?.lastName ||
          rawDl?.data?.document?.lastName ||
          rawTheory?.data?.document?.lastName ||
          undefined;

        const resolvedDob =
          citizenProfile?.dateOfBirth ||
          rawDl?.data?.document?.dateOfBirth ||
          rawTheory?.data?.document?.dateOfBirth ||
          undefined;

        const resolvedGender =
          (citizenProfile?.gender && citizenProfile.gender !== "Other" ? citizenProfile.gender : null) ||
          rawDl?.data?.document?.sex ||
          rawTheory?.data?.document?.sex ||
          undefined;

        const resolvedNationality =
          citizenProfile?.nationality ||
          rawDl?.data?.document?.nationality ||
          rawTheory?.data?.document?.nationality ||
          undefined;

        if (resolvedFullName) updateFields.full_name = resolvedFullName;
        if (resolvedFirstName) updateFields.first_name = resolvedFirstName;
        if (resolvedLastName) updateFields.last_name = resolvedLastName;
        if (resolvedDob) updateFields.birthdate = resolvedDob;
        if (resolvedGender) updateFields.gender = resolvedGender;
        if (resolvedNationality) updateFields.nationality = resolvedNationality;

        await supabase
          .from("user_profiles")
          .update(updateFields)
          .eq("id", targetUserId);
      }
    } catch (dbError) {
      console.warn("Supabase persistence warning in sync-irembo:", dbError);
    }

    return NextResponse.json({
      status: "success",
      message: "Data successfully synchronized from Irembo API.",
      national_id: cleanId,
      citizenProfile,
      dlInfo,
      theoryExamInfo,
      examCodes: {
        practical: practicalCodes,
        theory: theoryCodes,
      },
      examResults,
      lastSyncedAt: now,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to sync data from Irembo API.";
    return NextResponse.json({ status: "error", message: msg }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const nationalId = searchParams.get("national_id") || searchParams.get("nationalId") || "";
  const userId = searchParams.get("user_id") || searchParams.get("userId") || undefined;

  const mockPostReq = new NextRequest(request.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ national_id: nationalId, user_id: userId }),
  });

  return POST(mockPostReq);
}
