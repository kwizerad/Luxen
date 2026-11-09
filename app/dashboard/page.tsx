"use client";

export const dynamic = "force-dynamic";

import { useHashRouter } from "@/hooks/use-hash-router";
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
const DriversListView = nextDynamic(() => import("@/components/spa-views/drivers-list-view").then(m => m.DriversListView), { loading: () => <DashboardViewSkeleton /> });
const DriverDetailView = nextDynamic(() => import("@/components/spa-views/driver-detail-view").then(m => m.DriverDetailView), { loading: () => <DashboardViewSkeleton /> });
const RequestCodeView = nextDynamic(() => import("@/components/spa-views/request-code-view").then(m => m.RequestCodeView), { loading: () => <DashboardViewSkeleton /> });
const ExamHistoryView = nextDynamic(() => import("@/components/spa-views/exam-history-view").then(m => m.ExamHistoryView), { loading: () => <DashboardViewSkeleton /> });
const DriverPanelView = nextDynamic(() => import("@/components/spa-views/driver-panel-view").then(m => m.DriverPanelView), { loading: () => <DashboardViewSkeleton /> });
const DriverPlansView = nextDynamic(() => import("@/components/spa-views/driver-plans-view").then(m => m.DriverPlansView), { loading: () => <DashboardViewSkeleton /> });
const DriverApplicationsView = nextDynamic(() => import("@/components/spa-views/driver-applications-view").then(m => m.DriverApplicationsView), { loading: () => <DashboardViewSkeleton /> });
const DriverBookingsView = nextDynamic(() => import("@/components/spa-views/driver-bookings-view").then(m => m.DriverBookingsView), { loading: () => <DashboardViewSkeleton /> });
const TrainingLogView = nextDynamic(() => import("@/components/spa-views/training-log-view").then(m => m.TrainingLogView), { loading: () => <DashboardViewSkeleton /> });
const StudentTrainingView = nextDynamic(() => import("@/components/spa-views/student-training-view").then(m => m.StudentTrainingView), { loading: () => <DashboardViewSkeleton /> });
const MyReportsView = nextDynamic(() => import("@/components/spa-views/my-reports-view").then(m => m.MyReportsView), { loading: () => <DashboardViewSkeleton /> });
const DriverHubView = nextDynamic(() => import("@/components/spa-views/driver-hub-view").then(m => m.DriverHubView), { loading: () => <DashboardViewSkeleton /> });
const ClassmatesView = nextDynamic(() => import("@/components/spa-views/classmates-view").then(m => m.ClassmatesView), { loading: () => <DashboardViewSkeleton /> });
const GroupExamView = nextDynamic(() => import("@/components/spa-views/group-exam-view").then(m => m.GroupExamView), { loading: () => <DashboardViewSkeleton /> });
const GroupExamResultsView = nextDynamic(() => import("@/components/group-exam-results-view").then(m => m.GroupExamResultsView), { loading: () => <DashboardViewSkeleton /> });
const ChatListView = nextDynamic(() => import("@/components/spa-views/chat-list-view").then(m => m.ChatListView), { loading: () => <DashboardViewSkeleton /> });
const ChatConversationView = nextDynamic(() => import("@/components/spa-views/chat-conversation-view").then(m => m.ChatConversationView), { loading: () => <DashboardViewSkeleton /> });

