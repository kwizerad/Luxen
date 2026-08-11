import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fingerprint, userId } = body || {};

    if (!fingerprint || !userId) {
      return NextResponse.json({ error: "Missing fingerprint or userId" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from("anonymous_visits")
      .select("id")
      .eq("fingerprint", fingerprint)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("anonymous_visits")
        .update({ linked_user_id: userId, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("anonymous_visits").insert({
        fingerprint,
        linked_user_id: userId,
        visit_count: 1,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[link-visitor] error:", error);
    return NextResponse.json({ error: "Failed to link visitor" }, { status: 500 });
  }
}
