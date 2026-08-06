"use client";

import { useHashRouter } from "@/hooks/use-hash-router";
import { ViewTransition } from "@/components/spa-views/view-transition";
import { HomeView } from "@/components/spa-views/home-view";
import { CourseView } from "@/components/spa-views/course-view";
import { ServicesView } from "@/components/spa-views/services-view";
import { LiveExamView } from "@/components/spa-views/live-exam-view";
import { SettingsView } from "@/components/spa-views/settings-view";

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
