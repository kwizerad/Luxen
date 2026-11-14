import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePrimaryAdmin } from "@/app/Admin/actions/_shared";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    try {
      await requirePrimaryAdmin();
    } catch {
      return NextResponse.json(
        { error: "Unauthorized. Only the primary administrator can view national ID records." },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("user_id");
    const verifiedOnly = searchParams.get("verified") === "true";

    let query = supabase
      .from("national_id_records")
      .select("*")
      .order("last_verified_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(500);

    if (userIdParam) {
      query = query.or(`user_id.eq.${userIdParam},verified_user_id.eq.${userIdParam}`);
    }
    if (verifiedOnly) {
      query = query.or("is_verified.eq.true,verified.eq.true,verified_user_id.not.is.null");
    }

    const { data: records, error } = await query;

    if (error) {
      console.error("fetch national ID records error:", error);
      return NextResponse.json({ records: [] });
    }

    return NextResponse.json(
      { records: records || [] },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
