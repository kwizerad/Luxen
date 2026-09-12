import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordLoginEvent, RecordLoginRequestBody } from "@/lib/device/record-login";

export async function POST(request: NextRequest) {
  try {
    let userId: string | null = null;

    // 1. Try session cookies via standard SSR client
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        userId = user.id;
      }
    } catch {
      // Cookie reading fallback
    }

    const body: RecordLoginRequestBody = await request.json().catch(() => ({}));

    // 2. If cookie authentication didn't yield a user, verify Bearer token or sessionId
    if (!userId) {
      const authHeader = request.headers.get("authorization");
      const bearerToken = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : null;
      const token = bearerToken || (typeof body?.sessionId === "string" && body.sessionId.length > 20 ? body.sessionId : null);

      if (token) {
        try {
          const adminSupabase = createAdminClient();
          const {
            data: { user: tokenUser },
          } = await adminSupabase.auth.getUser(token);
          if (tokenUser?.id) {
            userId = tokenUser.id;
          }
        } catch {
          // Token verification fallback
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    if (!body?.device?.fingerprint) {
      return NextResponse.json(
        { error: "Missing device info." },
        { status: 400 }
      );
    }

    return await recordLoginEvent(request, body, userId);
  } catch (error) {
    console.error("Record login error:", error);
    // Return success even if recording fails to avoid blocking the user
    return NextResponse.json({ success: true, warning: "Login recording failed" });
  }
}
