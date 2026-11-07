import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export interface SetPasswordBody {
  password?: string;
  username?: string;
  security_question?: string;
  security_answer?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: SetPasswordBody = await request.json().catch(() => ({}));
    const rawPassword = (body.password || "").trim();
    const rawUsername = (body.username || "").trim().toLowerCase().replace(/[^a-z0-9_.]/g, "");
    const question = (body.security_question || "").trim();
    const rawAnswer = (body.security_answer || "").trim().toLowerCase();

    if (!rawPassword || rawPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const adminSb = createAdminClient();

    // Check if username is already taken by another user
    if (rawUsername) {
      const { data: existingUser } = await adminSb
        .from("user_profiles")
        .select("id")
        .eq("username", rawUsername)
        .neq("id", user.id)
        .maybeSingle();

      if (existingUser) {
        return NextResponse.json(
          { error: "This username is already taken. Please choose another." },
          { status: 400 }
        );
      }
    }

    // Update password via Supabase Admin Client
    const { error: updateError } = await adminSb.auth.admin.updateUserById(user.id, {
      password: rawPassword,
      user_metadata: {
        ...user.user_metadata,
        has_custom_password: true,
        ...(rawUsername ? { username: rawUsername } : {}),
        ...(question ? { security_question: question } : {}),
      },
    });

    if (updateError) {
      console.error("Error updating user password:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Update user_profiles database table
    const now = new Date().toISOString();
    await adminSb.from("user_profiles").upsert(
      {
        id: user.id,
        email: user.email,
        has_custom_password: true,
        ...(rawUsername ? { username: rawUsername } : {}),
        ...(question ? { security_question: question } : {}),
        ...(rawAnswer ? { security_answer_clean: rawAnswer } : {}),
        updated_at: now,
      },
      { onConflict: "id" }
    );

    return NextResponse.json({
      success: true,
      message: "Password and security questions set successfully!",
    });
  } catch (error: any) {
    console.error("Exception in set-password route:", error);
    return NextResponse.json({ error: error.message || "Failed to set password" }, { status: 500 });
  }
}
