"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, User, ArrowLeft } from "lucide-react";
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

export default function StudentSettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const getDisplayName = () => {
    if (user?.user_metadata?.first_name && user?.user_metadata?.last_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
    }
    return user?.user_metadata?.full_name || user?.user_metadata?.username || user?.email || "User";
  };

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
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-muted-foreground mt-1">
                Manage your preferences and account
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                  <Avatar className="h-8 w-8">
                    {user?.user_metadata?.avatar_url && <AvatarImage src={user?.user_metadata?.avatar_url} alt={getDisplayName()} />}
                    <AvatarFallback className="text-xs font-semibold">{getInitials()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground">
                    {getDisplayName()}
                  </span>
                </div>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Account Information
                  </DialogTitle>
                  <DialogDescription>
                    Your current account details
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="bg-gradient-to-br from-primary/10 to-secondary/50 border-2 border-primary/20 rounded-lg p-6 space-y-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20 border-4 border-primary cursor-pointer" onClick={() => {
                        if (user?.user_metadata?.avatar_url) {
                          window.open(user.user_metadata.avatar_url, '_blank');
                        }
                      }}>
                        {user?.user_metadata?.avatar_url && <AvatarImage src={user?.user_metadata?.avatar_url} alt={getDisplayName()} />}
                        <AvatarFallback className="text-xl font-semibold">{getInitials()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold">{getDisplayName()}</h3>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-primary/20">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Gender</p>
                        <p className="font-medium capitalize">{user?.user_metadata?.gender || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Role</p>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30">
                          {user?.user_metadata?.role || "Student"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              router.push("/");
            }}>Logout</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* User Settings Component - cards in grid layout */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <UserSettings 
              showPasswordChange={true} 
              showUsernameChange={true}
              user={user}
              onUserUpdate={(updatedUser) => setUser(updatedUser)}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
