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

import { ExamView } from "@/components/spa-views/exam-view";
import { CourseView } from "@/components/spa-views/course-view";
import { ServicesView } from "@/components/spa-views/services-view";
import { LiveExamView } from "@/components/spa-views/live-exam-view";
import { SettingsView } from "@/components/spa-views/settings-view";
import { DriversListView } from "@/components/spa-views/drivers-list-view";
import { DriverDetailView } from "@/components/spa-views/driver-detail-view";
import { RequestCodeView } from "@/components/spa-views/request-code-view";
import { ExamHistoryView } from "@/components/spa-views/exam-history-view";
import { DriverPanelView } from "@/components/spa-views/driver-panel-view";
import { DriverPlansView } from "@/components/spa-views/driver-plans-view";
import { DriverApplicationsView } from "@/components/spa-views/driver-applications-view";
import { DriverBookingsView } from "@/components/spa-views/driver-bookings-view";
import { TrainingLogView } from "@/components/spa-views/training-log-view";
import { StudentTrainingView } from "@/components/spa-views/student-training-view";
import { MyReportsView } from "@/components/spa-views/my-reports-view";
import { DriverHubView } from "@/components/spa-views/driver-hub-view";
import { ClassmatesView } from "@/components/spa-views/classmates-view";
import { GroupExamView } from "@/components/spa-views/group-exam-view";
import { GroupExamResultsView } from "@/components/group-exam-results-view";
import { ChatListView } from "@/components/spa-views/chat-list-view";
import { ChatConversationView } from "@/components/spa-views/chat-conversation-view";

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
            onClose={() => navigate("home")}
          >
            <ExamView navigate={navigate} params={params} />
          </OSWindow>
        );

      case "course":
        return (
          <OSWindow
            title="Course Studio"
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
            title="Live Exam Simulator"
            subtitle="Real-time Proctoring"
            icon={FileText}
            onClose={() => navigate("home")}
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
            onClose={() => navigate("home")}
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
