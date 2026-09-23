import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

function extractIp(request: Request): string | null {
  const headers = request.headers;
  const cf = headers.get("cf-connecting-ip");
  if (cf && !cf.startsWith("127.") && !cf.startsWith("10.") && !cf.startsWith("192.168.")) return cf.trim();
  const gcp = headers.get("x-appengine-user-ip");
  if (gcp) return gcp.trim();
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first && !first.startsWith("127.") && !first.startsWith("10.") && !first.startsWith("192.168.")) return first;
  }
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return null;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let action: "update" | "offline" = "update";
    try {
      const body = await request.json();
      if (body?.action === "offline") action = "offline";
    } catch {
      // No body or invalid JSON — default to "update"
    }

    if (action === "offline") {
      const { error } = await supabase
        .from("user_profiles")
        .update({ last_seen: null })
        .eq("id", user.id);

      if (error) {
        console.error("Failed to set offline:", error);
      }
    } else {
      const ip = extractIp(request);
      const updateData: Record<string, any> = {
        last_seen: new Date().toISOString(),
      };
      if (ip) {
        updateData.last_ip = ip;
      }

      const { error } = await supabase
        .from("user_profiles")
        .update(updateData)
        .eq("id", user.id);

      if (error) {
        console.error("Failed to update last activity:", error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Track activity error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
