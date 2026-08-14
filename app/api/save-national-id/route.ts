import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  let body: { national_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const nationalId = body.national_id;
  if (!nationalId || nationalId.length !== 16) {
    return NextResponse.json(
      { error: "Invalid National ID. Must be 16 digits." },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    // Check if this national ID is already used by another user
    const { data: existingUser } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("national_id", nationalId)
      .neq("id", user.id)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: "This National ID is already registered to another account." },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from("user_profiles")
      .update({ national_id: nationalId })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to save national ID." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
