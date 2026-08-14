import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversation_id");

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 });
    }

    const { data: conv } = await supabase
      .from("chat_conversations")
      .select("driver_id, student_id")
      .eq("id", conversationId)
      .single();

    if (!conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (conv.driver_id !== user.id && conv.student_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { data: messages, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) throw error;

    return NextResponse.json({ messages: messages || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch messages.";
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
    const { conversation_id, message } = body;

    if (!conversation_id || !message) {
      return NextResponse.json(
        { error: "Conversation ID and message are required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const { data: conv } = await adminClient
      .from("chat_conversations")
      .select("driver_id, student_id")
      .eq("id", conversation_id)
      .maybeSingle();

    if (!conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (conv.driver_id !== user.id && conv.student_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { data: msg, error } = await adminClient
      .from("chat_messages")
      .insert([{ conversation_id, sender_id: user.id, message }])
      .select()
      .single();

    if (error) throw error;

    await adminClient
      .from("chat_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversation_id);

    return NextResponse.json({ message: msg, status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send message.";
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
    const { conversation_id } = body;

    if (!conversation_id) {
      return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 });
    }

    const { data: conv } = await supabase
      .from("chat_conversations")
      .select("driver_id, student_id")
      .eq("id", conversation_id)
      .single();

    if (!conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (conv.driver_id !== user.id && conv.student_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { error } = await supabase
      .from("chat_messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("conversation_id", conversation_id)
      .neq("sender_id", user.id)
      .eq("is_read", false);

    if (error) throw error;

    return NextResponse.json({ status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to mark messages as read.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
