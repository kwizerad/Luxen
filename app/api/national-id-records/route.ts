import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePrimaryAdmin } from "@/app/Admin/actions/_shared";

export const dynamic = "force-dynamic";

export async function GET() {
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

    const { data: records, error } = await supabase
      .from("national_id_records")
      .select(`
        id,
        national_id,
        created_at,
        updated_at,
        first_checked_at,
        last_checked_at,
        check_count,
        user_id,
        verified_user_id,
        checked_accounts,
        user_profiles!left (
          id,
          full_name,
          first_name,
          last_name,
          email,
          avatar_url,
          username,
          national_id
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("fetch national ID records complex query fallback:", error);
      // Fallback simple query
      const { data: fallbackRecords } = await supabase
        .from("national_id_records")
        .select("*")
        .order("created_at", { ascending: false });

      return NextResponse.json({ records: fallbackRecords || [] });
    }

    return NextResponse.json({ records: records || [] });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
