"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus, Shield, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

const PRIMARY_ADMIN_EMAIL = "Navo@admin.jn";

export default function RegisterAdminPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminUsername, setNewAdminUsername] = useState("");
  
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      // Only the primary admin can access this page
      if (user?.email === PRIMARY_ADMIN_EMAIL) {
        setIsAuthorized(true);
      }
      
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  const handleRegisterAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    
    if (newAdminPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters" });
      return;
    }
    
    setRegistering(true);
    
    try {
      const response = await fetch("/api/admin/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newAdminEmail,
          password: newAdminPassword,
          username: newAdminUsername,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: "success", text: "Admin user created successfully!" });
        setNewAdminEmail("");
        setNewAdminPassword("");
        setNewAdminUsername("");
      } else {
        setMessage({ type: "error", text: data.error || "Failed to create admin" });
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to create admin" });
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground mt-1">
            You do not have permission to access this page
          </p>
        </div>
        
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-red-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800">Unauthorized</h3>
                <p className="text-red-600 mt-1">
                  Only the primary administrator (<strong>{PRIMARY_ADMIN_EMAIL}</strong>) can register new admin accounts.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <UserPlus className="h-8 w-8" />
          Register New Admin
        </h1>
        <p className="text-muted-foreground mt-1">
          Create a new administrator account
        </p>
      </div>

      <Card className="border-purple-200">
        <CardHeader className="bg-purple-50">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-purple-800">Privileged Access</CardTitle>
          </div>
          <CardDescription className="text-purple-600">
            You are authorized to create new admin accounts as the primary administrator.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New Admin Details</CardTitle>
          <CardDescription>
            Enter the details for the new administrator
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegisterAdmin} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="admin@example.com"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={newAdminUsername}
                onChange={(e) => setNewAdminUsername(e.target.value)}
                placeholder="AdminName"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                placeholder="Enter secure password"
                required
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 6 characters
              </p>
            </div>
            
            {message && (
              <div className={`p-3 rounded-md text-sm ${
                message.type === "success" 
                  ? "bg-green-100 text-green-800" 
                  : "bg-red-100 text-red-800"
              }`}>
                {message.text}
              </div>
            )}
            
            <Button type="submit" disabled={registering} className="w-full">
              {registering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Admin...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Admin Account
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
