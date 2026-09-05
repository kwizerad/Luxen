import { NextRequest, NextResponse } from "next/server";
import { fetchTheoryExamDLInfo } from "@/lib/live-exam/irembo";
import { createClient } from "@/lib/supabase/server";

interface RegisterDriverBody {
  national_id?: string;
  verification_type?: "name" | "dob";
  verification_value?: string;
}

export async function POST(request: NextRequest) {
  let body: RegisterDriverBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { status: "error", message: "Invalid request body." },
      { status: 400 }
    );
  }

  const nationalId = body.national_id;
  if (!nationalId || nationalId.length !== 16) {
    return NextResponse.json(
      { status: "error", message: "Invalid National ID. Please enter a valid 16-digit ID." },
      { status: 400 }
    );
  }

  const verificationType = body.verification_type;
  const verificationValue = body.verification_value?.trim();
  if (!verificationType || !verificationValue) {
    return NextResponse.json(
      { status: "error", message: "Verification value is required." },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is already a driver
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (existingProfile?.role === "Driver") {
      return NextResponse.json(
        { status: "error", message: "You are already registered as a driver." },
        { status: 400 }
      );
    }

    // Check if driver profile already exists
    const { data: existingDriver } = await supabase
      .from("drivers")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (existingDriver) {
      return NextResponse.json(
        { status: "error", message: "Driver profile already exists." },
        { status: 400 }
      );
    }

    // Fetch document info from Irembo
    const response = await fetchTheoryExamDLInfo(nationalId);

    if (!response.status || !response.data) {
      return NextResponse.json(
        { status: "error", message: response.message || "No data found for this National ID." },
        { status: 404 }
      );
    }

    const { document } = response.data;

    if (!document) {
      return NextResponse.json(
        { status: "error", message: "No document found for this National ID." },
        { status: 404 }
      );
    }

    // Verify the user's input against the ID document
    const firstName = (document.firstName || "").trim().toLowerCase();
    const lastName = (document.lastName || "").trim().toLowerCase();
    const dateOfBirth = (document.dateOfBirth || "").trim();

    let isVerified = false;

    if (verificationType === "name") {
      const inputValue = verificationValue.toLowerCase();
      // User must enter one of the two names from the ID
      isVerified = inputValue === firstName || inputValue === lastName;
    } else if (verificationType === "dob") {
      // Compare dates — handle different formats
      const inputDate = verificationValue;
      isVerified = inputDate === dateOfBirth ||
        new Date(inputDate).toISOString().split("T")[0] === new Date(dateOfBirth).toISOString().split("T")[0];
    }

    if (!isVerified) {
      return NextResponse.json(
        {
          status: "error",
          message: verificationType === "name"
            ? "The name you entered does not match the names on this National ID."
            : "The date of birth you entered does not match the date on this National ID.",
        },
        { status: 400 }
      );
    }

    // Check if this national ID is already used by another user
    const { data: existingIdUser } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("national_id", nationalId)
      .neq("id", user.id)
      .maybeSingle();

    if (existingIdUser) {
      return NextResponse.json(
        { status: "error", message: "This National ID is already registered to another account." },
        { status: 409 }
      );
    }

    // Verification passed — create driver profile and update user role
    const fullName = `${document.firstName || ""} ${document.lastName || ""}`.trim();

    const { error: driverError } = await supabase
      .from("drivers")
      .insert({
        id: user.id,
        full_name: fullName,
        email: user.email,
        is_active: true,
        is_approved: false,
      });

    if (driverError) {
      return NextResponse.json(
        { status: "error", message: "Failed to create driver profile." },
        { status: 500 }
      );
    }

    // Update user profile role and national_id
    const { error: profileError } = await supabase
      .from("user_profiles")
      .update({
        role: "Driver",
        national_id: nationalId,
      })
      .eq("id", user.id);

    if (profileError) {
      // Try to rollback driver creation
      await supabase.from("drivers").delete().eq("id", user.id);
      return NextResponse.json(
        { status: "error", message: "Failed to update user profile." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "success",
      message: "Driver registration successful. Your profile is pending approval.",
      full_name: fullName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to register as driver.";
    return NextResponse.json(
      { status: "error", message },
      { status: 500 }
    );
  }
}
