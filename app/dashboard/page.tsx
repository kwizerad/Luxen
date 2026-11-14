"use client";

export const dynamic = "force-dynamic";

import { useHashRouter } from "@/hooks/use-hash-router";
import { useLanguage } from "@/lib/language-context";
import { ViewTransition } from "@/components/spa-views/view-transition";
import { OSDesktopView } from "@/components/os/os-desktop-view";
import { OSWindow } from "@/components/os/os-window";
import { OSContextMenu } from "@/components/os/os-context-menu";
import {
  BookOpen,
  FileText,
  Compass,
  Car,
  Users,
  BarChart3,
  Settings,
  Trophy,
} from "lucide-react";

import nextDynamic from "next/dynamic";
import { DashboardViewSkeleton } from "@/components/skeletons";
import { ExamView } from "@/components/spa-views/exam-view";
const CourseView = nextDynamic(() => import("@/components/spa-views/course-view").then(m => m.CourseView), { loading: () => <DashboardViewSkeleton /> });
const ServicesView = nextDynamic(() => import("@/components/spa-views/services-view").then(m => m.ServicesView), { loading: () => <DashboardViewSkeleton /> });
const LiveExamView = nextDynamic(() => import("@/components/spa-views/live-exam-view").then(m => m.LiveExamView), { loading: () => <DashboardViewSkeleton /> });
const SettingsView = nextDynamic(() => import("@/components/spa-views/settings-view").then(m => m.SettingsView), { loading: () => <DashboardViewSkeleton /> });
const RequestCodeView = nextDynamic(() => import("@/components/spa-views/request-code-view").then(m => m.RequestCodeView), { loading: () => <DashboardViewSkeleton /> });
const ExamHistoryView = nextDynamic(() => import("@/components/spa-views/exam-history-view").then(m => m.ExamHistoryView), { loading: () => <DashboardViewSkeleton /> });
const MyReportsView = nextDynamic(() => import("@/components/spa-views/my-reports-view").then(m => m.MyReportsView), { loading: () => <DashboardViewSkeleton /> });
const ClassmatesView = nextDynamic(() => import("@/components/spa-views/classmates-view").then(m => m.ClassmatesView), { loading: () => <DashboardViewSkeleton /> });
const GroupExamResultsView = nextDynamic(() => import("@/components/group-exam-results-view").then(m => m.GroupExamResultsView), { loading: () => <DashboardViewSkeleton /> });
const GroupExamView = nextDynamic(() => import("@/components/spa-views/group-exam-view").then(m => m.GroupExamView), { loading: () => <DashboardViewSkeleton /> });
const ChatListView = nextDynamic(() => import("@/components/spa-views/chat-list-view").then(m => m.ChatListView), { loading: () => <DashboardViewSkeleton /> });
const ChatConversationView = nextDynamic(() => import("@/components/spa-views/chat-conversation-view").then(m => m.ChatConversationView), { loading: () => <DashboardViewSkeleton /> });

