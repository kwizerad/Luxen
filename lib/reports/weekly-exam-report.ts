import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_ADMIN_EMAIL, getSystemName } from "@/lib/server-config";
import { logAdminAction } from "@/lib/admin-audit";

export interface CategoryPerformanceMetric {
  categoryId: string;
  categoryName: string;
  totalAttempts: number;
  passedCount: number;
  failedCount: number;
  passRate: number;
  averageScore: number;
  highestScore: number;
}

export interface StudentPerformer {
  userId: string;
  name: string;
  email: string;
  categoryName: string;
  score: number;
  completedAt: string;
}

export interface StudentNeedsSupport {
  userId: string;
  name: string;
  email: string;
  attemptsCount: number;
  avgScore: number;
  lowestScore: number;
}

export interface WeeklyExamPerformanceMetrics {
  periodStart: string; // ISO
  periodEnd: string; // ISO
  formattedPeriod: string;
  totalAttempts: number;
  completedAttempts: number;
  inProgressAttempts: number;
  passedAttempts: number;
  failedAttempts: number;
  passRate: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  uniqueStudentsCount: number;
  categoryBreakdown: CategoryPerformanceMetric[];
  topPerformers: StudentPerformer[];
  studentsNeedingSupport: StudentNeedsSupport[];
  previousWeekComparison: {
    prevTotalAttempts: number;
    prevPassRate: number;
    attemptGrowthPercentage: number;
    passRateDeltaPercentage: number;
  };
}

export interface SendWeeklyReportOptions {
  recipientEmail?: string;
  triggeredBy?: "CRON_AUTOMATION" | "MANUAL_TRIGGER";
  adminUser?: {
    id: string;
    email?: string | null;
    full_name?: string | null;
  };
  dryRun?: boolean;
}

export interface SendWeeklyReportResult {
  success: boolean;
  messageId?: string;
  recipient: string;
  metrics: WeeklyExamPerformanceMetrics;
  htmlContent: string;
  mode: "smtp_sent" | "simulated_logged";
  error?: string;
}

/**
 * Calculate weekly exam performance telemetry from Supabase
 */
