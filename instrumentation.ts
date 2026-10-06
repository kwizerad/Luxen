export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Defer non-critical background jobs so dev server startup is instantaneous
    setTimeout(async () => {
      try {
        const [
          { startExamCleanupRecurringJob },
          { startExamReminderRecurringJob },
          { sanitizeAdminProfiles },
        ] = await Promise.all([
          import("@/lib/exam-cleanup"),
          import("@/lib/exam-reminder"),
          import("@/lib/admin-cleanup"),
        ]);

        startExamCleanupRecurringJob(15);
        startExamReminderRecurringJob(10);
        sanitizeAdminProfiles().catch(() => {});
      } catch {
        // Ignore background job initialization errors
      }
    }, 15000);
  }
}
