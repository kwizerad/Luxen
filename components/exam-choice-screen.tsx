"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, FileText, Trophy, ArrowLeft, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface ExamChoiceScreenProps {
  onNavigate: (choice: "individual" | "group" | "invitations") => void;
}

export function ExamChoiceScreen({ onNavigate }: ExamChoiceScreenProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const [pendingInvitations, setPendingInvitations] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchPendingInvitations = async () => {
      try {
        const supabase = createClient();
        const { count } = await supabase
          .from("exam_challenge_participants")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "pending");
        setPendingInvitations(count || 0);
      } catch (error) {
        console.error("Failed to fetch pending invitations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingInvitations();

    // Subscribe to realtime updates for invitations
    const supabase = createClient();
    const channel = supabase
      .channel(`exam_invitations:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exam_challenge_participants", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const status = payload.new?.status;
            if (status === "pending") {
              setPendingInvitations((prev) => prev + 1);
            } else if (payload.old?.status === "pending" && status !== "pending") {
              setPendingInvitations((prev) => Math.max(0, prev - 1));
            }
          } else if (payload.eventType === "DELETE") {
            if (payload.old?.status === "pending") {
              setPendingInvitations((prev) => Math.max(0, prev - 1));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleChoice = (choice: "individual" | "group" | "invitations") => {
    onNavigate(choice);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{t("examChoiceTitle") || "Choose Exam Type"}</h1>
          <p className="text-muted-foreground">{t("examChoiceSubtitle") || "Select how you want to take your exam"}</p>
        </div>

        {/* Choice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Individual Exam */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 border-2 hover:border-primary"
            onClick={() => handleChoice("individual")}
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>{t("individualExam") || "Individual Exam"}</CardTitle>
              <CardDescription>
                {t("individualExamDescription") || "Take an exam on your own at your own pace"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                {t("startIndividualExam") || "Start Individual Exam"}
              </Button>
            </CardContent>
          </Card>

          {/* Group Exam */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 border-2 hover:border-primary"
            onClick={() => handleChoice("group")}
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>{t("groupExam") || "Group Exam"}</CardTitle>
              <CardDescription>
                {t("groupExamDescription") || "Compete with friends in real-time group exams"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                {t("startGroupExam") || "Start Group Exam"}
              </Button>
            </CardContent>
          </Card>

          {/* Exam Invitations */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 border-2 hover:border-primary relative"
            onClick={() => handleChoice("invitations")}
          >
            {pendingInvitations > 0 && (
              <Badge className="absolute -top-2 -right-2 bg-red-500 text-white">
                {pendingInvitations}
              </Badge>
            )}
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>{t("examInvitations") || "Exam Invitations"}</CardTitle>
              <CardDescription>
                {t("examInvitationsDescription") || "View and respond to group exam invitations"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                {t("viewInvitations") || "View Invitations"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("backToDashboard") || "Back to Dashboard"}
          </Button>
        </div>
      </div>
    </div>
  );
}
