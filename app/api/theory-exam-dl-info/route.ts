import { NextRequest, NextResponse } from "next/server";
import { fetchTheoryExamDLInfo } from "@/lib/live-exam/irembo";
import { saveNationalIdRecord } from "@/lib/live-exam/save-record";
import { createClient } from "@/lib/supabase/server";
import type { TheoryExamDLInfoAPIResponse } from "@/lib/live-exam/types";

export const dynamic = "force-dynamic";

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

    // Save canonical record with belonging citizen info
    await saveNationalIdRecord(nationalId, userId, {
      userEmail: user?.email || undefined,
      citizen: document
        ? {
            nationalId,
            firstName: document.firstName || "",
            lastName: document.lastName || "",
            fullName: [document.firstName, document.lastName].filter(Boolean).join(" ") || "",
            dateOfBirth: document.dateOfBirth || "",
            gender: document.sex || "",
            nationality: document.nationality === "RW" ? "Rwandan" : document.nationality || "",
            photoUrl: document.photo ? `data:image/jpeg;base64,${document.photo}` : "",
            signatureUrl: document.signature ? `data:image/jpeg;base64,${document.signature}` : "",
            civilStatus: document.civilStatus || undefined,
            spouse: document.spouse || undefined,
            fatherNames: document.fatherNames || undefined,
            motherNames: document.motherNames || undefined,
            placeOfBirth: document.placeOfBirth || undefined,
            placeOfIssue: document.placeOfIssue || undefined,
            province: document.province || undefined,
            district: document.district || undefined,
            sector: document.sector || undefined,
            cell: document.cell || undefined,
            village: document.village || undefined,
          }
        : undefined,
    });

    return NextResponse.json<TheoryExamDLInfoAPIResponse>(
      {
        status: "success",
        document: sanitizedDocument,
        categoriesAllowed: categoriesAllowed || [],
        hasCategories: (categoriesAllowed?.length || 0) > 0,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
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
