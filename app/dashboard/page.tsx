"use client";

import { useHashRouter } from "@/hooks/use-hash-router";
import { ViewTransition } from "@/components/spa-views/view-transition";
import { HomeView } from "@/components/spa-views/home-view";
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
import { ChatListView } from "@/components/spa-views/chat-list-view";
import { ChatConversationView } from "@/components/spa-views/chat-conversation-view";
import { DriverHubView } from "@/components/spa-views/driver-hub-view";

export default function DashboardPage() {
  const { view, params, navigate } = useHashRouter();

  const renderView = () => {
    switch (view) {
      case "home":
        return <HomeView navigate={navigate} />;
      case "course":
        return <CourseView navigate={navigate} params={params} />;
      case "services":
        return <ServicesView navigate={navigate} />;
      case "services/live-exam":
        return <LiveExamView navigate={navigate} />;
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
      case "chat/conversation":
        return <ChatConversationView navigate={navigate} params={params} />;
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
