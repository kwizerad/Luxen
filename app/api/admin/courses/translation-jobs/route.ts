import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const CONFIG_KEY = "course_translation_jobs_log";
const MAX_STORED_JOBS = 100;

export interface TranslationStepLog {
  id: string;
  timestamp: string;
  itemType: "course" | "module" | "lesson" | "topic";
  sourceTitle: string;
  translatedTitle?: string;
  moduleTitle?: string;
  lessonTitle?: string;
  status: "completed" | "failed" | "running" | "pending";
  durationMs?: number;
  error?: string;
}

export interface TranslationJobRecord {
  id: string;
  type: "course" | "module" | "lesson" | "topic";
  sourceLang: string;
  targetLang: string;
  sourceCourseId?: string;
  targetCourseId?: string;
  scopeTitle: string;
  moduleTitle?: string;
  lessonTitle?: string;
  topicTitle?: string;
  moduleIndex?: number;
  lessonIndex?: number;
  topicIndex?: number;
  checkpoint?: {
    moduleIndex: number;
    lessonIndex: number;
    topicIndex: number;
    targetModuleId?: string;
    targetLessonId?: string;
    translatedModuleTitle?: string;
    translatedLessonTitle?: string;
  };
  status: "running" | "completed" | "failed" | "cancelled";
  progressPercent: number;
  completedSteps: number;
  totalSteps: number;
  currentStepMessage: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
  initiatedBy?: string;
  stats: {
    modulesTranslated: number;
    lessonsTranslated: number;
    topicsTranslated: number;
    failedItems: number;
  };
  steps: TranslationStepLog[];
}

async function readJobsFromDb(adminSupabase: ReturnType<typeof createAdminClient>): Promise<TranslationJobRecord[]> {
  const { data } = await adminSupabase
    .from("system_config")
    .select("value")
    .eq("key", CONFIG_KEY)
    .maybeSingle();

  if (!data?.value) return [];
  try {
    const parsed = JSON.parse(data.value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeJobsToDb(
  adminSupabase: ReturnType<typeof createAdminClient>,
  jobs: TranslationJobRecord[]
): Promise<void> {
  const trimmed = jobs.slice(0, MAX_STORED_JOBS);
  await adminSupabase.from("system_config").upsert(
    {
      key: CONFIG_KEY,
      value: JSON.stringify(trimmed),
      description: "Detailed history and status log of course translation background jobs",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
}

export async function GET() {
  try {
    const adminSupabase = createAdminClient();
    const jobs = await readJobsFromDb(adminSupabase);
    return NextResponse.json({ jobs });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load translation jobs", jobs: [] },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const adminSupabase = createAdminClient();
    let userIsAdmin = isAdmin(user as any);
    if (!userIsAdmin && user) {
      const { data: profile } = await adminSupabase
        .from("user_profiles")
        .select("role, email")
        .eq("id", user.id)
        .maybeSingle();
      if (
        profile?.role?.toLowerCase() === "admin" ||
        profile?.email?.toLowerCase() === "navo@admin.jn"
      ) {
        userIsAdmin = true;
      }
    }

    if (!userIsAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { action, job, jobId } = body;

    const existingJobs = await readJobsFromDb(adminSupabase);

    if (action === "clear_completed") {
      const remaining = existingJobs.filter((j) => j.status === "running");
      await writeJobsToDb(adminSupabase, remaining);
      return NextResponse.json({ success: true, jobs: remaining });
    }

    if (action === "delete" && jobId) {
      const remaining = existingJobs.filter((j) => j.id !== jobId);
      await writeJobsToDb(adminSupabase, remaining);
      return NextResponse.json({ success: true, jobs: remaining });
    }

    if (job && job.id) {
      const idx = existingJobs.findIndex((j) => j.id === job.id);
      if (idx !== -1) {
        existingJobs[idx] = {
          ...existingJobs[idx],
          ...job,
          updatedAt: new Date().toISOString(),
        };
      } else {
        existingJobs.unshift({
          ...job,
          initiatedBy: job.initiatedBy || user?.email || "Admin",
          updatedAt: new Date().toISOString(),
        });
      }
      await writeJobsToDb(adminSupabase, existingJobs);
      return NextResponse.json({ success: true, job: existingJobs[idx !== -1 ? idx : 0] });
    }

    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to save translation job" },
      { status: 500 }
    );
  }
}
