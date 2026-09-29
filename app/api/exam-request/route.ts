import { NextRequest, NextResponse } from "next/server";
import { fetchDLInfoByNationalId, fetchTheoryExamDLInfo } from "@/lib/live-exam/irembo";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  let body: { national_id?: string; exam_type?: "theory" | "practical" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { status: "error", message: "Invalid request body." },
      { status: 400 }
    );
  }

  const nationalId = body.national_id;
  const examType = body.exam_type;

  if (!nationalId || nationalId.length !== 16) {
    return NextResponse.json(
      { status: "error", message: "Invalid National ID. Please enter a valid 16-digit ID." },
      { status: 400 }
    );
  }

  if (!examType || !["theory", "practical"].includes(examType)) {
    return NextResponse.json(
      { status: "error", message: "Invalid exam type. Must be 'theory' or 'practical'." },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 401 }
      );
    }

    let hasExam = false;
    let iremboResponse: Record<string, unknown> = {};
    let allowedCategories: { category: string; description: string }[] = [];

    if (examType === "theory") {
      const response = await fetchTheoryExamDLInfo(nationalId);
      iremboResponse = response as unknown as Record<string, unknown>;

      if (response.status && response.data) {
        const categories = response.data.categoriesAllowed || [];
        hasExam = categories.length > 0;
      }

      // Also check if the user has already passed a theory exam
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

      // Also check if the user already has a practical exam record via DL info.
      // Having a practical exam means they already passed theory and have provision.
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

    if (hasExam) {
      const message = examType === "theory"
        ? "You have already successfully completed the theory exam. Your provisional driving license (Category P) has been granted. You can now proceed to request a practical exam."
        : "You already have a practical exam record. Please select a category below to continue.";

      return NextResponse.json({
        status: "success",
        has_exam: true,
        message,
        ...(examType === "practical" && allowedCategories.length > 0
          ? { allowed_categories: allowedCategories }
          : {}),
      });
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

    return NextResponse.json({
      status: "success",
      has_exam: false,
      message: `You do not have a ${examType} exam record. You can request one.`,
      amount,
      payment_id: payment?.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process exam request.";
    return NextResponse.json(
      { status: "error", message },
      { status: 500 }
    );
  }
}
