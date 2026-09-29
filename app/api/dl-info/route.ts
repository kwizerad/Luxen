import { NextRequest, NextResponse } from "next/server";
import { fetchDLInfoByNationalId } from "@/lib/live-exam/irembo";
import { saveNationalIdRecord } from "@/lib/live-exam/save-record";
import { createClient } from "@/lib/supabase/server";
import type { DLInfoAPIResponse } from "@/lib/live-exam/types";

export async function POST(request: NextRequest) {
  let body: { national_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<DLInfoAPIResponse>(
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
    return NextResponse.json<DLInfoAPIResponse>(
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

    const response = await fetchDLInfoByNationalId(nationalId);

    if (!response.status || !response.data) {
      return NextResponse.json<DLInfoAPIResponse>(
        {
          status: "error",
          message: response.message || "No data found for this National ID.",
        },
        { status: 404 }
      );
    }

    const { license, document, categoriesAllowed } = response.data;

    const sanitizedDocument = includeFull
      ? document
      : { ...document, photo: "", signature: "" };

    // Save to database
    await saveNationalIdRecord(nationalId, userId);

    return NextResponse.json<DLInfoAPIResponse>({
      status: "success",
      license,
      document: sanitizedDocument,
      categoriesAllowed: categoriesAllowed || [],
      categoryCount: categoriesAllowed?.length || 0,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch DL info.";
    return NextResponse.json<DLInfoAPIResponse>(
      {
        status: "error",
        message,
      },
      { status: 500 }
    );
  }
}
