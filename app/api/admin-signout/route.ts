import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();

  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Admin sign out error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin sign out exception:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sign out admin" },
      { status: 500 }
    );
  }
}
