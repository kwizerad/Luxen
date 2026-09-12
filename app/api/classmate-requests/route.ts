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

    const { data: sent, error: sentErr } = await supabase
      .from("classmate_requests")
      .select("*")
      .eq("sender_id", user.id);

    if (sentErr) throw sentErr;

    const { data: received, error: receivedErr } = await supabase
      .from("classmate_requests")
      .select("*")
      .eq("receiver_id", user.id);

    if (receivedErr) throw receivedErr;

    const allRequests = [...(sent || []), ...(received || [])];

    const otherUserIds = allRequests.map((r) =>
      r.sender_id === user.id ? r.receiver_id : r.sender_id
    );

    let profileMap: Record<string, any> = {};
    if (otherUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, full_name, username, avatar_url, last_seen")
        .in("id", otherUserIds);
      for (const p of profiles || []) {
        profileMap[p.id] = p;
      }
    }

    const enriched = allRequests.map((r) => ({
      ...r,
      other_user: profileMap[r.sender_id === user.id ? r.receiver_id : r.sender_id],
      direction: r.sender_id === user.id ? "sent" : "received",
    }));

    // Also return the current user's is_public setting
    const { data: myProfile } = await supabase
      .from("user_profiles")
      .select("is_public")
      .eq("id", user.id)
      .maybeSingle();

    return NextResponse.json({ requests: enriched, is_public: myProfile?.is_public ?? true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch classmate requests.";
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
    const { receiver_id } = body;

    if (!receiver_id) {
      return NextResponse.json({ error: "Receiver ID is required" }, { status: 400 });
    }

    if (receiver_id === user.id) {
      return NextResponse.json({ error: "You cannot send a friend request to yourself" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("classmate_requests")
      .select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiver_id}),and(sender_id.eq.${receiver_id},receiver_id.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      if (existing.status === "accepted") {
        return NextResponse.json({ request: existing, status: "already_accepted" });
      }
      if (existing.sender_id === user.id) {
        const { data: updated, error } = await supabase
          .from("classmate_requests")
          .update({ status: "pending", responded_at: null })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return NextResponse.json({ request: updated, status: "success" });
      }
      return NextResponse.json({ request: existing, status: "pending_reverse" });
    }

    const { data: created, error } = await supabase
      .from("classmate_requests")
      .insert([{ sender_id: user.id, receiver_id }])
      .select()
      .single();

    if (error) throw error;

    // Send notification to the receiver
    try {
      const adminClient = createAdminClient();
      const senderName = user.user_metadata?.full_name || user.user_metadata?.username || user.email;
      await adminClient.from("notifications").insert({
        target_user_id: receiver_id,
        type: "friend_request",
        title: "New Friend Request",
        message: `${senderName} wants to be your friend. Tap to view and accept!`,
        data: {
          sender_id: user.id,
          sender_name: senderName,
          request_id: created.id,
        },
        sender_id: user.id,
        sender_name: senderName,
        action_url: "/dashboard#classmates",
        priority: "normal",
      });
    } catch (notifError) {
      console.error("Failed to send friend request notification:", notifError);
    }

    return NextResponse.json({ request: created, status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send classmate request.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
