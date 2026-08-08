import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: asDriver, error: driverErr } = await supabase
      .from("chat_conversations")
      .select("*, student:student_id(id, full_name, username, avatar_url)")
      .eq("driver_id", user.id)
      .order("last_message_at", { ascending: false });

    if (driverErr) throw driverErr;

    const { data: asStudent, error: studentErr } = await supabase
      .from("chat_conversations")
      .select("*, driver:driver_id(id, full_name, username, avatar_url)")
      .eq("student_id", user.id)
      .order("last_message_at", { ascending: false });

    if (studentErr) throw studentErr;

    const all = [
      ...(asDriver || []).map((c: any) => ({ ...c, other_party: c.student, role: "driver" })),
      ...(asStudent || []).map((c: any) => ({ ...c, other_party: c.driver, role: "student" })),
    ].sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

    const conversationsWithMeta = await Promise.all(
      all.map(async (conv: any) => {
        const { count } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .neq("sender_id", user.id)
          .eq("is_read", false);

        const { data: lastMsg } = await supabase
          .from("chat_messages")
          .select("message, created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          ...conv,
          unread_count: count || 0,
          last_message: lastMsg?.message || null,
          last_message_time: lastMsg?.created_at || conv.last_message_at,
        };
      })
    );

    return NextResponse.json({ conversations: conversationsWithMeta });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch conversations.";
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
    const { driver_id } = body;

    if (!driver_id) {
      return NextResponse.json({ error: "Driver ID is required" }, { status: 400 });
    }

    if (driver_id === user.id) {
      return NextResponse.json(
        { error: "You cannot start a conversation with yourself" },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("driver_id", driver_id)
      .eq("student_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ conversation: existing, status: "success" });
    }

    const { data: created, error } = await supabase
      .from("chat_conversations")
      .insert([{ driver_id, student_id: user.id }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ conversation: created, status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create conversation.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
