"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Settings, UserPlus, GraduationCap, FileText, Activity, CheckCircle, AlertCircle, TrendingUp, Clock, Database, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Badge } from "@/components/ui/badge";

const ADMIN_EMAIL = "Navo@admin.jn";

interface DashboardStats {
  totalUsers: number;
  totalAdmins: number;
  totalCategories: number;
  totalQuestions: number;
}

interface RecentActivity {
  categories: any[];
  questions: any[];
  users: any[];
}

interface UserGrowthData {
  date: string;
  count: number;
}

interface SystemStatus {
  database: string;
  supabase: string;
  lastUpdated: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity | null>(null);
  const [userGrowth, setUserGrowth] = useState<UserGrowthData[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPrimaryAdmin, setIsPrimaryAdmin] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setIsPrimaryAdmin(user.email === ADMIN_EMAIL);
      }
      
      // Fetch dashboard stats from API
      try {
        const res = await fetch("/api/admin/stats");
        const data = await res.json();
        
        if (data.stats) setStats(data.stats);
        if (data.recentActivity) setRecentActivity(data.recentActivity);
        if (data.userGrowth) setUserGrowth(data.userGrowth);
        if (data.systemStatus) setSystemStatus(data.systemStatus);
      } catch (error) {
        console.error("Failed to load dashboard stats:", error);
      }
      
      setLoading(false);
    };
    
    loadData();
  }, []);

  const statCards = [
    { 
      title: "Total Users", 
      value: loading ? "..." : stats?.totalUsers.toString() || "0", 
      icon: GraduationCap,
      href: "/Admin/users",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      trend: "+12%",
    },
    { 
      title: "Exam Categories", 
      value: loading ? "..." : stats?.totalCategories.toString() || "0", 
      icon: FileText,
      href: "/Admin/exams",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      trend: "+5%",
    },
    { 
      title: "Total Questions", 
      value: loading ? "..." : stats?.totalQuestions.toString() || "0", 
      icon: Activity,
      href: "/Admin/questions",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      trend: "+23%",
    },
    { 
      title: "Admin Users", 
      value: loading ? "..." : stats?.totalAdmins.toString() || "0", 
      icon: Users,
      href: "/Admin/users",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      trend: "Stable",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Manage your platform from here.
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
                    {stat.trend} from last month
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* User Growth Chart */}
      <Card className="hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--primary)/0.3)] hover:border-[var(--hover-border-color)] transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            User Growth Trend
          </CardTitle>
          <CardDescription>Number of users registered over the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={userGrowth}>
                <defs>
                  <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs text-muted-foreground"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs text-muted-foreground"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorGrowth)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity Feed */}
        <Card className="hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--primary)/0.3)] hover:border-[var(--hover-border-color)] transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest events across the platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity?.categories?.slice(0, 3).map((category: any) => (
              <div key={category.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <div className="p-2 rounded-full bg-purple-500/10">
                  <FileText className="h-4 w-4 text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">New Category Created</p>
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
                  <p className="font-medium text-sm">New Question Added</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {question.question || "Image question"}
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
                  <p className="font-medium text-sm">New User Registered</p>
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
              System Status
            </CardTitle>
            <CardDescription>Platform health and connectivity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Database</p>
                  <p className="text-sm text-muted-foreground">Supabase Connection</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                <CheckCircle className="h-3 w-3 mr-1" />
                {systemStatus?.database || "Healthy"}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">API Service</p>
                  <p className="text-sm text-muted-foreground">Backend Status</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                <CheckCircle className="h-3 w-3 mr-1" />
                {systemStatus?.supabase || "Connected"}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Last Updated</p>
                  <p className="text-sm text-muted-foreground">Data refresh time</p>
                </div>
              </div>
              <p className="text-sm font-medium">
                {systemStatus?.lastUpdated 
                  ? new Date(systemStatus.lastUpdated).toLocaleTimeString() 
                  : "Just now"}
              </p>
            </div>

            <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-500">System Tip</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Regularly review user activity and update exam questions to maintain platform quality.
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
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks and operations</CardDescription>
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
                  <p className="font-medium">Manage Users</p>
                  <p className="text-sm text-muted-foreground">View and manage accounts</p>
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
                  <p className="font-medium">Manage Exams</p>
                  <p className="text-sm text-muted-foreground">Create exam categories</p>
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
                  <p className="font-medium">Manage Questions</p>
                  <p className="text-sm text-muted-foreground">Add and edit questions</p>
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
                  <p className="font-medium">Settings</p>
                  <p className="text-sm text-muted-foreground">Update credentials</p>
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
                    <p className="font-medium">Register Admin</p>
                    <p className="text-sm text-muted-foreground">Create admin accounts</p>
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
