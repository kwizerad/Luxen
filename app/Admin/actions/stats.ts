"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, ActionResult } from "./_shared";

export interface AdminStats {
  stats: {
    totalUsers?: number;
    totalAdmins?: number;
    totalCategories: number;
    totalQuestions: number;
    totalAttempts?: number;
  };
  recentActivity: {
    categories: unknown[];
    questions: unknown[];
    users?: unknown[];
  };
  systemStatus: {
    database: string;
    supabase: string;
    lastUpdated: string;
  };
}

function handleError(error: unknown): { success: false; error: string } {
  if (error instanceof Error) return { success: false, error: error.message };
  if (typeof error === "object" && error !== null) {
    const e = error as { message?: string; error?: string; details?: string };
    if (e.message) return { success: false, error: e.message };
    if (e.error) return { success: false, error: e.error };
    if (e.details) return { success: false, error: e.details };
  }
  return { success: false, error: String(error) };
}

export async function getAdminStats(): Promise<ActionResult<AdminStats>> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    const { count: categoryCount } = await supabase
      .from("exam_categories")
      .select("*", { count: "exact", head: true });

    const { count: questionCount } = await supabase
      .from("exam_questions")
      .select("*", { count: "exact", head: true });

    const { count: attemptsCount } = await supabase
      .from("exam_attempts")
      .select("*", { count: "exact", head: true });

    const { data: recentCategories } = await supabase
      .from("exam_categories")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    const { data: recentQuestions } = await supabase
      .from("exam_questions")
      .select("*, exam_categories(name)")
      .order("created_at", { ascending: false })
      .limit(5);

    const systemStatus = {
      database: "healthy",
      supabase: "connected",
      lastUpdated: new Date().toISOString(),
    };

    return {
      success: true,
      data: {
        stats: {
          totalCategories: categoryCount || 0,
          totalQuestions: questionCount || 0,
          totalAttempts: attemptsCount || 0,
        },
        recentActivity: {
          categories: recentCategories || [],
          questions: recentQuestions || [],
        },
        systemStatus,
      },
    };
  } catch (error) {
    return handleError(error);
  }
}
