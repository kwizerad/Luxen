import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchCitizenFullDetails, verifyCitizenMatch } from "@/lib/irembo-citizen";

export const dynamic = "force-dynamic";

export interface RecoverNidAccountBody {
  national_id: string;
  full_name: string;
  birthdate: string;
  security_answer: string;
  new_password?: string;
  mode?: "verify" | "reset";
}

export async function POST(request: NextRequest) {
  try {
    const body: RecoverNidAccountBody = await request.json().catch(() => ({}));
    const cleanId = (body.national_id || "").replace(/\D/g, "");
    const fullName = (body.full_name || "").trim();
    const birthdate = (body.birthdate || "").trim();
    const securityAnswer = (body.security_answer || "").trim().toLowerCase();
    const newPassword = (body.new_password || "").trim();
    const mode = body.mode || "verify";

    if (cleanId.length !== 16) {
      return NextResponse.json(
        { error: "Please enter a valid 16-digit National ID number." },
        { status: 400 }
      );
    }

    if (!fullName || !birthdate) {
      return NextResponse.json(
        { error: "Full Name and Date of Birth are required for National ID recovery." },
        { status: 400 }
      );
    }

    const adminSb = createAdminClient();

    // 1. Fetch user profile from database
    const { data: profile } = await adminSb
      .from("user_profiles")
      .select("id, email, full_name, first_name, last_name, birthdate, security_question, security_answer_clean")
      .eq("national_id", cleanId)
      .maybeSingle();

    // 2. Fetch citizen record from Irembo
    const citizenDoc = await fetchCitizenFullDetails(cleanId);

    if (!citizenDoc.hasOfficialRecord && !profile) {
      return NextResponse.json(
        { error: "National ID was not found in the official registry." },
        { status: 404 }
      );
    }

    // 3. Verify Name match
    const nameMatch = verifyCitizenMatch(fullName, citizenDoc, profile, "name");
    if (!nameMatch.isVerified) {
      return NextResponse.json(
        { error: "The Full Name provided does not match official records for this National ID." },
        { status: 400 }
      );
    }

    // 4. Verify Date of Birth match
    const dobMatch = verifyCitizenMatch(birthdate, citizenDoc, profile, "dob");
    if (!dobMatch.isVerified) {
      return NextResponse.json(
        { error: "The Date of Birth provided does not match official records for this National ID." },
        { status: 400 }
      );
    }

    // 5. Verify Security Answer (if user set a custom security answer)
    if (profile?.security_answer_clean) {
      const storedAnswer = profile.security_answer_clean.trim().toLowerCase();
      if (!securityAnswer || storedAnswer !== securityAnswer) {
        return NextResponse.json(
          { error: "The security answer is incorrect. Please check your answer and try again." },
          { status: 400 }
        );
      }
    }

    // If mode is verify, return success and user's chosen security question
    if (mode === "verify") {
      return NextResponse.json({
        success: true,
        verified: true,
        securityQuestion: profile?.security_question || "Izina witwaga mu buto bwawe (Childhood Name)",
        message: "Identity and security verification successful!",
      });
    }

    // Mode is reset: require new password
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const userId = profile?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "User account not found. Please log in with National ID first." },
        { status: 404 }
      );
    }

    // Update password via admin client
    const { error: resetError } = await adminSb.auth.admin.updateUserById(userId, {
      password: newPassword,
      user_metadata: {
        has_custom_password: true,
      },
    });

    if (resetError) {
      return NextResponse.json({ error: resetError.message }, { status: 500 });
    }

    await adminSb
      .from("user_profiles")
      .update({ has_custom_password: true, updated_at: new Date().toISOString() })
      .eq("id", userId);

    return NextResponse.json({
      success: true,
      message: "Password reset successfully! You can now log in with your new password.",
    });
  } catch (error: any) {
    console.error("Error in recover-nid-account route:", error);
    return NextResponse.json({ error: error.message || "Failed to process recovery" }, { status: 500 });
  }
}
