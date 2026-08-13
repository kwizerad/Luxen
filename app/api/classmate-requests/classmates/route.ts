import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin-client";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const excludeFriends = searchParams.get("exclude_friends") !== "false";

    const admin = createAdminClient();

    // Fetch all students except the current user
    const { data: allStudents, error: studentsError } = await admin
      .from("user_profiles")
      .select("id, full_name, first_name, last_name, username, email, avatar_url, last_seen, banned")
      .eq("role", "Student")
      .neq("id", user.id)
      .order("full_name", { ascending: true })
      .limit(1000);

    if (studentsError) {
      console.error("Failed to fetch classmates:", studentsError);
      return NextResponse.json({ error: studentsError.message }, { status: 500 });
    }

    // If excludeFriends is requested, fetch accepted friends to filter them out
    let friendIds = new Set<string>();
    if (excludeFriends) {
      const { data: requests } = await admin
        .from("classmate_requests")
        .select("sender_id, receiver_id, status")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq("status", "accepted");

      if (requests) {
        for (const r of requests) {
          const otherId = r.sender_id === user.id ? r.receiver_id : r.sender_id;
          friendIds.add(otherId);
        }
      }
    }

    // Filter out banned users and existing friends, build display name from available fields
    const classmates = (allStudents || [])
      .filter((s: any) => {
        if (s.banned === true) return false;
        if (friendIds.has(s.id)) return false;
        return true;
      })
      .map((s: any) => {
        const displayName = s.full_name?.trim() || [s.first_name, s.last_name].filter(Boolean).join(" ").trim() || s.username?.trim() || s.email?.split("@")[0] || "Unknown";
        return {
          id: s.id,
          full_name: displayName,
          username: s.username,
          avatar_url: s.avatar_url,
          last_seen: s.last_seen,
        };
      });

    return NextResponse.json({ classmates });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