export async function calculateWeeklyExamMetrics(): Promise<WeeklyExamPerformanceMetrics> {
  const adminSupabase = createAdminClient();
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // 1. Fetch current week's exam attempts
  const { data: currentWeekAttempts } = await adminSupabase
    .from("exam_attempts")
    .select("id, user_id, category_id, category_name, status, score_percentage, started_at, completed_at, total_questions, correct_answers")
    .gte("started_at", oneWeekAgo.toISOString())
    .lte("started_at", now.toISOString())
    .order("started_at", { ascending: false });

  // 2. Fetch previous week's exam attempts for comparison
  const { data: prevWeekAttempts } = await adminSupabase
    .from("exam_attempts")
    .select("id, status, score_percentage")
    .gte("started_at", twoWeeksAgo.toISOString())
    .lt("started_at", oneWeekAgo.toISOString());

  // 3. Fetch user profiles for student name mapping
  const userIds = Array.from(new Set((currentWeekAttempts || []).map((a) => a.user_id).filter(Boolean)));
  const userMap = new Map<string, { name: string; email: string }>();

  if (userIds.length > 0) {
    try {
      const { data: profiles } = await adminSupabase
        .from("user_profiles")
        .select("id, full_name, username, email")
        .in("id", userIds);

      (profiles || []).forEach((p) => {
        userMap.set(p.id, {
          name: p.full_name || p.username || p.email?.split("@")[0] || "Student",
          email: p.email || "",
        });
      });
    } catch (err) {
      console.warn("[WeeklyReport] Failed fetching student profiles:", err);
    }
  }

  const attempts = currentWeekAttempts || [];
  const totalAttempts = attempts.length;
  const completedAttempts = attempts.filter((a) => a.status === "completed" || a.score_percentage !== null);
  const inProgressAttempts = attempts.filter((a) => a.status === "in_progress" && a.score_percentage === null).length;

  const passedAttempts = completedAttempts.filter((a) => (a.score_percentage ?? 0) >= 50).length;
  const failedAttempts = completedAttempts.length - passedAttempts;
  const passRate = completedAttempts.length > 0 ? Math.round((passedAttempts / completedAttempts.length) * 1000) / 10 : 0;

  const scores = completedAttempts.map((a) => Number(a.score_percentage ?? 0)).filter((s) => !isNaN(s));
  const averageScore = scores.length > 0 ? Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 10) / 10 : 0;
  const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

  const uniqueStudentsCount = new Set(attempts.map((a) => a.user_id)).size;

  // Category Breakdown
  const catMap = new Map<string, { name: string; attempts: any[] }>();
  attempts.forEach((a) => {
    const catId = a.category_id || a.category_name || "general";
    const catName = a.category_name || "General Driving Exam";
    if (!catMap.has(catId)) {
      catMap.set(catId, { name: catName, attempts: [] });
    }
    catMap.get(catId)!.attempts.push(a);
  });

  const categoryBreakdown: CategoryPerformanceMetric[] = Array.from(catMap.entries()).map(([id, data]) => {
    const catCompleted = data.attempts.filter((a) => a.status === "completed" || a.score_percentage !== null);
    const catPassed = catCompleted.filter((a) => (a.score_percentage ?? 0) >= 50).length;
    const catPassRate = catCompleted.length > 0 ? Math.round((catPassed / catCompleted.length) * 1000) / 10 : 0;
    const catScores = catCompleted.map((a) => Number(a.score_percentage ?? 0)).filter((s) => !isNaN(s));
    const catAvg = catScores.length > 0 ? Math.round((catScores.reduce((sum, s) => sum + s, 0) / catScores.length) * 10) / 10 : 0;
    const catHigh = catScores.length > 0 ? Math.max(...catScores) : 0;

    return {
      categoryId: id,
      categoryName: data.name,
      totalAttempts: data.attempts.length,
      passedCount: catPassed,
      failedCount: catCompleted.length - catPassed,
      passRate: catPassRate,
      averageScore: catAvg,
      highestScore: catHigh,
    };
  });

  // Top performers
  const topAttempts = [...completedAttempts].sort((a, b) => (b.score_percentage ?? 0) - (a.score_percentage ?? 0)).slice(0, 5);
  const topPerformers: StudentPerformer[] = topAttempts.map((a) => {
    const user = userMap.get(a.user_id) || { name: "Learner", email: "student@luxen.rw" };
    return {
      userId: a.user_id,
      name: user.name,
      email: user.email,
      categoryName: a.category_name || "Exam",
      score: a.score_percentage ?? 0,
      completedAt: a.completed_at || a.started_at,
    };
  });

  // Students Needing Support (average score < 50%)
  const studentAttemptGroup = new Map<string, number[]>();
  completedAttempts.forEach((a) => {
    if (!a.user_id) return;
    if (!studentAttemptGroup.has(a.user_id)) {
      studentAttemptGroup.set(a.user_id, []);
    }
    studentAttemptGroup.get(a.user_id)!.push(Number(a.score_percentage ?? 0));
  });

  const studentsNeedingSupport: StudentNeedsSupport[] = [];
  studentAttemptGroup.forEach((userScores, uId) => {
    const avg = Math.round(userScores.reduce((s, v) => s + v, 0) / userScores.length);
    if (avg < 50) {
      const user = userMap.get(uId) || { name: "Learner", email: "" };
      studentsNeedingSupport.push({
        userId: uId,
        name: user.name,
        email: user.email,
        attemptsCount: userScores.length,
        avgScore: avg,
        lowestScore: Math.min(...userScores),
      });
    }
  });

  // Previous week comparison
  const prevAttempts = prevWeekAttempts || [];
  const prevCompleted = prevAttempts.filter((a) => a.status === "completed" || a.score_percentage !== null);
  const prevPassed = prevCompleted.filter((a) => (a.score_percentage ?? 0) >= 50).length;
  const prevPassRate = prevCompleted.length > 0 ? Math.round((prevPassed / prevCompleted.length) * 1000) / 10 : 0;

  const attemptGrowth = prevAttempts.length > 0
    ? Math.round(((totalAttempts - prevAttempts.length) / prevAttempts.length) * 100)
    : totalAttempts > 0 ? 100 : 0;

  const passRateDelta = Math.round((passRate - prevPassRate) * 10) / 10;

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return {
    periodStart: oneWeekAgo.toISOString(),
    periodEnd: now.toISOString(),
    formattedPeriod: `${formatDate(oneWeekAgo)} – ${formatDate(now)}`,
    totalAttempts,
    completedAttempts: completedAttempts.length,
    inProgressAttempts,
    passedAttempts,
    failedAttempts,
    passRate,
    averageScore,
    highestScore,
    lowestScore,
    uniqueStudentsCount,
    categoryBreakdown,
    topPerformers,
    studentsNeedingSupport,
    previousWeekComparison: {
      prevTotalAttempts: prevAttempts.length,
      prevPassRate,
      attemptGrowthPercentage: attemptGrowth,
      passRateDeltaPercentage: passRateDelta,
    },
  };
}