export default function DashboardPage() {
  const { view, params, navigate } = useHashRouter();

  const renderView = () => {
    switch (view) {
      case "home":
        return <OSDesktopView navigate={navigate} onOpenSpotlight={() => {}} />;

      case "exam":
      case "exams":
        return (
          <OSWindow
            title="Exam Center"
            subtitle="Official Timed Practice & Quizzes"
            icon={FileText}
            onClose={() => {
              if (typeof window !== "undefined" && sessionStorage.getItem("exam-active") === "true") {
                return;
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
            title="Courses"
            subtitle="Rwanda Highway Code Curriculum"
            icon={BookOpen}
            onClose={() => navigate("home")}
          >
            <CourseView navigate={navigate} params={params} />
          </OSWindow>
        );

      case "services":
        return (
          <OSWindow
            title="Driving Services"
            subtitle="Hub Directory & Testing"
            icon={Compass}
            onClose={() => navigate("home")}
          >
            <ServicesView navigate={navigate} />
          </OSWindow>
        );

      case "services/live-exam":
        return (
          <OSWindow
            title="Official Exams Results Review"
            subtitle="Used to Review Marks from Official Exams"
            icon={Car}
            onClose={() => navigate("services")}
          >
            <LiveExamView navigate={navigate} />
          </OSWindow>
        );

      case "services/group-exam":
        return (
          <OSWindow
            title="Group Exam Session"
            subtitle="Multiplayer Challenge"
            icon={Users}
            onClose={() => navigate("services")}
          >
            <GroupExamView navigate={navigate} />
          </OSWindow>
        );

      case "driver-hub":
      case "services/drivers":
        return (
          <OSWindow
            title="Driving Hub"
            subtitle="Instructors & Certified Schools"
            icon={Car}
            onClose={() => navigate("home")}
          >
            <DriverHubView navigate={navigate} />
          </OSWindow>
        );

      case "services/driver-detail":
        return (
          <OSWindow
            title="Instructor Dossier"
            subtitle="Profile & Booking"
            icon={Car}
            onClose={() => navigate("driver-hub")}
          >
            <DriverDetailView navigate={navigate} params={params} />
          </OSWindow>
        );

      case "services/request-code":
        return (
          <OSWindow
            title="Request Exam Code"
            subtitle="Access Voucher"
            icon={FileText}
            onClose={() => navigate("exams")}
          >
            <RequestCodeView navigate={navigate} />
          </OSWindow>
        );

      case "results":
        return (
          <OSWindow
            title="Performance Analytics"
            subtitle="Exam Transcripts & Progress Logs"
            icon={Trophy}
            onClose={() => navigate("home")}
          >
            <ExamHistoryView navigate={navigate} />
          </OSWindow>
        );

      case "driver-panel":
        return (
          <OSWindow
            title="Instructor Panel"
            subtitle="Dashboard & Students"
            icon={Car}
            onClose={() => navigate("home")}
          >
            <DriverPanelView navigate={navigate} />
          </OSWindow>
        );

      case "driver-panel/plans":
        return (
          <OSWindow
            title="Training Packages"
            subtitle="Instructor Plans"
            icon={Car}
            onClose={() => navigate("driver-panel")}
          >
            <DriverPlansView navigate={navigate} />
          </OSWindow>
        );

      case "driver-panel/applications":
        return (
          <OSWindow
            title="Student Applications"
            subtitle="Incoming Requests"
            icon={Car}
            onClose={() => navigate("driver-panel")}
          >
            <DriverApplicationsView navigate={navigate} />
          </OSWindow>
        );

      case "driver-panel/bookings":
        return (
          <OSWindow
            title="Lesson Bookings"
            subtitle="Schedule & Calendar"
            icon={Car}
            onClose={() => navigate("driver-panel")}
          >
            <DriverBookingsView navigate={navigate} />
          </OSWindow>
        );

      case "driver-panel/training-log":
        return (
          <OSWindow
            title="Training Log"
            subtitle="Driving Hours & Milestones"
            icon={Car}
            onClose={() => navigate("driver-panel")}
          >
            <TrainingLogView navigate={navigate} />
          </OSWindow>
        );

      case "my-training":
        return (
          <OSWindow
            title="My Training Record"
            subtitle="Driving School Lessons"
            icon={Car}
            onClose={() => navigate("home")}
          >
            <StudentTrainingView navigate={navigate} />
          </OSWindow>
        );

      case "my-reports":
        return (
          <OSWindow
            title="My Reports"
            subtitle="Weekly Activity Reports"
            icon={BarChart3}
            onClose={() => navigate("home")}
          >
            <MyReportsView navigate={navigate} />
          </OSWindow>
        );

      case "chat":
        return (
          <OSWindow
            title="Messages"
            subtitle="Direct & Group Chats"
            icon={Users}
            onClose={() => navigate("home")}
          >
            <ChatListView navigate={navigate} />
          </OSWindow>
        );

      case "chat/conversation":
        return (
          <OSWindow
            title="Active Chat Conversation"
            subtitle="Peer Discussion"
            icon={Users}
            onClose={() => navigate("chat")}
          >
            <ChatConversationView navigate={navigate} params={params} />
          </OSWindow>
        );

      case "classmates":
        return (
          <OSWindow
            title="Classmates Network"
            subtitle="Study Circles & Leaderboards"
            icon={Users}
            onClose={() => navigate("home")}
          >
            <ClassmatesView navigate={navigate} />
          </OSWindow>
        );

      case "classmates/group-results":
        return (
          <OSWindow
            title="Group Exam Results"
            subtitle="Podium & Standings"
            icon={Trophy}
            onClose={() => navigate("classmates")}
          >
            <GroupExamResultsView navigate={navigate} params={params} />
          </OSWindow>
        );

      case "settings":
        return (
          <OSWindow
            title="System Preferences"
            subtitle="Display, Language & Privacy"
            icon={Settings}
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
