import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordLoginEvent, RecordLoginRequestBody } from "@/lib/device/record-login";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const body: RecordLoginRequestBody = await request.json();
    if (!body?.device?.fingerprint) {
      return NextResponse.json(
        { error: "Missing device info." },
        { status: 400 }
      );
    }

    return await recordLoginEvent(request, body, user.id);
  } catch (error) {
    console.error("Record login error:", error);
    // Return success even if recording fails to avoid blocking the user
    return NextResponse.json({ success: true, warning: "Login recording failed" });
  }
}
