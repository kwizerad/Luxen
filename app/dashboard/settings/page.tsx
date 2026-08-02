"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, User, ArrowLeft, LogOut, Menu } from "lucide-react";
import { Label } from "@/components/ui/label";
import UserSettings from "@/components/user-settings";
import { FloatingUserSettings } from "@/components/floating-user-settings";
import { useBrandingConfig } from "@/lib/branding-config";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/language-context";
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

export default function UserSettingsPage() {
  const { config } = useBrandingConfig();
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  const getDisplayName = () => {
    if (user?.user_metadata?.first_name && user?.user_metadata?.last_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
    }
    return user?.user_metadata?.full_name || user?.user_metadata?.username || user?.email || t("user");
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
    if (typeof window === "undefined") return;
    
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
    return null;
  }

  return (
    <div className="bg-transparent flex justify-center">
      {/* Floating Navo Button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Link href="/dashboard" className="premium-glass-panel flex items-center gap-2 rounded-full border p-2 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center overflow-hidden relative">
            {config.logoUrl ? (
              <Image src={config.logoUrl} alt={config.systemName} fill unoptimized className="object-cover" sizes="32px" />
            ) : (
              <span className="text-xs font-bold">{config.logoText || "N"}</span>
            )}
          </div>
          <span className="text-sm font-medium pr-1">{config.systemName}</span>
        </Link>
      </div>
      
      <main className="student-page-narrow student-page-no-nav w-full">
        <div className="student-page-header">
          <div>
            <h1 className="student-page-title">{t("personalSettings")}</h1>
            <p className="student-page-description">{t("updateProfileDesc")}</p>
          </div>
        </div>
        <Card className="rounded-[14px] sm:rounded-[24px]">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <UserSettings
              showPasswordChange={true}
              showUsernameChange={true}
              user={user}
              onUserUpdate={(updatedUser) => setUser(updatedUser)}
            />
          </CardContent>
        </Card>

      </main>
    </div>
  );
}
