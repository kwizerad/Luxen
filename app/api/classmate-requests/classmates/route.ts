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
    // Use only columns that are guaranteed to exist in the base table
    const { data: allStudents, error: studentsError } = await admin
      .from("user_profiles")
      .select("id, full_name, first_name, last_name, username, email, avatar_url")
      .eq("role", "Student")
      .neq("id", user.id)
      .order("full_name", { ascending: true, nullsFirst: false })
      .limit(1000);

    if (studentsError) {
      console.error("Failed to fetch classmates:", studentsError);
      return NextResponse.json({ error: studentsError.message, classmates: [] }, { status: 200 });
    }

    // Try to fetch banned/last_seen separately in case those columns don't exist
    let bannedMap: Record<string, boolean> = {};
    let lastSeenMap: Record<string, string> = {};
    try {
      const { data: extraData } = await admin
        .from("user_profiles")
        .select("id, banned, last_seen")
        .eq("role", "Student")
        .neq("id", user.id);
      if (extraData) {
        for (const row of extraData) {
          if (row.banned === true) bannedMap[row.id] = true;
          if (row.last_seen) lastSeenMap[row.id] = row.last_seen;
        }
      }
    } catch {
      // Columns might not exist, ignore
    }

    // If excludeFriends is requested, fetch accepted friends to filter them out
    let friendIds = new Set<string>();
    if (excludeFriends) {
      try {
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
      } catch {
        // Table might not exist yet, ignore
      }
    }

    // Filter out banned users and existing friends, build display name from available fields
    const classmates = (allStudents || [])
      .filter((s: any) => {
        if (bannedMap[s.id] === true) return false;
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
          last_seen: lastSeenMap[s.id] || null,
        };
      });

    console.log(`Classmates API: found ${allStudents?.length || 0} students, ${friendIds.size} friends excluded, ${classmates.length} shown`);

    return NextResponse.json({ classmates, total: allStudents?.length || 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
