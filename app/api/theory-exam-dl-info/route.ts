import { NextRequest, NextResponse } from "next/server";
import { fetchTheoryExamDLInfo } from "@/lib/live-exam/irembo";
import { saveNationalIdRecord } from "@/lib/live-exam/save-record";
import { createClient } from "@/lib/supabase/server";
import type { TheoryExamDLInfoAPIResponse } from "@/lib/live-exam/types";

export async function POST(request: NextRequest) {
  let body: { national_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<TheoryExamDLInfoAPIResponse>(
      {
        status: "error",
        message:
          "Invalid request body. Please send a JSON object with a national_id field.",
      },
      { status: 400 }
    );
  }

  const nationalId = body.national_id;
  if (!nationalId || nationalId.length !== 16) {
    return NextResponse.json<TheoryExamDLInfoAPIResponse>(
      {
        status: "error",
        message: "Invalid National ID. Please enter a valid 16-digit ID.",
      },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const includeFull = url.searchParams.get("full") === "true";

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id;

    const response = await fetchTheoryExamDLInfo(nationalId);

    if (!response.status || !response.data) {
      return NextResponse.json<TheoryExamDLInfoAPIResponse>(
        {
          status: "error",
          message: response.message || "No data found for this National ID.",
        },
        { status: 404 }
      );
    }

    const { document, categoriesAllowed } = response.data;

    const sanitizedDocument = includeFull
      ? document
      : { ...document, photo: "", signature: "" };

    // Save to database
    await saveNationalIdRecord(nationalId, userId);

    return NextResponse.json<TheoryExamDLInfoAPIResponse>({
      status: "success",
      document: sanitizedDocument,
      categoriesAllowed: categoriesAllowed || [],
      hasCategories: (categoriesAllowed?.length || 0) > 0,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch theory exam DL info.";
    return NextResponse.json<TheoryExamDLInfoAPIResponse>(
      {
        status: "error",
        message,
      },
      { status: 500 }
    );
  }
}
