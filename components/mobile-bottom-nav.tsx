"use client";

import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FileText, Trophy, Settings, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/exam", label: "Exam", icon: FileText },
  { href: "/userExam", label: "Results", icon: Trophy },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

interface MobileBottomNavProps {
  hide?: boolean;
}

export function MobileBottomNav({ hide = false }: MobileBottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  if (hide) return null;

  // Helper to check if a nav item is active (works with nested routes)
  const isNavItemActive = (href: string) => {
    if (href === "/dashboard") {
      // Dashboard is only active on exact match
      return pathname === href;
    }
    // Other routes are active if pathname starts with the href
    return pathname.startsWith(href);
  };

  return (
    <div className="md:hidden fixed bottom-4 left-4 right-4 z-50">
      {/* Glassmorphism container */}
      <div className="bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-lg shadow-black/10 h-14">
        <div className="grid grid-cols-4 h-full">
          {navItems.map((item) => {
            const isActive = isNavItemActive(item.href);
            const Icon = item.icon;
            
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 transition-all duration-200 relative rounded-xl mx-1 my-1",
                  isActive 
                    ? "text-primary bg-primary/15 font-semibold" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
              >
                <div className={cn(
                  "p-1.5 rounded-full transition-all duration-200",
                  isActive && "bg-primary/20"
                )}>
                  <Icon className={cn(
                    "h-4 w-4 transition-all duration-200",
                    isActive && "scale-110"
                  )} />
                </div>
                <span className={cn(
                  "text-[10px] font-medium transition-all duration-200",
                  isActive && "scale-105"
                )}>
                  {item.label}
                </span>
                {/* Active indicator dot */}
                {isActive && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
