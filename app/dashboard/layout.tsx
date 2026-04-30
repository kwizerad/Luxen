"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, FileText, Settings, LogOut } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }
      setUserEmail(user.email ?? null);
      setLoading(false);
    };
    check();
  }, [router]);

  const navItems = useMemo(() => ([
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/exam", label: "Take Exam", icon: FileText },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ]), []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-64 border-r border-border bg-card">
        <div className="w-full p-4 flex flex-col gap-4">
          <div>
            <div className="text-lg font-bold">User Panel</div>
            <div className="text-xs text-muted-foreground truncate">{userEmail}</div>
          </div>

          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                    active ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto">
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                const supabase = createClient();
                await supabase.auth.signOut();
                router.push("/");
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="md:hidden border-b border-border bg-card">
          <div className="p-3 flex items-center gap-2 overflow-x-auto">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap",
                    active ? "bg-primary text-primary-foreground" : "bg-secondary",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </header>

        <div className="p-4 md:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

