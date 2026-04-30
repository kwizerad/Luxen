import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/";
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  // If there's an error from the OAuth provider, redirect to error page
  if (error) {
    console.error("OAuth provider error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(`/auth/error?error=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin)
    );
  }

  const supabase = await createClient();

  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        // Get user to check role for redirect
        const { data: { user } } = await supabase.auth.getUser();
        let role = user?.user_metadata?.role;

        // If no role set (new OAuth user), assign default Student role and store Google profile data
        if (!role && user) {
          const metadata: any = { role: "Student" };
          
          // Extract Google profile data if available
          if (user.user_metadata?.avatar_url) {
            metadata.avatar_url = user.user_metadata.avatar_url;
            metadata.google_avatar_url = user.user_metadata.avatar_url;
          }
          if (user.user_metadata?.full_name) {
            metadata.full_name = user.user_metadata.full_name;
            // Split full name into first and last name
            const nameParts = user.user_metadata.full_name.split(' ');
            metadata.first_name = nameParts[0] || '';
            metadata.last_name = nameParts.slice(1).join(' ') || '';
          }
          if (user.user_metadata?.given_name) {
            metadata.first_name = user.user_metadata.given_name;
          }
          if (user.user_metadata?.family_name) {
            metadata.last_name = user.user_metadata.family_name;
          }
          
          await supabase.auth.updateUser({
            data: metadata
          });
          role = "Student";
        }

        // Redirect based on role
        if (role === "Admin") {
          return NextResponse.redirect(new URL("/Admin", requestUrl.origin));
        } else {
          return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
        }
      } else {
        console.error("Session exchange error:", error);
        return NextResponse.redirect(
          new URL(`/auth/error?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
        );
      }
    } catch (error) {
      console.error("OAuth callback error:", error);
      return NextResponse.redirect(
        new URL("/auth/error?error=OAuth authentication failed", requestUrl.origin)
      );
    }
  }

  // If no code, check if user is already authenticated (Supabase may have handled it)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      let role = user?.user_metadata?.role;

      // If no role set (new OAuth user), assign default Student role and store Google profile data
      if (!role) {
        const metadata: any = { role: "Student" };
        
        // Extract Google profile data if available
        if (user.user_metadata?.avatar_url) {
          metadata.avatar_url = user.user_metadata.avatar_url;
          metadata.google_avatar_url = user.user_metadata.avatar_url;
        }
        if (user.user_metadata?.full_name) {
          metadata.full_name = user.user_metadata.full_name;
          // Split full name into first and last name
          const nameParts = user.user_metadata.full_name.split(' ');
          metadata.first_name = nameParts[0] || '';
          metadata.last_name = nameParts.slice(1).join(' ') || '';
        }
        if (user.user_metadata?.given_name) {
          metadata.first_name = user.user_metadata.given_name;
        }
        if (user.user_metadata?.family_name) {
          metadata.last_name = user.user_metadata.family_name;
        }
        
        await supabase.auth.updateUser({
          data: metadata
        });
        role = "Student";
      }

      if (role === "Admin") {
        return NextResponse.redirect(new URL("/Admin", requestUrl.origin));
      } else {
        return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
      }
    }
  } catch (error) {
    console.error("User check error:", error);
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(
    new URL("/auth/error?error=No authorization code provided", requestUrl.origin)
  );
}
