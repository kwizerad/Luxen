"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SetupAdminPage() {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [adminExists, setAdminExists] = useState(true);
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        // If user is logged in, redirect them away
        if (user) {
          router.push("/");
          return;
        }

        // Check if admin already exists via API
        const response = await fetch("/api/setup-admin/check", { method: "GET" });
        const data = await response.json();
        
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
      const response = await fetch("/api/setup-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to create admin" 
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Checking system status...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (adminExists) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Setup Admin Account</CardTitle>
          <CardDescription>
            Create the admin user with role metadata
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-3 rounded-md text-sm">
            <p><strong>Email:</strong> Navo@admin.jn</p>
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
  );
}
