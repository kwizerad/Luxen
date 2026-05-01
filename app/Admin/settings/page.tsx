"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, User, Palette, UserPlus, ImageIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { UserSettings } from "@/components/user-settings";
import { ThemeCustomizer } from "@/components/theme-customizer";
import { BrandingCustomizer } from "@/components/branding-customizer";
import { Loader2 } from "lucide-react";
import { ADMIN_CREDENTIALS } from "@/lib/admin-config";
import Link from "next/link";

export default function AdminSettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        console.log("Admin settings user:", {
          email: user.email,
          expected: ADMIN_CREDENTIALS.email,
          matches: user.email === ADMIN_CREDENTIALS.email,
          role: user.user_metadata?.role,
        });
      }

      setUser(user);
      setLoading(false);
    };

    loadUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <main className="container mx-auto px-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Manage your admin account, brand, and appearance.
            </p>
          </div>
          {user?.email?.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase() && (
            <Button asChild>
              <Link href="/Admin/register">
                <UserPlus className="mr-2 h-4 w-4" />
                Register Admin
              </Link>
            </Button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr] mt-8">
          <div className="space-y-6">
            <Card className="border border-border rounded-[32px] bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
              <CardHeader>
                <CardTitle>Account Overview</CardTitle>
                <CardDescription>Quick access to account details and profile settings.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label className="text-sm text-muted-foreground">Email</Label>
                  <div className="rounded-3xl border border-border bg-secondary p-4 text-sm font-medium">
                    {user?.email || "—"}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm text-muted-foreground">Role</Label>
                  <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
                    {user?.user_metadata?.role || "Admin"}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm text-muted-foreground">Joined</Label>
                  <div className="rounded-3xl border border-border bg-secondary p-4 text-sm">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Unknown"}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border rounded-[32px] bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Update personal settings and account details.</CardDescription>
              </CardHeader>
              <CardContent>
                <UserSettings showPasswordChange={true} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border border-border rounded-[32px] bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
              <CardHeader>
                <CardTitle>Theme Customization</CardTitle>
                <CardDescription>Customize colors and the app appearance.</CardDescription>
              </CardHeader>
              <CardContent>
                <ThemeCustomizer />
              </CardContent>
            </Card>

            <Card className="border border-border rounded-[32px] bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
              <CardHeader>
                <CardTitle>Branding Settings</CardTitle>
                <CardDescription>Update logo, system name, and identity.</CardDescription>
              </CardHeader>
              <CardContent>
                <BrandingCustomizer />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
