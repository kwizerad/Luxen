"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Users, LayoutDashboard,
  FileText, LogOut, BookOpen,
  Settings, Car, Flag,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { canAccess } from "@/lib/permissions";
import { createClient, setAdminSessionFlag } from "@/lib/supabase/client";
import Dock, { type DockItemData } from "@/components/Dock";

interface AdminDockNavProps {
  user: any;
  isPrimaryAdmin: boolean;
}

export function AdminDockNav({ user, isPrimaryAdmin }: AdminDockNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();

  const canViewStudentsTab = canAccess(user, "students");
  const canViewExamsTab = canAccess(user, "exams");
  const canViewSettingsTab = canAccess(user, "settings");
  const canViewCourseManagement = canAccess(user, "courseManagement");
  const canViewCourseStudio = canAccess(user, "courseStudio");
  const canViewCourseTab = canViewCourseManagement || canViewCourseStudio;
  const canViewDriversTab = canAccess(user, "drivers");

  const navItems: { href: string; icon: React.ReactNode; label: string }[] = [
    { href: "/Admin", icon: <LayoutDashboard size={18} />, label: t("dashboard") },
    ...(canViewCourseTab ? [{ href: "/Admin/course", icon: <BookOpen size={18} />, label: t("courseManagementNav") || "Course" }] : []),
    ...(canViewStudentsTab ? [{ href: "/Admin/users", icon: <Users size={18} />, label: t("users") }] : []),
    ...(canViewExamsTab ? [{ href: "/Admin/exams", icon: <FileText size={18} />, label: t("examManagementNav") }] : []),
    ...(canViewDriversTab ? [{ href: "/Admin/drivers", icon: <Car size={18} />, label: t("manageDrivers") }] : []),
    ...(canViewDriversTab ? [{ href: "/Admin/reports", icon: <Flag size={18} />, label: t("manageReports") }] : []),
    ...(canViewSettingsTab ? [{ href: "/Admin/settings", icon: <Settings size={18} />, label: t("settings") }] : []),
  ];

  const isNavItemActive = (href: string) => {
    if (href === "/Admin") return pathname === href;
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    try {
      setAdminSessionFlag(false);
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
    } catch {
      router.push("/");
    }
  };

  const dockItems: DockItemData[] = [
    ...navItems.map((item) => ({
      icon: item.icon,
      label: item.label,
      onClick: () => router.push(item.href),
      className: isNavItemActive(item.href)
        ? "bg-black/10 dark:bg-white/10 text-black dark:text-white border-black/15 dark:border-white/15"
        : "text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white",
    })),
    {
      icon: <LogOut size={18} />,
      label: t("logout"),
      onClick: handleLogout,
      className: "text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white",
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto">
        <Dock
          items={dockItems}
          panelHeight={68}
          baseItemSize={50}
          magnification={70}
        />
      </div>
    </div>
  );
}
