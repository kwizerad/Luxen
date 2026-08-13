import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("classmate_requests")
      .delete()
      .eq("id", params.id)
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (error) throw error;

    return NextResponse.json({ status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to cancel request.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
