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

    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("report_id");

    if (!reportId) {
      return NextResponse.json({ error: "Report ID is required" }, { status: 400 });
    }

    const { data: report } = await supabase
      .from("user_reports")
      .select("reporter_id, reported_id")
      .eq("id", reportId)
      .single();

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const isParticipant =
      report.reporter_id === user.id || report.reported_id === user.id;
    const admin = isAdmin(user as any);

    if (!isParticipant && !admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { data: comments, error } = await supabase
      .from("report_comments")
      .select("*, user:user_id(id, full_name, username, avatar_url)")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ comments: comments || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch comments.";
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
    const { report_id, comment } = body;

    if (!report_id || !comment) {
      return NextResponse.json(
        { error: "Report ID and comment are required" },
        { status: 400 }
      );
    }

    const { data: report } = await supabase
      .from("user_reports")
      .select("reporter_id, reported_id")
      .eq("id", report_id)
      .single();

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const isParticipant =
      report.reporter_id === user.id || report.reported_id === user.id;
    const admin = isAdmin(user as any);

    if (!isParticipant && !admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { data: created, error } = await supabase
      .from("report_comments")
      .insert([{ report_id, user_id: user.id, comment, is_admin: admin }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ comment: created, status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create comment.";
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

    const body = await request.json();
    const { comment_id, comment } = body;

    if (!comment_id || !comment) {
      return NextResponse.json(
        { error: "Comment ID and comment are required" },
        { status: 400 }
      );
    }

    const { data: updated, error } = await supabase
      .from("report_comments")
      .update({ comment, updated_at: new Date().toISOString() })
      .eq("id", comment_id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ comment: updated, status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update comment.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
