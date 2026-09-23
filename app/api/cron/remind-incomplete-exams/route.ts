import { NextRequest, NextResponse } from "next/server";
import { notifyIncompleteExamAttempts } from "@/lib/exam-reminder";

export const dynamic = "force-dynamic";

/**
 * Server-side cron route to trigger reminders for students with in-progress
 * exam attempts older than 45 minutes without completion.
 *
 * Query params:
 *   - threshold_minutes: number (default: 45)
 *   - dry_run: "true" | "false" (default: false)
 *   - secret / key / Authorization: Bearer <CRON_SECRET>
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

    const thresholdParam = searchParams.get("threshold_minutes");
    const thresholdMinutes = thresholdParam ? parseInt(thresholdParam, 10) : 45;
    const dryRun = searchParams.get("dry_run") === "true";

    const result = await notifyIncompleteExamAttempts({
      thresholdMinutes: Number.isFinite(thresholdMinutes) && thresholdMinutes > 0 ? thresholdMinutes : 45,
      dryRun,
    });

    return NextResponse.json({
      message: `Exam reminder check completed. Sent ${result.notifiedCount} notifications (${result.skippedCount} already notified / skipped).`,
      ...result,
    });
  } catch (error: any) {
    console.error("[CronExamReminder] Error executing reminder task:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to trigger exam reminders" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
