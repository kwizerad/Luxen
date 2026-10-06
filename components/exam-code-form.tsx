"use client";

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useLanguage } from "@/lib/language-context";

export function ExamCodeForm() {
  const [examCode, setExamCode] = useState("");
  const { t } = useLanguage();

  return (
    <div className="w-full max-w-md">
      <div className="bg-card rounded-2xl p-8 space-y-6 border border-border">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">{t("liveExamResults") || "Take Exam / View Results"}</h2>
          <p className="text-muted-foreground text-sm">
            {t("liveExamResultsSubtitle") || "Enter your exam code to get started"}
          </p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t("liveExamQuickCode") || "Exam Code"}
              value={examCode}
              onChange={(e) => setExamCode(e.target.value)}
              className="pl-12 bg-background"
            />
          </div>

          <Button className="w-full" size="lg">
            {t("continue") || "Continue"}
          </Button>

          <div className="text-center space-y-4">
            <p className="text-sm">{t("liveExamFetchCodes") || "Request Exam"}</p>
            <Button variant="outline" className="w-full">
              {t("beginExam") || "Start Exam"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
