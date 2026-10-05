import { NextRequest, NextResponse, type NextFetchEvent } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { buildDevicePayload } from "@/lib/tracking/server-tracker";
import { isAdmin } from "@/lib/permissions";

/**
 * Edge-optimized visitor device tracking and Admin route guard middleware.
 * Zero-latency impact: uses event.waitUntil for non-blocking telemetry.
 * Safe fallback: guarantees NextResponse.next() is always returned without interrupting user requests.
 */
export async function middleware(request: NextRequest, event?: NextFetchEvent) {
  try {
    const { pathname } = request.nextUrl;

    // Defense-in-depth: skip internal paths, API routes, or static files
    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api/") ||
      pathname.includes(".")
    ) {
      return NextResponse.next();
    }

    // Strict server-side route guard for /Admin (case-insensitive)
    if (pathname.toLowerCase().startsWith("/admin")) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

      if (supabaseUrl && supabaseKey) {
        try {
          const supabase = createServerClient(supabaseUrl, supabaseKey, {
            cookieOptions: {
              name: "navo-auth-token",
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            },
            cookies: {
              getAll() {
                return request.cookies.getAll();
              },
              setAll() {
                // Read-only in guard check
              },
            },
          });

          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (!user) {
            const loginUrl = request.nextUrl.clone();
            loginUrl.pathname = "/";
            return NextResponse.redirect(loginUrl);
          }

          let hasAdminAccess = isAdmin(user as any);
          if (!hasAdminAccess) {
            const { data: profile } = await supabase
              .from("user_profiles")
              .select("role")
              .eq("id", user.id)
              .maybeSingle();
            if (profile?.role && profile.role.toLowerCase() === "admin") {
              hasAdminAccess = true;
            }
          }

          if (!hasAdminAccess) {
            const studentUrl = request.nextUrl.clone();
            studentUrl.pathname = "/dashboard";
            return NextResponse.redirect(studentUrl);
          }
        } catch {
          // If server cookie read fails, client layout guard will still enforce role check
        }
      }
    }

    // Skip router prefetch requests to prevent inflating view analytics
    const isPrefetch =
      request.headers.get("purpose") === "prefetch" ||
      request.headers.get("x-purpose") === "prefetch" ||
      request.headers.get("next-router-prefetch") === "1";

    if (isPrefetch) {
      return NextResponse.next();
    }

    // 1. Build edge device telemetry
    const payload = buildDevicePayload(request);

    // 2. Dispatch non-blocking background DB ingestion
    try {
      const trackingUrl = new URL("/api/analytics/track-device", request.url).toString();
      const cookieHeader = request.headers.get("cookie");

      const trackPromise = fetch(trackingUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-tracking-secret":
            process.env.INTERNAL_ANALYTICS_SECRET || "internal-edge-log",
          ...(cookieHeader ? { cookie: cookieHeader } : {}),
        },
        body: JSON.stringify(payload),
        keepalive: true,
        signal: AbortSignal.timeout(3000),
      }).catch(() => {
        // Silently catch so page rendering is never affected
      });

      if (event && typeof event.waitUntil === "function") {
        event.waitUntil(trackPromise);
      }
    } catch {
      // Non-blocking telemetry dispatch error handled safely
    }

    // 3. Inject telemetry headers for downstream Server Components / Layouts
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-visitor-ip", payload.ip);
    requestHeaders.set("x-visitor-device-type", payload.deviceType);
    if (payload.deviceName) {
      requestHeaders.set("x-visitor-device-name", payload.deviceName);
    }
    if (payload.deviceModel) {
      requestHeaders.set("x-visitor-device-model", payload.deviceModel);
    }
    if (payload.deviceVendor) {
      requestHeaders.set("x-visitor-device-vendor", payload.deviceVendor);
    }
    requestHeaders.set("x-visitor-browser", payload.browser.name);
    requestHeaders.set("x-visitor-os", payload.os.name);
    if (payload.os.version && payload.os.version !== "Unknown") {
      requestHeaders.set("x-visitor-os-version", payload.os.version);
    }
    if (payload.geo?.country) {
      requestHeaders.set("x-visitor-country", payload.geo.country);
    }
    if (payload.geo?.city) {
      requestHeaders.set("x-visitor-city", payload.geo.city);
    }

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    // Request high-entropy Client Hints for accurate model & OS version tracking
    response.headers.set(
      "Accept-CH",
      "Sec-CH-UA-Model, Sec-CH-UA-Platform-Version, Sec-CH-UA-Bitness, Sec-CH-UA-Full-Version-List, Sec-CH-UA-Arch, Sec-CH-UA-Form-Factors"
    );
    response.headers.set(
      "Permissions-Policy",
      "ch-ua-model=(self), ch-ua-platform-version=(self), ch-ua-bitness=(self), ch-ua-full-version-list=(self), ch-ua-arch=(self)"
    );

    return response;
  } catch (err) {
    // Fail-safe: ensure application continues running normally under all conditions
    console.error("[middleware] Safe error recovery:", err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all page navigation requests EXCEPT:
     * - _next/static (static chunks)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, sitemap.xml
     * - api/ routes (prevents duplicate / recursive tracking)
     * - static file extensions (.png, .jpg, .svg, .css, etc.)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|css|js|map)$).*)",
  ],
};
