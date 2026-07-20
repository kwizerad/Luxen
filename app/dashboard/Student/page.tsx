"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Calendar, GraduationCap } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/lib/language-context";

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
    return (
      <div className="container mx-auto px-4 py-8">
        <p>{t("loading")}</p>
      </div>
    );
  }

  return (
    <main className="student-page-narrow">
      <div className="student-page-header sm:items-center sm:justify-start">
        <Avatar className="h-20 w-20 border-2 border-primary/30 shadow-lg">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
          <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="student-page-title">{t("welcome")}, {displayName}!</h1>
          <p className="student-page-description">{t("userDashboard")}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("profileInformation")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t("email")}</p>
                <p className="font-medium">{user?.email}</p>
              </div>
            </div>
            {user?.user_metadata?.first_name && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">{t("firstName")}</p>
                  <p className="font-medium">{user.user_metadata.first_name}</p>
                </div>
              </div>
            )}
            {user?.user_metadata?.last_name && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">{t("lastName")}</p>
                  <p className="font-medium">{user.user_metadata.last_name}</p>
                </div>
              </div>
            )}
            {user?.user_metadata?.gender && (
              <div className="flex items-center gap-3">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">{t("gender")}</p>
                  <p className="font-medium capitalize">{user.user_metadata.gender}</p>
                </div>
              </div>
            )}
            {nationality && (
              <div className="flex items-center gap-3">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">{t("nationality")}</p>
                  <p className="font-medium capitalize">{nationality}</p>
                </div>
              </div>
            )}
            {birthdate && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">{t("dateOfBirth")}</p>
                  <p className="font-medium">
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t("accountDetails")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t("memberSince")}</p>
                <p className="font-medium">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : t("notAvailable")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t("role")}</p>
                <p className="font-medium">{user?.user_metadata?.role || t("user")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
