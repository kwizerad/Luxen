"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Settings, UserPlus, GraduationCap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ADMIN_EMAIL = "Navo@admin.jn";

export default function AdminDashboard() {
  const [studentCount, setStudentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPrimaryAdmin, setIsPrimaryAdmin] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setIsPrimaryAdmin(user.email === ADMIN_EMAIL);
      }
      
      // Get student count from user metadata
      const { data: users } = await supabase.auth.admin.listUsers();
      const students = users?.users?.filter(u => u.user_metadata?.role === "Student") || [];
      setStudentCount(students.length);
      
      setLoading(false);
    };
    
    loadData();
  }, []);

  const stats = [
    { 
      title: "Total Students", 
      value: loading ? "..." : studentCount.toString(), 
      icon: GraduationCap,
      href: "/Admin/students"
    },
    { 
      title: "Manage Settings", 
      value: "Update", 
      icon: Settings,
      href: "/Admin/settings"
    },
    ...(isPrimaryAdmin ? [{
      title: "Register Admin", 
      value: "New", 
      icon: UserPlus,
      href: "/Admin/register"
    }] : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Manage your platform from here.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--primary)/0.3)] hover:-translate-y-1 hover:border-[var(--hover-border-color)] transition-all duration-300 cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--primary)/0.3)] hover:-translate-y-1 hover:border-[var(--hover-border-color)] transition-all duration-300">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link 
            href="/Admin/students" 
            className="block p-3 rounded-lg hover:bg-secondary transition-colors"
          >
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">View All Students</p>
                <p className="text-sm text-muted-foreground">See and manage student accounts</p>
              </div>
            </div>
          </Link>
          
          <Link 
            href="/Admin/settings" 
            className="block p-3 rounded-lg hover:bg-secondary transition-colors"
          >
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Update Credentials</p>
                <p className="text-sm text-muted-foreground">Change your admin password</p>
              </div>
            </div>
          </Link>
          
          {isPrimaryAdmin && (
            <Link 
              href="/Admin/register" 
              className="block p-3 rounded-lg hover:bg-secondary transition-colors"
            >
              <div className="flex items-center gap-3">
                <UserPlus className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Register New Admin</p>
                  <p className="text-sm text-muted-foreground">Create additional admin accounts</p>
                </div>
              </div>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
