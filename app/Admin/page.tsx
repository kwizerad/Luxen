"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Settings, UserPlus, GraduationCap, FileText, Activity, CheckCircle, AlertCircle, TrendingUp, Clock, Database, Zap, BookOpen } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { getAdminStats } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/client";
import { useBrandingConfig } from "@/lib/branding-config";
import { DEFAULT_ADMIN_EMAIL } from "@/lib/server-config";
import { useLanguage } from "@/lib/language-context";

const ADMIN_EMAIL = DEFAULT_ADMIN_EMAIL;

interface DashboardStats {
  totalUsers?: number;
  totalAdmins?: number;
  totalCategories: number;
  totalQuestions: number;
  totalAttempts?: number;
}

interface RecentActivity {
  categories: any[];
  questions: any[];
  users?: any[];
}

interface SystemStatus {
  database: string;
  supabase: string;
  lastUpdated: string;
}

export default function AdminDashboard() {
  const { config } = useBrandingConfig();
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPrimaryAdmin, setIsPrimaryAdmin] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const loadData = async () => {
      try {
        // Get current user and dashboard stats in parallel
        const supabase = createClient();
        const [userResult, data] = await Promise.all([
          supabase.auth.getUser(),
          getAdminStats()
        ]);
        
        if (userResult.data.user) {
          setIsPrimaryAdmin(userResult.data.user.email === ADMIN_EMAIL);
        }
        
        if (data.stats) setStats(data.stats);
        if (data.recentActivity) setRecentActivity(data.recentActivity);
        if (data.systemStatus) setSystemStatus(data.systemStatus);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const statCards = [
    { 
      title: t("totalUsers"), 
      value: loading ? "..." : (stats?.totalUsers?.toString() ?? t("notAvailable")), 
      icon: GraduationCap,
      href: "/Admin/users",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      trend: "+12%",
    },
    { 
      title: t("examCategories"), 
      value: loading ? "..." : (stats?.totalCategories?.toString() ?? "0"), 
      icon: FileText,
      href: "/Admin/exams",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      trend: "+5%",
    },
    { 
      title: t("totalQuestions"), 
      value: loading ? "..." : (stats?.totalQuestions?.toString() ?? "0"), 
      icon: Activity,
      href: "/Admin/questions",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      trend: "+23%",
    },
    { 
      title: t("totalAttempts"), 
      value: loading ? "..." : (stats?.totalAttempts?.toString() ?? "0"), 
      icon: Users,
      href: "/Admin/exams",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      trend: t("stable"),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Floating Navo Button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 bg-card/70 backdrop-blur-[20px] border border-border/20 rounded-full shadow-glass dark:shadow-glass-dark p-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-[#3B82F6] text-primary-foreground flex items-center justify-center overflow-hidden shadow-md shadow-primary/25">
            {config.logoUrl ? (
              <img src={config.logoUrl} alt={config.systemName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold">{config.logoText || "N"}</span>
            )}
          </div>
          <span className="text-sm font-medium pr-1">{config.systemName}</span>
        </Link>
      </div>
      
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t("adminDashboard")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("welcomeBackAdmin")}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--primary)/0.3)] hover:-translate-y-1 hover:border-[var(--hover-border-color)] transition-all duration-300 cursor-pointer group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    {stat.trend} {t("fromLastMonth")}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity Feed */}
        <Card className="hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--primary)/0.3)] hover:border-[var(--hover-border-color)] transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t("recentActivity")}
            </CardTitle>
            <CardDescription>{t("latestEvents")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity?.categories?.slice(0, 3).map((category: any) => (
              <div key={category.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <div className="p-2 rounded-full bg-purple-500/10">
                  <FileText className="h-4 w-4 text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{t("newCategory")}</p>
                  <p className="text-xs text-muted-foreground truncate">{category.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(category.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {recentActivity?.questions?.slice(0, 3).map((question: any) => (
              <div key={question.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <div className="p-2 rounded-full bg-green-500/10">
                  <Activity className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{t("newQuestion")}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {question.question || t("imageQuestion")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(question.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {recentActivity?.users?.slice(0, 2).map((user: any) => (
              <div key={user.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <div className="p-2 rounded-full bg-blue-500/10">
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{t("newUser")}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.username || user.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--primary)/0.3)] hover:border-[var(--hover-border-color)] transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              {t("systemStatus")}
            </CardTitle>
            <CardDescription>{t("platformHealth")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t("database")}</p>
                  <p className="text-sm text-muted-foreground">{t("supabaseConnection")}</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                <CheckCircle className="h-3 w-3 mr-1" />
                {systemStatus?.database || t("healthy")}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t("apiService")}</p>
                  <p className="text-sm text-muted-foreground">{t("backendStatus")}</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                <CheckCircle className="h-3 w-3 mr-1" />
                {systemStatus?.supabase || t("connected")}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t("lastUpdated")}</p>
                  <p className="text-sm text-muted-foreground">{t("dataRefreshTime")}</p>
                </div>
              </div>
              <p className="text-sm font-medium">
                {systemStatus?.lastUpdated 
                  ? new Date(systemStatus.lastUpdated).toLocaleTimeString() 
                  : t("justNow")}
              </p>
            </div>

            <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-500">{t("systemTip")}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("systemTipMessage")}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Quick Actions */}
      <Card className="hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--primary)/0.3)] hover:border-[var(--hover-border-color)] transition-all duration-300">
        <CardHeader>
          <CardTitle>{t("quickActions")}</CardTitle>
          <CardDescription>{t("commonAdminTasks")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link 
              href="/Admin/users" 
              className="group p-4 rounded-lg border border-border hover:bg-secondary hover:border-primary/50 transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">{t("manageUsers")}</p>
                  <p className="text-sm text-muted-foreground">{t("viewManageAccounts")}</p>
                </div>
              </div>
            </Link>
            
            <Link 
              href="/Admin/exams" 
              className="group p-4 rounded-lg border border-border hover:bg-secondary hover:border-primary/50 transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                  <FileText className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="font-medium">{t("manageExams")}</p>
                  <p className="text-sm text-muted-foreground">{t("createExamCategories")}</p>
                </div>
              </div>
            </Link>
            
            <Link
              href="/Admin/questions"
              className="group p-4 rounded-lg border border-border hover:bg-secondary hover:border-primary/50 transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                  <Activity className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium">{t("manageQuestions")}</p>
                  <p className="text-sm text-muted-foreground">{t("addEditQuestions")}</p>
                </div>
              </div>
            </Link>

            <Link
              href="/Admin/course-management"
              className="group p-4 rounded-lg border border-border hover:bg-secondary hover:border-primary/50 transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-500/10 group-hover:bg-teal-500/20 transition-colors">
                  <BookOpen className="h-5 w-5 text-teal-500" />
                </div>
                <div>
                  <p className="font-medium">{t("courseManagementNav")}</p>
                  <p className="text-sm text-muted-foreground">{t("admin.courseManagement.description")}</p>
                </div>
              </div>
            </Link>

            <Link
              href="/Admin/settings" 
              className="group p-4 rounded-lg border border-border hover:bg-secondary hover:border-primary/50 transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                  <Settings className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-medium">{t("settings")}</p>
                  <p className="text-sm text-muted-foreground">{t("updateCredentials")}</p>
                </div>
              </div>
            </Link>
            
            {isPrimaryAdmin && (
              <Link 
                href="/Admin/register" 
                className="group p-4 rounded-lg border border-border hover:bg-secondary hover:border-primary/50 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-pink-500/10 group-hover:bg-pink-500/20 transition-colors">
                    <UserPlus className="h-5 w-5 text-pink-500" />
                  </div>
                  <div>
                    <p className="font-medium">{t("registerAdmin")}</p>
                    <p className="text-sm text-muted-foreground">{t("createAdminAccounts")}</p>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
