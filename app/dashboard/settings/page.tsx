"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, User, ArrowLeft, LogOut, Menu } from "lucide-react";
import { Label } from "@/components/ui/label";
import { UserSettings } from "@/components/user-settings";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function StudentSettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  const getDisplayName = () => {
    if (user?.user_metadata?.first_name && user?.user_metadata?.last_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
    }
    return user?.user_metadata?.full_name || user?.user_metadata?.username || user?.email || "User";
  };

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.google_avatar_url || user?.user_metadata?.picture;

  const getInitials = () => {
    const name = getDisplayName();
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/");
        return;
      }
      
      setUser(user);
      setLoading(false);
    };
    
    loadUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your profile, preferences, and account details.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3 rounded-3xl border border-border bg-secondary/80 px-4 py-3">
              <Avatar className="h-10 w-10">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={getDisplayName()} />}
                <AvatarFallback className="text-sm font-semibold">{getInitials()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{getDisplayName()}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <Card className="border border-border rounded-[32px] shadow-sm hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle>Personal Settings</CardTitle>
                <CardDescription>
                  Update your profile, password, and account preferences in one place.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserSettings 
                  showPasswordChange={true} 
                  showUsernameChange={true}
                  user={user}
                  onUserUpdate={(updatedUser) => setUser(updatedUser)}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border border-border rounded-[32px] shadow-sm hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle>Account Snapshot</CardTitle>
                <CardDescription>Quick view of your profile and access.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-3xl border border-border bg-secondary p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      {avatarUrl && <AvatarImage src={avatarUrl} alt={getDisplayName()} />}
                      <AvatarFallback className="text-lg font-semibold">{getInitials()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-lg font-semibold">{getDisplayName()}</p>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-3">
                  <div className="rounded-3xl border border-border bg-secondary p-4">
                    <p className="text-sm text-muted-foreground">Role</p>
                    <p className="font-semibold">{user?.user_metadata?.role || "Student"}</p>
                  </div>
                  <div className="rounded-3xl border border-border bg-secondary p-4">
                    <p className="text-sm text-muted-foreground">Gender</p>
                    <p className="font-semibold capitalize">{user?.user_metadata?.gender || "Unspecified"}</p>
                  </div>
                  <div className="rounded-3xl border border-border bg-secondary p-4">
                    <p className="text-sm text-muted-foreground">Nationality</p>
                    <p className="font-semibold capitalize">{user?.user_metadata?.nationality || user?.user_metadata?.country || user?.user_metadata?.locale || "Unspecified"}</p>
                  </div>
                  <div className="rounded-3xl border border-border bg-secondary p-4">
                    <p className="text-sm text-muted-foreground">Date of Birth</p>
                    <p className="font-semibold">{user?.user_metadata?.birthdate || user?.user_metadata?.date_of_birth || user?.user_metadata?.birthday || user?.user_metadata?.dob || "Unspecified"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border rounded-[32px] shadow-sm hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle>Need help?</CardTitle>
                <CardDescription>Useful links and support resources.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/dashboard/settings" className="block rounded-2xl border border-border bg-secondary px-4 py-3 text-sm font-medium hover:bg-secondary/90">
                  Update profile settings
                </Link>
                <Link href="/dashboard/exam" className="block rounded-2xl border border-border bg-secondary px-4 py-3 text-sm font-medium hover:bg-secondary/90">
                  View available exams
                </Link>
                <Link href="/dashboard" className="block rounded-2xl border border-border bg-secondary px-4 py-3 text-sm font-medium hover:bg-secondary/90">
                  Back to home
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
