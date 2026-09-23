import { NextRequest, NextResponse } from "next/server";
import { cleanupStaleExamAttempts } from "@/lib/exam-cleanup";

export const dynamic = "force-dynamic";

/**
 * Server-side route to purge in-progress exam attempts older than 60 minutes without activity.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret") || searchParams.get("key");
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret && secret !== expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      const host = request.headers.get("host") || "";
      const isInternal = host.includes("localhost") || host.includes("127.0.0.1") || host.includes(".internal");
      if (!isInternal) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const maxAgeParam = searchParams.get("max_age_minutes");
    const maxAgeMinutes = maxAgeParam ? parseInt(maxAgeParam, 10) : 60;

    const result = await cleanupStaleExamAttempts({
      maxAgeMinutes: Number.isFinite(maxAgeMinutes) && maxAgeMinutes > 0 ? maxAgeMinutes : 60,
    });

    return NextResponse.json({
      message: `Exam cleanup completed. Removed ${result.deletedAttemptsCount} stale exam attempts.`,
      ...result,
    });
  } catch (error: any) {
    console.error("[CleanupRoute] Error executing cleanup:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to run exam cleanup" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
