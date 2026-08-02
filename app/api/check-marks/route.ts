import { NextRequest, NextResponse } from "next/server";
import { fetchRegistrationCodes, fetchCodeDetails } from "@/lib/live-exam/irembo";
import type { CheckMarksResponse } from "@/lib/live-exam/types";

export async function POST(request: NextRequest) {
  let body: { national_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<CheckMarksResponse>(
      {
        status: "error",
        code: "INVALID_REQUEST",
        message:
          "Invalid request body. Please send a JSON object with a national_id field.",
      },
      { status: 400 }
    );
  }

  const nationalId = body.national_id;
  if (!nationalId || nationalId.length < 16 || nationalId.length > 16) {
    return NextResponse.json<CheckMarksResponse>(
      {
        status: "error",
        code: "INVALID_ID",
        message:
          "Invalid National ID. Please enter a valid 16-digit ID.",
      },
      { status: 400 }
    );
  }

  try {
    const response = await fetchRegistrationCodes(nationalId);

    if (response.status === 404 || response.status === 400) {
      return NextResponse.json<CheckMarksResponse>({
        status: "error",
        code: "INVALID_ID",
        message:
          "The provided National ID could not be found in the system. Please verify that you have entered the correct 16-digit ID.",
      });
    }

    if (!response.ok) {
      return NextResponse.json<CheckMarksResponse>({
        status: "error",
        code: "SERVER_ERROR",
        message: `Unable to connect to the verification system. Status code: ${response.status}`,
      });
    }

    const resData = await response.json();

    if (!resData.status) {
      return NextResponse.json<CheckMarksResponse>({
        status: "error",
        code: "INVALID_ID",
        message:
          "The provided National ID could not be found in the system. Please verify that you have entered the correct 16-digit ID.",
      });
    }

    if (!resData.data || !resData.data.registrationCodes) {
      return NextResponse.json<CheckMarksResponse>({
        status: "error",
        code: "NO_CODES",
        message:
          "No driving exam records found for this National ID. This could mean you haven't registered for any driving exam yet, or your registration is still being processed.",
      });
    }

    const codesList: string[] = resData.data.registrationCodes;
    if (!codesList || codesList.length === 0) {
      return NextResponse.json<CheckMarksResponse>({
        status: "error",
        code: "NO_CODES",
        message:
          "No driving exam records found for this National ID. This could mean you haven't registered for any driving exam yet, or your registration is still being processed.",
      });
    }

    const codeDetails = await Promise.all(
      codesList.map((code) => fetchCodeDetails(code))
    );

    const practicalCodes: string[] = [];
    const theoryCodes: string[] = [];
    let candidateName = "N/A";
    let resultNationalId = nationalId;

    for (const result of codeDetails) {
      if (result.isPractical) {
        practicalCodes.push(result.registrationCode);
      } else {
        theoryCodes.push(result.registrationCode);
      }

      if (result.candidateName !== "N/A" && candidateName === "N/A") {
        candidateName = result.candidateName;
        resultNationalId = result.nationalId;
      }
    }

    const results: Record<string, (typeof codeDetails)[0]> = {};
    for (const detail of codeDetails) {
      results[detail.registrationCode] = detail;
    }

    return NextResponse.json<CheckMarksResponse>({
      status: "success",
      candidateName,
      nationalId: resultNationalId,
      practical_codes: practicalCodes,
      theory_codes: theoryCodes,
      results,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json<CheckMarksResponse>({
        status: "error",
        code: "TIMEOUT",
        message:
          "The request took too long to complete. Please check your internet connection and try again.",
      });
    }

    return NextResponse.json<CheckMarksResponse>({
      status: "error",
      code: "SYSTEM_ERROR",
      message: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
