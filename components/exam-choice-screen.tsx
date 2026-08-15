"use client";

import { useRouter } from "next/navigation";
import { Users, FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/language-context";

interface ExamChoiceScreenProps {
  onNavigate: (choice: "individual" | "group") => void;
  groupExamEnabled?: boolean;
}

export function ExamChoiceScreen({ onNavigate, groupExamEnabled = true }: ExamChoiceScreenProps) {
  const { t } = useLanguage();
  const router = useRouter();

  const handleChoice = (choice: "individual" | "group") => {
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
        <div className={`grid gap-6 ${groupExamEnabled ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 max-w-md mx-auto"}`}>
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

          {/* Group Exam - only show if enabled */}
          {groupExamEnabled && (
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
          )}
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
