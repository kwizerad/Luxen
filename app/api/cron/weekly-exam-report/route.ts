import { NextRequest, NextResponse } from "next/server";
import { sendWeeklyExamReportEmail, calculateWeeklyExamMetrics } from "@/lib/reports/weekly-exam-report";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/app/Admin/actions/_shared";
import { DEFAULT_ADMIN_EMAIL } from "@/lib/server-config";

export const dynamic = "force-dynamic";

/**
 * Weekly Automated Exam Performance Report Cron Endpoint
 *
 * Can be triggered via:
 * 1. Scheduled Cloud Cron / Vercel Cron with Authorization: Bearer <CRON_SECRET>
 * 2. Admin dashboard test trigger button (authenticated admin session)
 * 3. GET / POST with ?secret=<CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret") || searchParams.get("key");
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.CRON_SECRET;

    const emailOverride = searchParams.get("email") || undefined;
    const dryRun = searchParams.get("dry_run") === "true";
    const previewOnly = searchParams.get("preview") === "true";

    let authenticatedAdmin = null;

    // 1. Check Secret match
    const isSecretValid =
      expectedSecret &&
      (secret === expectedSecret || authHeader === `Bearer ${expectedSecret}`);

    // 2. If no valid cron secret, check session admin
    if (!isSecretValid) {
      try {
        authenticatedAdmin = await getAdminUser();
      } catch {
        authenticatedAdmin = null;
      }

      if (!authenticatedAdmin) {
        const host = request.headers.get("host") || "";
        const isInternal =
          host.includes("localhost") ||
          host.includes("127.0.0.1") ||
          host.includes(".internal");

        if (!isInternal) {
          return NextResponse.json(
            { error: "Unauthorized. Missing valid CRON_SECRET or Admin credentials." },
            { status: 401 }
          );
        }
      }
    }

    if (previewOnly) {
      const metrics = await calculateWeeklyExamMetrics();
      return NextResponse.json({
        success: true,
        preview: true,
        metrics,
      });
    }

    const recipient =
      emailOverride ||
      process.env.ADMIN_REPORT_EMAIL ||
      process.env.NEXT_PUBLIC_PRIMARY_ADMIN_EMAIL ||
      DEFAULT_ADMIN_EMAIL;

    const result = await sendWeeklyExamReportEmail({
      recipientEmail: recipient,
      triggeredBy: authenticatedAdmin ? "MANUAL_TRIGGER" : "CRON_AUTOMATION",
      adminUser: authenticatedAdmin || undefined,
      dryRun,
    });

    return NextResponse.json({
      message: `Weekly exam performance report generated successfully and dispatched to ${result.recipient}.`,
      recipient: result.recipient,
      mode: result.mode,
      metrics: result.metrics,
      success: true,
    });
  } catch (error: any) {
    console.error("[CronWeeklyReport] Execution failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate weekly exam performance report" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