export default function DashboardPage() {
  const { view, params, navigate } = useHashRouter();
  const { language } = useLanguage();
  const isRw = language === "Kinyarwanda" || language === "rw";
  const isFr = language === "French" || language === "fr";
  const loc = (rw: string, fr: string, en: string) => (isRw ? rw : isFr ? fr : en);

  const renderView = () => {
    switch (view) {
      case "home":
        return <OSDesktopView navigate={navigate} onOpenSpotlight={() => {}} />;

      case "exam":
      case "exams":
        return (
          <OSWindow
            title={loc("Ikigo cy'Ibizamini", "Centre d'Examen", "Exam Center")}
            subtitle={loc("Ibizamini by'Imyitozo Gifite Igihe", "Examens pratiques chronométrés", "Official Timed Practice & Quizzes")}
            icon={FileText}
            onMinimize={() => navigate("home")}
            onClose={() => {
              if (typeof window !== "undefined") {
                sessionStorage.removeItem("exam-active");
                window.dispatchEvent(new CustomEvent("exam-state-change"));
              }
              navigate("home");
            }}
          >
            <ExamView navigate={navigate} params={params} />
          </OSWindow>
        );

      case "course":
        return (
          <OSWindow
            title={loc("Amasomo", "Cours", "Courses")}
            subtitle={loc("Integanyanyigisho y'Amategeko y'Umuhanda", "Programme du Code de la route", "Rwanda Highway Code Curriculum")}
            icon={BookOpen}
            onMinimize={() => navigate("home")}
            onClose={() => navigate("home")}
          >
            <CourseView navigate={navigate} params={params} />
          </OSWindow>
        );

      case "services":
        return (
          <OSWindow
            title={loc("Serivisi z'Imyitozo", "Services de Conduite", "Driving Services")}
            subtitle={loc("Urutonde rwa Serivisi n'Isuzuma", "Annuaire & Examens officiels", "Hub Directory & Testing")}
            icon={Compass}
            onMinimize={() => navigate("home")}
            onClose={() => navigate("home")}
          >
            <ServicesView navigate={navigate} />
          </OSWindow>
        );

      case "services/live-exam":
        return (
          <OSWindow
            title={loc("Gusuzuma Amanota y'Ikizamini Cyemewe", "Résultats des Examens Officiels", "Official Exams Results Review")}
            subtitle={loc("Reba amanota y'ibizamini byemewe", "Consulter vos notes officielles", "Used to Review Marks from Official Exams")}
            icon={Car}
            onMinimize={() => navigate("services")}
            onClose={() => navigate("services")}
          >
            <LiveExamView navigate={navigate} />
          </OSWindow>
        );

      case "services/group-exam":
        return (
          <OSWindow
            title={loc("Ikizamini cy'Itsinda", "Session d'Examen en Groupe", "Group Exam Session")}
            subtitle={loc("Irushanwa ry'Abanyeshuri", "Défi multijoueur", "Multiplayer Challenge")}
            icon={Users}
            onMinimize={() => navigate("services")}
            onClose={() => navigate("services")}
          >
            <GroupExamView navigate={navigate} />
          </OSWindow>
        );

      case "services/request-code":
        return (
          <OSWindow
            title={loc("Saba Kode y'Ikizamini", "Demander un Code d'Examen", "Request Exam Code")}
            subtitle={loc("Kode yo Kwinjira", "Code d'accès", "Access Voucher")}
            icon={FileText}
            onMinimize={() => navigate("exams")}
            onClose={() => navigate("exams")}
          >
            <RequestCodeView navigate={navigate} />
          </OSWindow>
        );

      case "results":
        return (
          <OSWindow
            title={loc("Imitsindire n'Isesengura", "Analyses de Performance", "Performance Analytics")}
            subtitle={loc("Amateka y'Ibizamini n'Amanota", "Relevés d'examens & Progression", "Exam Transcripts & Progress Logs")}
            icon={Trophy}
            onMinimize={() => navigate("home")}
            onClose={() => navigate("home")}
          >
            <ExamHistoryView navigate={navigate} />
          </OSWindow>
        );

      case "my-reports":
        return (
          <OSWindow
            title={loc("Raporo Zanjye", "Mes Rapports", "My Reports")}
            subtitle={loc("Raporo z'Ibikorwa bya Buri Cyumweru", "Rapports d'activité hebdomadaires", "Weekly Activity Reports")}
            icon={BarChart3}
            onMinimize={() => navigate("home")}
            onClose={() => navigate("home")}
          >
            <MyReportsView navigate={navigate} />
          </OSWindow>
        );

      case "chat":
        return (
          <OSWindow
            title={loc("Ubutumwa", "Messages", "Messages")}
            subtitle={loc("Ibiganiro n'Abandi n'Amatsinda", "Discussions privées & de groupe", "Direct & Group Chats")}
            icon={Users}
            onMinimize={() => navigate("home")}
            onClose={() => navigate("home")}
          >
            <ChatListView navigate={navigate} />
          </OSWindow>
        );

      case "chat/conversation":
        return (
          <OSWindow
            title={loc("Ikiganiro Kiri Gukora", "Conversation Active", "Active Chat Conversation")}
            subtitle={loc("Ibiganiro by'Abanyeshuri", "Discussion entre camarades", "Peer Discussion")}
            icon={Users}
            onMinimize={() => navigate("chat")}
            onClose={() => navigate("chat")}
          >
            <ChatConversationView navigate={navigate} params={params} />
          </OSWindow>
        );

      case "classmates":
        return (
          <OSWindow
            title={loc("Abo Mwigana n'Inshuti", "Réseau des Camarades", "Classmates Network")}
            subtitle={loc("Amatsinda yo Kwiga & Urutonde", "Cercles d'étude & Classements", "Study Circles & Leaderboards")}
            icon={Users}
            onMinimize={() => navigate("home")}
            onClose={() => navigate("home")}
          >
            <ClassmatesView navigate={navigate} />
          </OSWindow>
        );

      case "classmates/group-results":
        return (
          <OSWindow
            title={loc("Ibisubizo by'Ikizamini cy'Itsinda", "Résultats de Groupe", "Group Exam Results")}
            subtitle={loc("Imyanya n'Urutonde rw'Abatsinze", "Podium & Classement", "Podium & Standings")}
            icon={Trophy}
            onMinimize={() => navigate("classmates")}
            onClose={() => navigate("classmates")}
          >
            <GroupExamResultsView navigate={navigate} params={params} />
          </OSWindow>
        );

      case "settings":
        return (
          <OSWindow
            title={loc("Igenamiterere rya Sisitemu", "Préférences Système", "System Preferences")}
            subtitle={loc("Imigaragarire, Ururimi & Ibanga", "Affichage, Langue & Confidentialité", "Display, Language & Privacy")}
            icon={Settings}
            onMinimize={() => navigate("home")}
            onClose={() => navigate("home")}
          >
            <SettingsView navigate={navigate} />
          </OSWindow>
        );

      default:
        return <OSDesktopView navigate={navigate} onOpenSpotlight={() => {}} />;
    }
  };

  return (
    <OSContextMenu navigate={navigate} onOpenSpotlight={() => {}}>
      <ViewTransition viewKey={view}>
        {renderView()}
      </ViewTransition>
    </OSContextMenu>
  );
}
