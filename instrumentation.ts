export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startExamCleanupRecurringJob } = await import("@/lib/exam-cleanup");
    const { startExamReminderRecurringJob } = await import("@/lib/exam-reminder");
    const { sanitizeAdminProfiles } = await import("@/lib/admin-cleanup");

    startExamCleanupRecurringJob(15); // runs cleanup every 15 minutes in background
    startExamReminderRecurringJob(10); // runs incomplete exam reminders every 10 minutes in background
    sanitizeAdminProfiles().catch(() => {});
  }
}
