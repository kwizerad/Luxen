"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isPrimaryAdmin } from "@/lib/permissions";
import { useBrandingConfig } from "@/lib/branding-config";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, FileText, Settings } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);
  const sidebarHideTimeout = useRef<NodeJS.Timeout | null>(null);
  const { config } = useBrandingConfig();

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

      if (isPrimaryAdmin(user)) {
        router.push("/Admin");
        return;
      }

      setUserEmail(user.email ?? null);
      setLoading(false);
    };
    check();
  }, [router]);

  useEffect(() => {
    if (!isHoveringSidebar) {
      if (sidebarHideTimeout.current) {
        clearTimeout(sidebarHideTimeout.current);
      }

      sidebarHideTimeout.current = setTimeout(() => {
        setSidebarOpen(false);
      }, 300);
    } else {
      if (sidebarHideTimeout.current) {
        clearTimeout(sidebarHideTimeout.current);
      }
    }

    return () => {
      if (sidebarHideTimeout.current) {
        clearTimeout(sidebarHideTimeout.current);
      }
    };
  }, [isHoveringSidebar]);

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
      <aside
        className={`hidden md:flex flex-col border-r border-border bg-card transition-all duration-300 sticky top-0 h-screen overflow-hidden ${sidebarOpen ? "w-64" : "w-20"}`}
        onMouseEnter={() => {
          setIsHoveringSidebar(true);
          setSidebarOpen(true);
        }}
        onMouseLeave={() => setIsHoveringSidebar(false)}
      >
        <div className="w-full h-full p-4 flex flex-col gap-4 overflow-hidden">
          <div className="flex flex-col gap-3">
            <Link href="/dashboard" className="flex items-center gap-3 text-foreground hover:opacity-90 transition-opacity">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center overflow-hidden">
                {config.logoUrl ? (
                  <img src={config.logoUrl} alt={config.systemName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold">{config.logoText || "N"}</span>
                )}
              </div>
              <div className={`min-w-0 ${sidebarOpen ? "block" : "hidden"}`}>
                <p className="text-sm font-bold truncate">{config.systemName}</p>
                <p className="text-xs text-muted-foreground">User Dashboard</p>
              </div>
            </Link>
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
                  <span className={`${sidebarOpen ? "text-sm font-medium" : "sr-only"}`}>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto" />
        </div>
      </aside>

      <div className="flex-1 min-w-0 overflow-auto">
        <header className="md:hidden border-b border-border bg-card">
          <div className="p-3 flex items-center justify-between gap-3">
            <Link href="/dashboard" className="flex items-center gap-3 text-foreground hover:opacity-90 transition-opacity">
              <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center overflow-hidden">
                {config.logoUrl ? (
                  <img src={config.logoUrl} alt={config.systemName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold">{config.logoText || "N"}</span>
                )}
              </div>
              <span className="font-semibold text-base truncate">{config.systemName}</span>
            </Link>
          </div>
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

