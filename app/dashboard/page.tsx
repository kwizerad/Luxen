"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useHashRouter } from "@/hooks/use-hash-router";
import { ViewTransition } from "@/components/spa-views/view-transition";
import { HomeView } from "@/components/spa-views/home-view";

const ExamView = dynamic(() => import("@/components/spa-views/exam-view").then((m) => m.ExamView));
const CourseView = dynamic(() => import("@/components/spa-views/course-view").then((m) => m.CourseView));
const ServicesView = dynamic(() => import("@/components/spa-views/services-view").then((m) => m.ServicesView));
const LiveExamView = dynamic(() => import("@/components/spa-views/live-exam-view").then((m) => m.LiveExamView));
const SettingsView = dynamic(() => import("@/components/spa-views/settings-view").then((m) => m.SettingsView));
const DriversListView = dynamic(() => import("@/components/spa-views/drivers-list-view").then((m) => m.DriversListView));
const DriverDetailView = dynamic(() => import("@/components/spa-views/driver-detail-view").then((m) => m.DriverDetailView));
const RequestCodeView = dynamic(() => import("@/components/spa-views/request-code-view").then((m) => m.RequestCodeView));
const ExamHistoryView = dynamic(() => import("@/components/spa-views/exam-history-view").then((m) => m.ExamHistoryView));
const DriverPanelView = dynamic(() => import("@/components/spa-views/driver-panel-view").then((m) => m.DriverPanelView));
const DriverPlansView = dynamic(() => import("@/components/spa-views/driver-plans-view").then((m) => m.DriverPlansView));
const DriverApplicationsView = dynamic(() => import("@/components/spa-views/driver-applications-view").then((m) => m.DriverApplicationsView));
const DriverBookingsView = dynamic(() => import("@/components/spa-views/driver-bookings-view").then((m) => m.DriverBookingsView));
const TrainingLogView = dynamic(() => import("@/components/spa-views/training-log-view").then((m) => m.TrainingLogView));
const StudentTrainingView = dynamic(() => import("@/components/spa-views/student-training-view").then((m) => m.StudentTrainingView));
const MyReportsView = dynamic(() => import("@/components/spa-views/my-reports-view").then((m) => m.MyReportsView));
const DriverHubView = dynamic(() => import("@/components/spa-views/driver-hub-view").then((m) => m.DriverHubView));
const ClassmatesView = dynamic(() => import("@/components/spa-views/classmates-view").then((m) => m.ClassmatesView));
const GroupExamView = dynamic(() => import("@/components/spa-views/group-exam-view").then((m) => m.GroupExamView));
const GroupExamResultsView = dynamic(() => import("@/components/group-exam-results-view").then((m) => m.GroupExamResultsView));
const ChatListView = dynamic(() => import("@/components/spa-views/chat-list-view").then((m) => m.ChatListView));
const ChatConversationView = dynamic(() => import("@/components/spa-views/chat-conversation-view").then((m) => m.ChatConversationView));

export default function DashboardPage() {
  const { view, params, navigate } = useHashRouter();

  // Warm up primary student SPA chunks during browser idle time after initial paint
  useEffect(() => {
    const preloadCoreViews = () => {
      void import("@/components/spa-views/exam-view");
      void import("@/components/spa-views/course-view");
      void import("@/components/spa-views/classmates-view");
      void import("@/components/spa-views/exam-history-view");
      void import("@/components/spa-views/services-view");
      void import("@/components/spa-views/settings-view");
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = (window as any).requestIdleCallback(preloadCoreViews, { timeout: 2500 });
      return () => (window as any).cancelIdleCallback?.(id);
    } else {
      const timer = setTimeout(preloadCoreViews, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const renderView = () => {
    switch (view) {
      case "home":
        return <HomeView navigate={navigate} />;
      case "exam":
      case "exams":
        return <ExamView navigate={navigate} params={params} />;
      case "course":
        return <CourseView navigate={navigate} params={params} />;
      case "services":
        return <ServicesView navigate={navigate} />;
      case "services/live-exam":
        return <LiveExamView navigate={navigate} />;
      case "services/group-exam":
        return <GroupExamView navigate={navigate} />;
      case "driver-hub":
        return <DriverHubView navigate={navigate} />;
      case "services/drivers":
        return <DriversListView navigate={navigate} />;
      case "services/driver-detail":
        return <DriverDetailView navigate={navigate} params={params} />;
      case "services/request-code":
        return <RequestCodeView navigate={navigate} />;
      case "results":
        return <ExamHistoryView navigate={navigate} />;
      case "driver-panel":
        return <DriverPanelView navigate={navigate} />;
      case "driver-panel/plans":
        return <DriverPlansView navigate={navigate} />;
      case "driver-panel/applications":
        return <DriverApplicationsView navigate={navigate} />;
      case "driver-panel/bookings":
        return <DriverBookingsView navigate={navigate} />;
      case "driver-panel/training-log":
        return <TrainingLogView navigate={navigate} />;
      case "my-training":
        return <StudentTrainingView navigate={navigate} />;
      case "my-reports":
        return <MyReportsView navigate={navigate} />;
      case "chat":
        return <ChatListView navigate={navigate} />;
      case "chat/conversation":
        return <ChatConversationView navigate={navigate} params={params} />;
      case "classmates":
        return <ClassmatesView navigate={navigate} />;
      case "classmates/group-results":
        return <GroupExamResultsView navigate={navigate} params={params} />;
      case "settings":
        return <SettingsView navigate={navigate} />;
      default:
        return <HomeView navigate={navigate} />;
    }
  };

  return (
    <ViewTransition viewKey={view}>
      {renderView()}
    </ViewTransition>
  );
}
