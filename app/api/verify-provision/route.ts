import { NextRequest, NextResponse } from "next/server";
import { fetchDLInfoByNationalId } from "@/lib/live-exam/irembo";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  let body: { national_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { status: "error", message: "Invalid request body." },
      { status: 400 }
    );
  }

  const nationalId = body.national_id;
  if (!nationalId || nationalId.length !== 16) {
    return NextResponse.json(
      { status: "error", message: "Invalid National ID. Please enter a valid 16-digit ID." },
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

    const response = await fetchDLInfoByNationalId(nationalId);

    if (!response.status || !response.data) {
      return NextResponse.json(
        { status: "error", message: response.message || "No data found for this National ID." },
        { status: 404 }
      );
    }

    const categoriesAllowed = response.data.categoriesAllowed || [];
    let hasProvision = categoriesAllowed.some(
      (c) => (c.category || "").toUpperCase() === "P"
    );

    let provisionCategory = hasProvision
      ? categoriesAllowed.find((c) => (c.category || "").toUpperCase() === "P")?.description || "P"
      : null;

    // If Irembo didn't return category P, check if the user has passed
    // a theory exam at least once — that qualifies them for category P
    if (!hasProvision) {
      const { count: passedTheoryCount } = await supabase
        .from("exam_attempts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "completed")
        .gte("score_percentage", 50);

      if (passedTheoryCount && passedTheoryCount > 0) {
        hasProvision = true;
        provisionCategory = "P";
      }
    }

    // Check if this national ID is already used by another user
    const { data: existingIdUser } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("national_id", nationalId)
      .neq("id", user.id)
      .maybeSingle();

    if (existingIdUser) {
      return NextResponse.json(
        { status: "error", message: "This National ID is already registered to another account." },
        { status: 409 }
      );
    }

    await supabase
      .from("user_profiles")
      .update({
        provision_verified: hasProvision,
        provision_category: provisionCategory,
        provision_verified_at: new Date().toISOString(),
        national_id: nationalId,
      })
      .eq("id", user.id);

    return NextResponse.json({
      status: "success",
      has_provision: hasProvision,
      categories: categoriesAllowed.map((c) => ({ category: c.category, description: c.description })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to verify provision.";
    return NextResponse.json(
      { status: "error", message },
      { status: 500 }
    );
  }
}
