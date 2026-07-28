"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { checkAdminExists, setupAdmin } from "@/lib/supabase/queries";
import { useBrandingConfig } from "@/lib/branding-config";
import { DEFAULT_ADMIN_EMAIL } from "@/lib/server-config";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export default function SetupAdminPage() {
  const { config } = useBrandingConfig();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [adminExists, setAdminExists] = useState(true);
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);
  const router = useRouter();
  const adminEmail = DEFAULT_ADMIN_EMAIL;

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const checkAdmin = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        // If user is logged in, redirect them away
        if (user) {
          router.push("/");
          return;
        }

        // Check if admin already exists
        const data = await checkAdminExists();
        setAdminExists(data.adminExists);
      } catch (error) {
        console.error("Error checking admin:", error);
      } finally {
        setChecking(false);
      }
    };

    checkAdmin();
  }, [router]);

  const createAdmin = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      // Note: Admin creation via client requires proper setup
      // The setupAdmin function uses Supabase Auth signUp
      const data = await setupAdmin(adminEmail, "adminjohn");
      setResult({
        success: true,
        message: "Admin user created successfully. Please check your email to confirm the account."
      });
    } catch (error: any) {
      setResult({ 
        success: false, 
        error: error.message || "Failed to create admin" 
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent p-4">
        <Card className="w-full max-w-md p-8 space-y-4 text-center">
          <Skeleton className="h-6 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3 mx-auto" />
        </Card>
      </div>
    );
  }

  if (adminExists) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive">Access Denied</CardTitle>
            <CardDescription>
              Admin account already exists
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-destructive/10 p-4 rounded-md text-sm text-destructive">
              <p className="font-semibold">Setup is disabled</p>
              <p className="mt-1">The admin account has already been created. This setup page is now locked for security reasons.</p>
            </div>
            <Button 
              onClick={() => router.push("/")} 
              className="w-full"
              variant="outline"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Floating Navo Button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 bg-card/70 backdrop-blur-[20px] border border-border/20 rounded-full shadow-glass dark:shadow-glass-dark p-2">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center overflow-hidden">
            {config.logoUrl ? (
              <img src={config.logoUrl} alt={config.systemName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold">{config.logoText || "N"}</span>
            )}
          </div>
          <span className="text-sm font-medium pr-1">{config.systemName}</span>
        </Link>
      </div>
      
      <div className="min-h-screen flex items-center justify-center bg-transparent p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Setup Admin Account</CardTitle>
            <CardDescription>
              Create the admin user with role metadata
            </CardDescription>
          </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-3 rounded-md text-sm">
            <p><strong>Email:</strong> {adminEmail}</p>
            <p><strong>Password:</strong> adminjohn</p>
            <p><strong>Role:</strong> Admin</p>
          </div>
          
          <Button 
            onClick={createAdmin} 
            disabled={loading}
            className="w-full"
          >
            {loading ? "Creating..." : "Create Admin User"}
          </Button>
          
          {result && (
            <div className={`p-3 rounded-md text-sm ${result.success ? "bg-[rgb(0_101_35/28%)] text-green-800" : "bg-red-100 text-red-800"}`}>
              {result.message || result.error}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </>
  );
}
