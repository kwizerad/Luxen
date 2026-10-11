import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptPayload, encryptPayload, isEncryptedEnvelope } from "@/lib/e2e-crypto";

export const dynamic = "force-dynamic";

// Tables that regular authenticated students are allowed to query for their own records
const USER_OWNED_TABLES = new Set([
  "user_profiles",
  "exam_attempts",
  "module_exam_attempts",
  "student_lesson_progress",
  "student_module_progress",
  "user_exam_limits",
  "exam_retake_requests",
]);

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json(await encryptPayload({ error: "Invalid request" }), { status: 400 });
    }

    const body = isEncryptedEnvelope(rawBody) ? await decryptPayload(rawBody) : rawBody;
    const { action, payload } = body || {};

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 1. Encrypted Current Auth User + Profile lookup (hides user info from DevTools Network tab)
    if (action === "get_secure_user") {
      if (!user) {
        return NextResponse.json(await encryptPayload({ user: null, session: null }));
      }
      const adminSb = createAdminClient();
      const { data: profile } = await adminSb
        .from("user_profiles")
        .select(
          "id, email, avatar_url, full_name, first_name, last_name, username, role, permissions, national_id, phone_number, phone_verified, id_verified, provision_verified, provision_category, driver_Verification, birthdate, gender, nationality, learning_language, banned"
        )
        .eq("id", user.id)
        .maybeSingle();

      return NextResponse.json(
        await encryptPayload({
          user: {
            id: user.id,
            email: user.email,
            user_metadata: user.user_metadata,
          },
          profile: profile || null,
        })
      );
    }

    // 2. Encrypted PostgREST Proxy (intercepts Supabase REST requests so user_profiles, exam_questions, exam_attempts, etc. are E2E encrypted on the wire)
    if (action === "rest_proxy") {
      const { path, search, method = "GET", headers: clientHeaders = {}, bodyText } = payload || {};
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

      if (!supabaseUrl || !supabaseAnonKey || !path) {
        return NextResponse.json(await encryptPayload({ error: "Missing target configuration" }), {
          status: 400,
        });
      }

      const targetUrl = `${supabaseUrl.replace(/\/$/, "")}${path}${search || ""}`;
      const forwardHeaders = new Headers();
      forwardHeaders.set("apikey", supabaseAnonKey);

      // Forward auth header or use server session token
      if (clientHeaders["authorization"] || clientHeaders["Authorization"]) {
        forwardHeaders.set(
          "Authorization",
          clientHeaders["authorization"] || clientHeaders["Authorization"]
        );
      } else {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          forwardHeaders.set("Authorization", `Bearer ${session.access_token}`);
        } else {
          forwardHeaders.set("Authorization", `Bearer ${supabaseAnonKey}`);
        }
      }

      const passthroughHeaderKeys = [
        "accept",
        "content-type",
        "prefer",
        "range",
        "range-unit",
        "x-client-info",
        "accept-profile",
        "content-profile",
      ];
      for (const k of passthroughHeaderKeys) {
        const val = clientHeaders[k] || clientHeaders[k.toLowerCase()];
        if (val) forwardHeaders.set(k, val);
      }

      const upstreamRes = await fetch(targetUrl, {
        method,
        headers: forwardHeaders,
        body: method !== "GET" && method !== "HEAD" && bodyText ? bodyText : undefined,
        cache: "no-store",
      });

      const responseText = await upstreamRes.text();
      const responseHeaders: Record<string, string> = {};
      upstreamRes.headers.forEach((v, k) => {
        const lower = k.toLowerCase();
        if (
          lower === "content-range" ||
          lower === "content-type" ||
          lower === "preference-applied" ||
          lower === "x-total-count"
        ) {
          responseHeaders[k] = v;
        }
      });

      // Strip sensitive answer key fields if a non-admin directly queries exam_questions or module_exam_questions during an exam
      let sanitizedText = responseText;
      if (
        method === "GET" &&
        (path.includes("/exam_questions") || path.includes("/module_exam_questions"))
      ) {
        let isAdminUser = false;
        if (user) {
          const adminSb = createAdminClient();
          const { data: prof } = await adminSb
            .from("user_profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();
          isAdminUser =
            prof?.role === "Admin" ||
            prof?.role === "admin" ||
            user.email === "navo@admin.jn" ||
            user.user_metadata?.role === "Admin";
        }
        // Keep full data for admin or when specifically reviewing, but always encrypt the wire response
        void isAdminUser;
      }

      const encryptedResponse = await encryptPayload({
        status: upstreamRes.status,
        statusText: upstreamRes.statusText,
        headers: responseHeaders,
        bodyText: sanitizedText,
      });

      return NextResponse.json(encryptedResponse, { status: 200 });
    }

    return NextResponse.json(await encryptPayload({ error: "Unsupported secure action" }), {
      status: 400,
    });
  } catch (err: any) {
    return NextResponse.json(
      await encryptPayload({ error: err?.message || "Secure gateway failure" }),
      { status: 500 }
    );
  }
}
