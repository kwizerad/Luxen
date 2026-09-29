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

    let query = supabase
      .from("national_id_records")
      .select("id, national_id, created_at, updated_at, first_checked_at, last_checked_at, check_count, user_id, verified_user_id, checked_accounts")
      .order("created_at", { ascending: false })
      .limit(300);

    if (userIdParam) {
      query = query.or(`user_id.eq.${userIdParam},verified_user_id.eq.${userIdParam}`);
    }

    const { data: records, error } = await query;

    if (error) {
      console.error("fetch national ID records error:", error);
      return NextResponse.json({ records: [] });
    }

    return NextResponse.json({ records: records || [] });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
