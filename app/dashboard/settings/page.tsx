"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, User, ArrowLeft, LogOut, Menu } from "lucide-react";
import { Label } from "@/components/ui/label";
import UserSettings from "@/components/user-settings";
import { FloatingUserSettings } from "@/components/floating-user-settings";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { NavAutohideSettings } from "@/components/nav-autohide-settings";
import { useBrandingConfig } from "@/lib/branding-config";
import { Loader2 } from "lucide-react";
import { ProfileSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
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
  const [learningLanguage, setLearningLanguage] = useState<"English" | "French" | "Kinyarwanda" | null>(null);
  const [savingLearningLanguage, setSavingLearningLanguage] = useState(false);
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
      
      const { data: profile } = await supabase.from("user_profiles").select("learning_language").eq("id", user.id).maybeSingle();
      if (profile?.learning_language === "English" || profile?.learning_language === "French" || profile?.learning_language === "Kinyarwanda") {
        setLearningLanguage(profile.learning_language);
      }
      setUser(user);
      setLoading(false);
    };
    
    loadUser();
  }, [router]);

  const updateLearningLanguage = async (language: "English" | "French" | "Kinyarwanda") => {
    const supabase = createClient();
    setSavingLearningLanguage(true);
    const { error } = await supabase.from("user_profiles").update({ learning_language: language }).eq("id", user.id);
    setSavingLearningLanguage(false);
    if (error) {
      toast.error("Unable to update your learning language.");
      return;
    }
    setLearningLanguage(language);
    toast.success("Learning language updated.");
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="bg-transparent flex justify-center">
      {/* Floating Navo Button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Link href="/dashboard" className="premium-glass-panel flex items-center gap-2 rounded-full border p-2 overflow-hidden">
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

        <Card className="mt-6 rounded-[14px] sm:rounded-[24px]">
          <CardHeader>
            <CardTitle>Learning Language</CardTitle>
            <CardDescription>Choose the language of your course, lessons, exams, certificates, and resources. This does not change the interface language.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {(["English", "French", "Kinyarwanda"] as const).map((language) => (
              <Button key={language} type="button" variant={learningLanguage === language ? "default" : "outline"} disabled={savingLearningLanguage} onClick={() => void updateLearningLanguage(language)}>
                {language === "French" ? "Français" : language}
              </Button>
            ))}
          </CardContent>
        </Card>

        <div className="mt-6">
          <NavAutohideSettings />
        </div>
      </main>
      <MobileBottomNav hide />
    </div>
  );
}
