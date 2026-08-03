import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("national_id_records")
      .select(`
        national_id,
        created_at,
        user_id,
        user_profiles!left (
          full_name,
          first_name,
          last_name,
          email,
          avatar_url,
          username
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch national ID records." },
        { status: 500 }
      );
    }

    return NextResponse.json({ records: data || [] });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
