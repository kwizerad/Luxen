import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    const { data: existing, error: queryError } = await adminClient
      .from("classmate_requests")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    if (queryError) {
      console.error("Reject request query error:", queryError);
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (existing.receiver_id !== user.id) {
      return NextResponse.json({ error: "Only the receiver can reject" }, { status: 403 });
    }

    const { data: updated, error } = await adminClient
      .from("classmate_requests")
      .update({ status: "rejected", responded_at: new Date().toISOString() })
      .eq("id", params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ request: updated, status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reject request.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
