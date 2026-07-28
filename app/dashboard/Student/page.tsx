"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Calendar, GraduationCap } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/lib/language-context";
import { ProfileSkeleton } from "@/components/skeletons";

export default function UserDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const loadUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    loadUser();
  }, []);

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.google_avatar_url || user?.user_metadata?.picture;

  const displayName = user?.user_metadata?.first_name && user?.user_metadata?.last_name
    ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
    : user?.user_metadata?.full_name || user?.user_metadata?.username || user?.email || t("user");

  const nationality = user?.user_metadata?.nationality || user?.user_metadata?.country || user?.user_metadata?.locale;
  const birthdate = user?.user_metadata?.birthdate || user?.user_metadata?.date_of_birth || user?.user_metadata?.birthday || user?.user_metadata?.dob;

  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <main className="student-page-narrow">
      <div className="student-page-header sm:items-center sm:justify-start">
        <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-primary/30 shadow-lg shrink-0">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
          <AvatarFallback className="text-base sm:text-lg font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="student-page-title">{t("welcome")}, {displayName}!</h1>
          <p className="student-page-description">{t("userDashboard")}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-6 md:grid-cols-2">
        <Card className="rounded-[14px] sm:rounded-[24px]">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <User className="h-4 w-4 sm:h-5 sm:w-5" />
              {t("profileInformation")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 sm:space-y-4 p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] sm:text-sm text-muted-foreground">{t("email")}</p>
                <p className="font-medium text-xs sm:text-sm truncate">{user?.email}</p>
              </div>
            </div>
            {user?.user_metadata?.first_name && (
              <div className="flex items-center gap-2 sm:gap-3">
                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-sm text-muted-foreground">{t("firstName")}</p>
                  <p className="font-medium text-xs sm:text-sm truncate">{user.user_metadata.first_name}</p>
                </div>
              </div>
            )}
            {user?.user_metadata?.last_name && (
              <div className="flex items-center gap-2 sm:gap-3">
                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-sm text-muted-foreground">{t("lastName")}</p>
                  <p className="font-medium text-xs sm:text-sm truncate">{user.user_metadata.last_name}</p>
                </div>
              </div>
            )}
            {user?.user_metadata?.gender && (
              <div className="flex items-center gap-2 sm:gap-3">
                <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-sm text-muted-foreground">{t("gender")}</p>
                  <p className="font-medium text-xs sm:text-sm capitalize truncate">{user.user_metadata.gender}</p>
                </div>
              </div>
            )}
            {nationality && (
              <div className="flex items-center gap-2 sm:gap-3">
                <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-sm text-muted-foreground">{t("nationality")}</p>
                  <p className="font-medium text-xs sm:text-sm capitalize truncate">{nationality}</p>
                </div>
              </div>
            )}
            {birthdate && (
              <div className="flex items-center gap-2 sm:gap-3">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-sm text-muted-foreground">{t("dateOfBirth")}</p>
                  <p className="font-medium text-xs sm:text-sm truncate">
                    {(() => {
                      const date = new Date(birthdate);
                      return Number.isNaN(date.getTime()) ? birthdate : date.toLocaleDateString();
                    })()}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[14px] sm:rounded-[24px]">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
              {t("accountDetails")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 sm:space-y-4 p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] sm:text-sm text-muted-foreground">{t("memberSince")}</p>
                <p className="font-medium text-xs sm:text-sm truncate">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : t("notAvailable")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] sm:text-sm text-muted-foreground">{t("role")}</p>
                <p className="font-medium text-xs sm:text-sm truncate">{user?.user_metadata?.role || t("user")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
