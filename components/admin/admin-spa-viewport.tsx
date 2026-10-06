"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useAdminSpa } from "@/lib/admin-spa-router";
import { ViewTransition } from "@/components/spa-views/view-transition";
import { Loader2, Sparkles, BookOpen, HelpCircle, RotateCcw, BarChart3, Megaphone, Shield, FileCheck } from "lucide-react";

function AdminViewSkeleton({ label }: { label: string }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="admin-card p-10 flex flex-col items-center justify-center gap-4 min-h-[420px]">
        <div className="w-12 h-12 rounded-2xl bg-[var(--admin-accent)]/10 border border-[var(--admin-accent)]/25 flex items-center justify-center text-[var(--admin-accent)]">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-[var(--admin-text)]">Loading {label}...</p>
          <p className="text-xs text-[var(--admin-muted)]">Synchronizing workspace state</p>
        </div>
      </div>
    </div>
  );
}

// Dynamically import every Admin workspace module so all views live inside a unified client-side SPA
const AdminDashboardView = dynamic(() => import("@/app/Admin/page"), {
  loading: () => <AdminViewSkeleton label="Command Center" />,
});

const AdminCourseHubView = dynamic(() => import("@/app/Admin/course/page"), {
  loading: () => <AdminViewSkeleton label="Course Hub" />,
});

const AdminCourseStudioView = dynamic(() => import("@/app/Admin/course-studio/page"), {
  loading: () => <AdminViewSkeleton label="Course Studio" />,
});

const AdminCourseManagementView = dynamic(() => import("@/app/Admin/course-management/page"), {
  loading: () => <AdminViewSkeleton label="Course Curriculum Manager" />,
});

const AdminExamsView = dynamic(() => import("@/app/Admin/exams/page"), {
  loading: () => <AdminViewSkeleton label="Exams & Categories" />,
});

const AdminQuestionsView = dynamic(() => import("@/app/Admin/questions/page"), {
  loading: () => <AdminViewSkeleton label="Question Bank" />,
});

const AdminRetakeRequestsView = dynamic(() => import("@/app/Admin/retake-requests/page"), {
  loading: () => <AdminViewSkeleton label="Retake Approvals" />,
});

const AdminUsersView = dynamic(() => import("@/app/Admin/users/page"), {
  loading: () => <AdminViewSkeleton label="User Management" />,
});

const AdminDriversView = dynamic(() => import("@/app/Admin/drivers/page"), {
  loading: () => <AdminViewSkeleton label="Drivers & Fleet" />,
});

const AdminReportsView = dynamic(() => import("@/app/Admin/reports/page"), {
  loading: () => <AdminViewSkeleton label="Safety & Incident Reports" />,
});

const AdminNotificationsView = dynamic(() => import("@/app/Admin/notifications/page"), {
  loading: () => <AdminViewSkeleton label="Broadcast & Notifications" />,
});

const AdminAuditView = dynamic(() => import("@/app/Admin/audit/page"), {
  loading: () => <AdminViewSkeleton label="Security Audit Trail" />,
});

const AdminSettingsView = dynamic(() => import("@/app/Admin/settings/page"), {
  loading: () => <AdminViewSkeleton label="System Settings" />,
});

export function AdminSpaViewport() {
  const { view, navigateAdmin } = useAdminSpa();

  //Contextual sub-navigation strip for grouped workspaces (Exams / Reports / Course)
  const isExamsGroup = view === "exams" || view === "questions" || view === "retake-requests";
  const isReportsGroup = view === "reports" || view === "notifications" || view === "audit";
  const isCourseSubView = view === "course-studio" || view === "course-management";

  const renderActiveView = () => {
    switch (view) {
      case "dashboard":
        return <AdminDashboardView />;
      case "course":
        return <AdminCourseHubView />;
      case "course-studio":
        return <AdminCourseStudioView />;
      case "course-management":
        return <AdminCourseManagementView />;
      case "exams":
        return <AdminExamsView />;
      case "questions":
        return <AdminQuestionsView />;
      case "retake-requests":
        return <AdminRetakeRequestsView />;
      case "users":
        return <AdminUsersView />;
      case "drivers":
        return <AdminDriversView />;
      case "reports":
        return <AdminReportsView />;
      case "notifications":
        return <AdminNotificationsView />;
      case "audit":
        return <AdminAuditView />;
      case "settings":
        return <AdminSettingsView />;
      default:
        return <AdminDashboardView />;
    }
  };

  return (
    <div className="w-full">
      {/* Contextual Sub-Navigation Bar for grouped workspaces */}
      {isExamsGroup && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="inline-flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-[var(--admin-card-bg)] border border-[var(--admin-border)] backdrop-blur-xl shadow-sm">
            {[
              { id: "exams", href: "/Admin/exams", label: "Categories & Exams", icon: FileCheck },
              { id: "questions", href: "/Admin/questions", label: "Question Bank", icon: HelpCircle },
              { id: "retake-requests", href: "/Admin/retake-requests", label: "Retake Requests", icon: RotateCcw },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = view === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => navigateAdmin(tab.href)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? "bg-[var(--admin-accent)] text-white shadow-sm shadow-[var(--admin-accent)]/25"
                      : "text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-input-bg)]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isReportsGroup && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="inline-flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-[var(--admin-card-bg)] border border-[var(--admin-border)] backdrop-blur-xl shadow-sm">
            {[
              { id: "reports", href: "/Admin/reports", label: "Incident Reports", icon: BarChart3 },
              { id: "notifications", href: "/Admin/notifications", label: "Broadcast & Alerts", icon: Megaphone },
              { id: "audit", href: "/Admin/audit", label: "Security & Login Audit", icon: Shield },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = view === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => navigateAdmin(tab.href)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? "bg-[var(--admin-accent)] text-white shadow-sm shadow-[var(--admin-accent)]/25"
                      : "text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-input-bg)]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isCourseSubView && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="inline-flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-[var(--admin-card-bg)] border border-[var(--admin-border)] backdrop-blur-xl shadow-sm">
            {[
              { id: "course", href: "/Admin/course", label: "Unified Course Hub", icon: Sparkles },
              { id: "course-studio", href: "/Admin/course-studio", label: "Course Studio", icon: Sparkles },
              { id: "course-management", href: "/Admin/course-management", label: "Legacy Curriculum", icon: BookOpen },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = view === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => navigateAdmin(tab.href)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? "bg-[var(--admin-accent)] text-white shadow-sm shadow-[var(--admin-accent)]/25"
                      : "text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-input-bg)]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <ViewTransition viewKey={view}>{renderActiveView()}</ViewTransition>
    </div>
  );
}