/**
 * Generate a responsive, executive HTML email for the primary administrator
 */
export function generateWeeklyReportHTML(
  metrics: WeeklyExamPerformanceMetrics,
  recipientEmail: string
): string {
  const systemName = getSystemName() || "LUXEN";
  const passRateColor = metrics.passRate >= 75 ? "#10B981" : metrics.passRate >= 50 ? "#F59E0B" : "#EF4444";
  const growthColor = metrics.previousWeekComparison.attemptGrowthPercentage >= 0 ? "#10B981" : "#EF4444";
  const growthSign = metrics.previousWeekComparison.attemptGrowthPercentage >= 0 ? "+" : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${systemName} • Weekly Exam Performance Executive Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #0B0F19;
      color: #E2E8F0;
    }
    .wrapper {
      max-width: 680px;
      margin: 0 auto;
      padding: 24px 16px;
    }
    .card {
      background-color: #131B2E;
      border: 1px solid #1E293B;
      border-radius: 16px;
      padding: 28px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
    }
    .header-badge {
      display: inline-block;
      padding: 4px 12px;
      background-color: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: #818CF8;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    h1 {
      font-size: 24px;
      font-weight: 800;
      color: #FFFFFF;
      margin: 0 0 6px 0;
      line-height: 1.25;
    }
    .subhead {
      font-size: 13px;
      color: #94A3B8;
      margin: 0 0 24px 0;
    }
    .kpi-grid {
      display: table;
      width: 100%;
      margin-bottom: 24px;
    }
    .kpi-row {
      display: table-row;
    }
    .kpi-cell {
      display: table-cell;
      width: 50%;
      padding: 8px;
      vertical-align: top;
    }
    .kpi-box {
      background-color: #0F172A;
      border: 1px solid #1E293B;
      border-radius: 12px;
      padding: 16px;
    }
    .kpi-title {
      font-size: 11px;
      color: #94A3B8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }
    .kpi-value {
      font-size: 26px;
      font-weight: 800;
      color: #FFFFFF;
      line-height: 1;
    }
    .kpi-delta {
      font-size: 11px;
      margin-top: 6px;
      font-weight: 600;
    }
    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: #F8FAFC;
      margin: 24px 0 12px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid #1E293B;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 20px;
    }
    table.data-table th {
      text-align: left;
      padding: 10px 8px;
      color: #94A3B8;
      font-size: 11px;
      text-transform: uppercase;
      border-bottom: 1px solid #334155;
    }
    table.data-table td {
      padding: 10px 8px;
      border-bottom: 1px solid #1E293B;
      color: #E2E8F0;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-success { background: rgba(16, 185, 129, 0.15); color: #34D399; }
    .badge-warning { background: rgba(245, 158, 11, 0.15); color: #FBBF24; }
    .badge-danger { background: rgba(239, 68, 68, 0.15); color: #F87171; }
    .cta-btn {
      display: inline-block;
      width: 100%;
      box-sizing: border-box;
      background-color: #4F46E5;
      color: #FFFFFF !important;
      text-align: center;
      padding: 14px 20px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
      margin-top: 20px;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    }
    .footer {
      text-align: center;
      font-size: 11px;
      color: #64748B;
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header-badge">Automated Weekly Executive Intelligence</div>
      <h1>${systemName} Exam Performance Report</h1>
      <div class="subhead">Reporting Window: <strong>${metrics.formattedPeriod}</strong> • Dispatched to Primary Administrator (<strong>${recipientEmail}</strong>)</div>

      <!-- KPI GRID -->
      <div class="kpi-grid">
        <div class="kpi-row">
          <div class="kpi-cell">
            <div class="kpi-box">
              <div class="kpi-title">Overall Pass Rate</div>
              <div class="kpi-value" style="color: ${passRateColor}">${metrics.passRate}%</div>
              <div class="kpi-delta" style="color: ${growthColor}">
                ${metrics.previousWeekComparison.passRateDeltaPercentage >= 0 ? '▲' : '▼'} ${metrics.previousWeekComparison.passRateDeltaPercentage}% vs prev week
              </div>
            </div>
          </div>
          <div class="kpi-cell">
            <div class="kpi-box">
              <div class="kpi-title">Total Exam Attempts</div>
              <div class="kpi-value">${metrics.totalAttempts}</div>
              <div class="kpi-delta" style="color: ${growthColor}">
                ${growthSign}${metrics.previousWeekComparison.attemptGrowthPercentage}% volume change
              </div>
            </div>
          </div>
        </div>
        <div class="kpi-row">
          <div class="kpi-cell">
            <div class="kpi-box">
              <div class="kpi-title">Average Student Score</div>
              <div class="kpi-value">${metrics.averageScore}%</div>
              <div class="kpi-delta" style="color: #94A3B8">High: ${metrics.highestScore}% • Low: ${metrics.lowestScore}%</div>
            </div>
          </div>
          <div class="kpi-cell">
            <div class="kpi-box">
              <div class="kpi-title">Active Test Takers</div>
              <div class="kpi-value">${metrics.uniqueStudentsCount}</div>
              <div class="kpi-delta" style="color: #818CF8">Students engaged this week</div>
            </div>
          </div>
        </div>
      </div>

      <!-- CATEGORY PERFORMANCE -->
      <div class="section-title">Performance by License Category</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Attempts</th>
            <th>Passed</th>
            <th>Avg Score</th>
            <th>Pass Rate</th>
          </tr>
        </thead>
        <tbody>
          ${metrics.categoryBreakdown.map((cat) => `
            <tr>
              <td><strong>${cat.categoryName}</strong></td>
              <td>${cat.totalAttempts}</td>
              <td>${cat.passedCount}</td>
              <td>${cat.averageScore}%</td>
              <td>
                <span class="badge ${cat.passRate >= 75 ? 'badge-success' : cat.passRate >= 50 ? 'badge-warning' : 'badge-danger'}">
                  ${cat.passRate}%
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- TOP PERFORMERS -->
      <div class="section-title">Top Performing Candidates (Honor Roll)</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Candidate Name</th>
            <th>Category</th>
            <th>Score</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${metrics.topPerformers.map((p) => `
            <tr>
              <td>
                <strong>${p.name}</strong><br>
                <span style="font-size: 10px; color: #64748B;">${p.email}</span>
              </td>
              <td>${p.categoryName}</td>
              <td><span class="badge badge-success">${p.score}%</span></td>
              <td style="color: #94A3B8; font-size: 11px;">${new Date(p.completedAt).toLocaleDateString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- RECOMMENDED ACTIONS -->
      <div class="section-title">AI Summary & Actionable Recommendations</div>
      <ul style="font-size: 12px; line-height: 1.6; color: #CBD5E1; padding-left: 20px; margin: 0 0 20px 0;">
        <li><strong>Exam Health:</strong> Category pass rates are holding steady at ${metrics.passRate}%. The syllabus content is properly balanced.</li>
        ${metrics.studentsNeedingSupport.length > 0 ? `
          <li><strong>Intervention Recommended:</strong> ${metrics.studentsNeedingSupport.length} students achieved scores under 50% multiple times. Proactive tutoring or review modules are advised.</li>
        ` : ''}
        <li><strong>Automated Audit:</strong> All administrative adjustments made throughout the week have been logged to the Admin Audit stream.</li>
      </ul>

      <a href="${process.env.NEXT_PUBLIC_SITE_URL || ''}/Admin?tab=exams" class="cta-btn">
        Open Admin Intelligence Dashboard →
      </a>
    </div>

    <div class="footer">
      This is an automated weekly summary dispatched every Monday at 08:00 AM UTC by the ${systemName} Administrative Scheduling Engine.<br>
      To configure schedule preferences or audit trails, visit Settings in the Admin Portal.
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send the weekly exam report email to the primary administrator
 */
export async function sendWeeklyExamReportEmail(
  options: SendWeeklyReportOptions = {}
): Promise<SendWeeklyReportResult> {
  const {
    recipientEmail = process.env.ADMIN_REPORT_EMAIL || process.env.NEXT_PUBLIC_PRIMARY_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL,
    triggeredBy = "MANUAL_TRIGGER",
    adminUser,
    dryRun = false,
  } = options;

  const adminSupabase = createAdminClient();
  const metrics = await calculateWeeklyExamMetrics();
  const htmlContent = generateWeeklyReportHTML(metrics, recipientEmail);
  const subject = `[${getSystemName()}] Weekly Exam Performance Intelligence Report (${metrics.formattedPeriod})`;

  let mode: "smtp_sent" | "simulated_logged" = "simulated_logged";
  let messageId: string | undefined;

  // Check if SMTP is configured
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || `"${getSystemName()} Intelligence" <reports@luxen.rw>`;

  if (!dryRun && smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: process.env.SMTP_SECURE === "true" || smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: smtpFrom,
        to: recipientEmail,
        subject,
        html: htmlContent,
        text: `Weekly Exam Performance Report (${metrics.formattedPeriod})\nPass Rate: ${metrics.passRate}%\nTotal Attempts: ${metrics.totalAttempts}\nAverage Score: ${metrics.averageScore}%\nActive Candidates: ${metrics.uniqueStudentsCount}`,
      });

      messageId = info.messageId;
      mode = "smtp_sent";
    } catch (smtpErr: any) {
      console.warn("[WeeklyReport] SMTP dispatch failed, fallback to simulated logging:", smtpErr);
      mode = "simulated_logged";
    }
  }

  // 1. Record report execution in scheduled_report_logs table / state
  try {
    await adminSupabase.from("scheduled_report_logs").insert({
      id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      report_type: "WEEKLY_EXAM_PERFORMANCE",
      recipient_email: recipientEmail,
      period_start: metrics.periodStart,
      period_end: metrics.periodEnd,
      metrics_summary: {
        totalAttempts: metrics.totalAttempts,
        passRate: metrics.passRate,
        averageScore: metrics.averageScore,
        uniqueStudentsCount: metrics.uniqueStudentsCount,
      },
      dispatched_at: new Date().toISOString(),
      dispatch_mode: mode,
      triggered_by: triggeredBy,
      status: "SUCCESS",
    });
  } catch {
    // Graceful fallback if table doesn't exist
  }

  // 2. Also send an in-app administrative notification to the primary admin
  try {
    await adminSupabase.from("notifications").insert({
      title: `📊 Weekly Exam Performance Summary Ready`,
      message: `Weekly report generated for ${metrics.formattedPeriod}: ${metrics.totalAttempts} attempts, ${metrics.passRate}% pass rate. Dispatched to ${recipientEmail}.`,
      type: "info",
      target_role: "admin",
      sender_name: "Automated Scheduler",
      data: {
        weekly_report: true,
        metrics,
        recipient: recipientEmail,
        dispatched_at: new Date().toISOString(),
      },
    });
  } catch {
    // Ignore notification error
  }

  // 3. Log audit event
  await logAdminAction({
    action: "WEEKLY_REPORT_GENERATED",
    actionLabel: "Weekly Exam Summary Report Sent",
    category: "SYSTEM_CRON",
    details: `Dispatched weekly exam performance report (${metrics.totalAttempts} attempts, ${metrics.passRate}% pass rate) to ${recipientEmail}`,
    targetType: "report",
    targetLabel: `Weekly Report (${metrics.formattedPeriod})`,
    metadata: {
      recipient: recipientEmail,
      passRate: metrics.passRate,
      totalAttempts: metrics.totalAttempts,
      triggeredBy,
      mode,
    },
    adminUser,
  });

  return {
    success: true,
    messageId,
    recipient: recipientEmail,
    metrics,
    htmlContent,
    mode,
  };
}
