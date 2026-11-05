import { NextRequest, NextResponse } from "next/server";

/**
 * Handles Google Identity Services redirect POST callback.
 * When GIS runs with ux_mode: "redirect", Google POSTs form data with
 * `credential` (the JWT ID token) and `g_csrf_token`.
 *
 * This handler returns a lightweight HTML bootstrap page that exchanges
 * the ID token client-side with Supabase in the SAME tab and routes the user
 * directly to their destination without opening any popups or new tabs.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const credential = formData.get("credential") as string;

    if (!credential) {
      return NextResponse.redirect(new URL("/?error=missing_google_credential", req.url));
    }

    // Safely encode credential for transmission into the client bootstrap page
    const safeCredential = JSON.stringify(credential);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Navo - Authenticating...</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background-color: #060608;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(16, 185, 129, 0.2);
      border-top-color: #10b981;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .text {
      margin-top: 16px;
      font-size: 14px;
      color: #a1a1aa;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <div class="text">Completing direct Navo authentication...</div>

  <script>
    (async function() {
      const token = ${safeCredential};
      try {
        // Store temporarily in sessionStorage so client app can verify
        sessionStorage.setItem("navo_google_pending_token", token);
        window.location.replace("/auth/callback?google_token=1");
      } catch (err) {
        window.location.replace("/?error=auth_failed");
      }
    })();
  </script>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    console.error("[api/auth/google/callback] Error processing POST:", err);
    return NextResponse.redirect(new URL("/?error=google_callback_error", req.url));
  }
}

export async function GET(req: NextRequest) {
  // If navigated via GET, redirect back to home
  return NextResponse.redirect(new URL("/", req.url));
}
