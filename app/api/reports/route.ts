import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: filed, error: filedError } = await supabase
      .from("user_reports")
      .select("*, reported:reported_id(id, full_name, username, avatar_url)")
      .eq("reporter_id", user.id)
      .order("created_at", { ascending: false });

    if (filedError) throw filedError;

    const { data: against, error: againstError } = await supabase
      .from("user_reports")
      .select("*, reporter:reporter_id(id, full_name, username, avatar_url)")
      .eq("reported_id", user.id)
      .order("created_at", { ascending: false });

    if (againstError) throw againstError;

    return NextResponse.json({ filed: filed || [], against: against || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch reports.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { reported_id, report_type, description } = body;

    if (!reported_id || !report_type || !description) {
      return NextResponse.json(
        { error: "Reported ID, report type, and description are required" },
        { status: 400 }
      );
    }

    if (!["harassment", "fraud", "unsafe_behavior", "other"].includes(report_type)) {
      return NextResponse.json(
        { error: "Invalid report type" },
        { status: 400 }
      );
    }

    if (reported_id === user.id) {
      return NextResponse.json(
        { error: "You cannot report yourself" },
        { status: 400 }
      );
    }

    const { data: report, error } = await supabase
      .from("user_reports")
      .insert([{ reporter_id: user.id, reported_id, report_type, description }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ report, status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create report.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
