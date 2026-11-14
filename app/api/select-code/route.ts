import { NextRequest, NextResponse } from "next/server";
import { fetchCodeDetails } from "@/lib/live-exam/irembo";
import type { SelectCodeResponse } from "@/lib/live-exam/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { selected_code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<SelectCodeResponse>(
      {
        status: "error",
        message: "Invalid request body.",
      },
      { status: 400 }
    );
  }

  const selectedCode = body.selected_code;
  if (!selectedCode) {
    return NextResponse.json<SelectCodeResponse>(
      {
        status: "error",
        message: "Missing selected_code field.",
      },
      { status: 400 }
    );
  }

  try {
    const result = await fetchCodeDetails(selectedCode);
    return NextResponse.json<SelectCodeResponse>(
      {
        status: "success",
        result,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch {
    return NextResponse.json<SelectCodeResponse>({
      status: "error",
      message: "Failed to retrieve exam results. Please try again.",
    });
  }
}
