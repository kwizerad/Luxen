"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SetupAdminPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

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
            <div className={`p-3 rounded-md text-sm ${result.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              {result.message || result.error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
