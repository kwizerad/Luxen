import { NextRequest, NextResponse } from "next/server";
import { fetchMarksByCode } from "@/lib/live-exam/irembo";

export async function POST(request: NextRequest) {
  let body: { registration_code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const registrationCode = body.registration_code;
  if (!registrationCode) {
    return NextResponse.json(
      { error: "Missing registration_code field." },
      { status: 400 }
    );
  }

  try {
    const response = await fetchMarksByCode(registrationCode);
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch marks. Status: ${response.status}` },
        { status: response.status }
      );
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error calling Irembo API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
