import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin, isStrictlyStudentEmail } from "@/lib/permissions";
import { getGazetteArticles, saveGazetteArticles, clearGazetteArticles, SEED_GAZETTE_ARTICLES, GazetteArticle } from "@/lib/gazette-data";

export const dynamic = "force-dynamic";

// GET all gazette articles
export async function GET() {
  try {
    const articles = await getGazetteArticles();
    return NextResponse.json({ articles });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add, update, bulk import, or reset gazette articles (Admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSb = createAdminClient();
    let userIsAdmin = !isStrictlyStudentEmail(user.email) && isAdmin(user as any);

    if (!userIsAdmin) {
      const { data: profile } = await adminSb
        .from("user_profiles")
        .select("role, email")
        .eq("id", user.id)
        .maybeSingle();

      if (
        !isStrictlyStudentEmail(profile?.email) &&
        (profile?.role?.toLowerCase() === "admin" ||
          profile?.email?.toLowerCase() === "navo@admin.jn")
      ) {
        userIsAdmin = true;
      }
    }

    if (!userIsAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const action = body.action || "save";

    if (action === "reset" || action === "clear_all") {
      await clearGazetteArticles();
      return NextResponse.json({ success: true, articles: [] });
    }

    if (action === "bulk_import" && Array.isArray(body.articles)) {
      const current = await getGazetteArticles();
      const map = new Map<string, GazetteArticle>();
      for (const a of current) {
        map.set(a.id, a);
      }
      for (const a of body.articles) {
        if (a.articleNumber && a.content) {
          const id = a.id || `custom-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
          map.set(id, {
            id,
            articleNumber: a.articleNumber.trim(),
            title: a.title?.trim() || a.articleNumber.trim(),
            category: a.category || "general",
            language: a.language || "rw",
            decreeRef: a.decreeRef || "Official Gazette of the Republic of Rwanda / Iteka rya Perezida",
            content: a.content.trim(),
            keyTakeaways: Array.isArray(a.keyTakeaways) ? a.keyTakeaways : [],
            updatedAt: new Date().toISOString(),
          });
        }
      }
      const updatedList = Array.from(map.values());
      await saveGazetteArticles(updatedList);
      return NextResponse.json({ success: true, articles: updatedList });
    }

    if (action === "delete" && body.id) {
      const current = await getGazetteArticles();
      const filtered = current.filter((a) => a.id !== body.id);
      await saveGazetteArticles(filtered);
      return NextResponse.json({ success: true, articles: filtered });
    }

    if (action === "upsert" && body.article) {
      const current = await getGazetteArticles();
      const a = body.article;
      const id = a.id || `custom-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const updatedArticle: GazetteArticle = {
        id,
        articleNumber: a.articleNumber?.trim() || "Article",
        title: a.title?.trim() || a.articleNumber?.trim() || "Traffic Regulation",
        category: a.category || "general",
        language: a.language || "rw",
        decreeRef: a.decreeRef || "Presidential Order No 85/01 / Iteka rya Perezida No 85/01",
        content: a.content?.trim() || "",
        keyTakeaways: Array.isArray(a.keyTakeaways)
          ? a.keyTakeaways.filter(Boolean)
          : typeof a.keyTakeaways === "string"
          ? a.keyTakeaways.split("\n").map((s: string) => s.trim()).filter(Boolean)
          : [],
        updatedAt: new Date().toISOString(),
      };

      const existingIdx = current.findIndex((item) => item.id === id);
      if (existingIdx >= 0) {
        current[existingIdx] = updatedArticle;
      } else {
        current.unshift(updatedArticle);
      }

      await saveGazetteArticles(current);
      return NextResponse.json({ success: true, articles: current });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Error managing gazette articles:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
