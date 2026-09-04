import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin(user as any)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const reportType = searchParams.get("report_type");

    let query = supabase
      .from("user_reports")
      .select("*, reporter:reporter_id(id, full_name, username, avatar_url), reported:reported_id(id, full_name, username, avatar_url)")
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (reportType) query = query.eq("report_type", reportType);

    const { data, error } = await query;

    if (error) throw error;

    const reportsWithCommentCount = await Promise.all(
      (data || []).map(async (report: any) => {
        const { count } = await supabase
          .from("report_comments")
          .select("*", { count: "exact", head: true })
          .eq("report_id", report.id);

        return { ...report, comment_count: count || 0 };
      })
    );

    return NextResponse.json({ reports: reportsWithCommentCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch reports.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin(user as any)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { report_id, status, admin_note, action_taken } = body;

    if (!report_id || !status) {
      return NextResponse.json(
        { error: "Report ID and status are required" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
      admin_id: user.id,
    };
    if (admin_note !== undefined) updateData.admin_note = admin_note;
    if (action_taken !== undefined) updateData.action_taken = action_taken;

    const { data: report, error } = await supabase
      .from("user_reports")
      .update(updateData)
      .eq("id", report_id)
      .select()
      .single();

    if (error) throw error;

    if (action_taken === "warning") {
      await supabase
        .from("user_profiles")
        .update({ warned: true, warned_at: new Date().toISOString() })
        .eq("id", report.reported_id);
    } else if (action_taken === "suspension") {
      await supabase
        .from("user_profiles")
        .update({ banned: true })
        .eq("id", report.reported_id);
    }

    return NextResponse.json({ report, status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update report.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
