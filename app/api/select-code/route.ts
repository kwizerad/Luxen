import { NextRequest, NextResponse } from "next/server";
import { getCachedResult } from "@/lib/live-exam/cache";
import { fetchCodeDetails } from "@/lib/live-exam/irembo";
import type { SelectCodeResponse } from "@/lib/live-exam/types";

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

  const cached = getCachedResult(selectedCode);
  if (cached) {
    return NextResponse.json<SelectCodeResponse>({
      status: "success",
      result: cached,
    });
  }

  try {
    const result = await fetchCodeDetails(selectedCode);
    return NextResponse.json<SelectCodeResponse>({
      status: "success",
      result,
    });
  } catch {
    return NextResponse.json<SelectCodeResponse>({
      status: "error",
      message: "Failed to retrieve exam results. Please try again.",
    });
  }
}
