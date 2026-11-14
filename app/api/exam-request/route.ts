import { NextRequest, NextResponse } from "next/server";
import {
  fetchDLInfoByNationalId,
  fetchTheoryExamDLInfo,
  fetchCitizenFullDetails,
} from "@/lib/live-exam/irembo";
import { saveNationalIdRecord } from "@/lib/live-exam/save-record";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
};

export async function POST(request: NextRequest) {
  let body: { national_id?: string; exam_type?: "theory" | "practical" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { status: "error", message: "Invalid request body." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const nationalId = (body.national_id || "").replace(/\D/g, "").slice(0, 16);
  const examType = body.exam_type;

  if (!nationalId || nationalId.length !== 16) {
    return NextResponse.json(
      { status: "error", message: "Invalid National ID. Please enter a valid 16-digit ID." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  if (!examType || !["theory", "practical"].includes(examType)) {
    return NextResponse.json(
      { status: "error", message: "Invalid exam type. Must be 'theory' or 'practical'." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    let hasExam = false;
    let iremboResponse: Record<string, unknown> = {};
    let allowedCategories: { category: string; description: string }[] = [];

    // Fetch live citizen info concurrently so registration always reflects live API state
    const citizenPromise = fetchCitizenFullDetails(nationalId).catch(() => null);

    if (examType === "theory") {
      const response = await fetchTheoryExamDLInfo(nationalId);
      iremboResponse = response as unknown as Record<string, unknown>;

      if (response.status && response.data) {
        const categories = response.data.categoriesAllowed || [];
        hasExam = categories.length > 0;
      }

      if (!hasExam) {
        const { count: passedTheoryCount } = await supabase
          .from("exam_attempts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "completed")
          .gte("score_percentage", 50);

        if (passedTheoryCount && passedTheoryCount > 0) {
          hasExam = true;
        }
      }

      if (!hasExam) {
        try {
          const dlResponse = await fetchDLInfoByNationalId(nationalId);
          if (dlResponse.status && dlResponse.data) {
            const dlCategories = dlResponse.data.categoriesAllowed || [];
            const hasPractical = dlCategories.some(
              (c) => (c.category || "").toUpperCase() !== "P"
            );
            if (hasPractical) {
              hasExam = true;
            }
          }
        } catch {
          // DL info fetch failed — continue with existing result
        }
      }
    } else {
      const response = await fetchDLInfoByNationalId(nationalId);
      iremboResponse = response as unknown as Record<string, unknown>;

      if (response.status && response.data) {
        const categories = response.data.categoriesAllowed || [];
        allowedCategories = categories.map((c) => ({
          category: c.category || "",
          description: c.description || "",
        }));
        hasExam = categories.some(
          (c) => (c.category || "").toUpperCase() !== "P"
        );
      }
    }

    const citizenProfile = await citizenPromise;
    await saveNationalIdRecord(nationalId, user.id, {
      isVerified: Boolean(citizenProfile && (citizenProfile.firstName || citizenProfile.lastName || citizenProfile.fullName)),
      citizen: citizenProfile,
      userEmail: user.email,
      userName: user.user_metadata?.full_name || user.user_metadata?.username,
    }).catch(() => {});

    if (hasExam) {
      const message = examType === "theory"
        ? "You have already successfully completed the theory exam. Your provisional driving license (Category P) has been granted. You can now proceed to request a practical exam."
        : "You already have a practical exam record. Please select a category below to continue.";

      return NextResponse.json(
        {
          status: "success",
          has_exam: true,
          message,
          ...(examType === "practical" && allowedCategories.length > 0
            ? { allowed_categories: allowedCategories }
            : {}),
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    const { data: feeConfig } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", examType === "theory" ? "theory_exam_request_fee" : "practical_exam_request_fee")
      .single();

    const amount = feeConfig ? parseFloat(feeConfig.value) : 0;

    const { data: payment } = await supabase
      .from("exam_request_payments")
      .insert([{
        user_id: user.id,
        exam_type: examType,
        national_id: nationalId,
        amount,
        payment_status: "pending",
        irembo_verified: true,
        irembo_response: iremboResponse,
      }])
      .select()
      .single();

    return NextResponse.json(
      {
        status: "success",
        has_exam: false,
        message: `You do not have a ${examType} exam record. You can request one.`,
        amount,
        payment_id: payment?.id,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process exam request.";
    return NextResponse.json(
      { status: "error", message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
