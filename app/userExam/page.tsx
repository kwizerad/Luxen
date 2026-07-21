"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trophy, Clock, TrendingUp, Play, Eye, CheckCircle, XCircle, Trash2, AlertTriangle } from "lucide-react";
import { Watermark } from "@/components/watermark";
import { ExamDetailsModal } from "@/components/exam-details-modal";
import { FloatingUserSettings } from "@/components/floating-user-settings";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { useBrandingConfig } from "@/lib/branding-config";
import type { ExamAttempt } from "@/lib/database.types";
import { getExamAttempts, getExamAttemptsWithQuestions, deleteExamAttempt } from "@/lib/supabase/queries";
import { useLanguage } from "@/lib/language-context";
import Link from "next/link";

export default function UserExamsPage() {
  const { config } = useBrandingConfig();
  const { t } = useLanguage();
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAttempt, setSelectedAttempt] = useState<ExamAttempt | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Custom confirm dialog states
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const loadAttempts = async () => {
      try {
        const data = await getExamAttempts();
        if (data.attempts) {
          setAttempts(data.attempts);
        }
      } catch (error: any) {
        toast.error(`${t("failedToLoadExamHistory")}: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    loadAttempts();
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (percentage: number) => {
    if (percentage >= 80) return "default";
    if (percentage >= 60) return "secondary";
    return "destructive";
  };

  const handleViewDetails = async (attempt: ExamAttempt) => {
    try {
      setLoading(true);
      const data = await getExamAttemptsWithQuestions(attempt.id);
      if (data.attempt) {
        setSelectedAttempt(data.attempt);
        setShowDetailsModal(true);
      }
    } catch (error: any) {
      toast.error("Failed to load exam details: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (attemptId: string, category: string) => {
    setConfirmTitle(t("permanentDeleteTitle"));
    setConfirmMessage(t("permanentDeleteExamAttemptForCategory").replace("{category}", category));
    setConfirmCallback(() => async () => {
      try {
        setDeletingId(attemptId);
        
        // Optimistic UI update - remove immediately from UI
        setAttempts(prevAttempts => prevAttempts.filter(a => a.id !== attemptId));
        
        // Then perform the actual delete operation
        console.log("Attempting to delete exam attempt:", attemptId);
        const deleteResult = await deleteExamAttempt(attemptId);
        console.log("Delete result:", deleteResult);
        
        toast.success(`✅ ${t("examDeletedPermanently")}`, {
          description: t("examRecordRemoved")
        });
      } catch (error: any) {
        // If delete failed, refresh the attempts to restore correct state
        try {
          const data = await getExamAttempts();
          if (data.attempts) {
            setAttempts(data.attempts);
          }
        } catch (refreshError) {
          console.error("Failed to refresh attempts:", refreshError);
        }
        
        toast.error(`❌ ${t("failedToDeleteExam")}: ${error.message}`);
      } finally {
        setDeletingId(null);
      }
    });
    setShowConfirm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const completedAttempts = attempts.filter(a => a.status === 'completed');
  const averageScore = completedAttempts.length > 0 
    ? Math.round(completedAttempts.reduce((sum, a) => sum + a.score_percentage, 0) / completedAttempts.length)
    : 0;
  const bestScore = completedAttempts.length > 0
    ? Math.max(...completedAttempts.map(a => a.score_percentage))
    : 0;

  return (
    <>
      {/* Floating Navo Button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Link href="/dashboard" className="premium-glass-panel flex items-center gap-2 rounded-full border p-2 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center overflow-hidden">
            {config.logoUrl ? (
              <img src={config.logoUrl} alt={config.systemName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold">{config.logoText || "N"}</span>
            )}
          </div>
          <span className="text-sm font-medium pr-1">{config.systemName}</span>
        </Link>
      </div>
      
      <main className="student-page">
        <Watermark />

      <div className="student-page-header">
        <div>
          <h1 className="student-page-title">{t("results")}</h1>
          <p className="student-page-description">{t("examHistory")}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="rounded-[12px] sm:rounded-[24px]">
          <CardContent className="flex items-center gap-2 p-2.5 sm:gap-4 sm:p-5">
            <div className="rounded-[8px] sm:rounded-[14px] bg-primary/10 p-1.5 sm:p-3 text-primary shrink-0"><Trophy className="h-3.5 w-3.5 sm:h-5 sm:w-5" /></div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-sm text-muted-foreground line-clamp-1">{t("totalExamsTaken")}</p>
              <p className="text-base sm:text-2xl font-bold leading-tight">{completedAttempts.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[12px] sm:rounded-[24px]">
          <CardContent className="flex items-center gap-2 p-2.5 sm:gap-4 sm:p-5">
            <div className="rounded-[8px] sm:rounded-[14px] bg-primary/10 p-1.5 sm:p-3 text-primary shrink-0"><TrendingUp className="h-3.5 w-3.5 sm:h-5 sm:w-5" /></div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-sm text-muted-foreground line-clamp-1">{t("averageScore")}</p>
              <p className="text-base sm:text-2xl font-bold leading-tight">{averageScore}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[12px] sm:rounded-[24px]">
          <CardContent className="flex items-center gap-2 p-2.5 sm:gap-4 sm:p-5">
            <div className="rounded-[8px] sm:rounded-[14px] bg-primary/10 p-1.5 sm:p-3 text-primary shrink-0"><CheckCircle className="h-3.5 w-3.5 sm:h-5 sm:w-5" /></div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-sm text-muted-foreground line-clamp-1">{t("bestScore")}</p>
              <p className="text-base sm:text-2xl font-bold leading-tight">{bestScore}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exam History */}
      <div className="student-section">
        <div className="student-section-header">
          <h2 className="student-section-title">{t("examHistory")}</h2>
        </div>
        
        {attempts.length === 0 ? (
          <Card className="navo-card-brand rounded-[14px] sm:rounded-[24px]">
            <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
              <div className="text-center py-8 sm:py-12">
                <Trophy className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                <p className="text-muted-foreground text-sm sm:text-base">
                  {t("noExamsYet")}
                </p>
                <Button 
                  size="sm"
                  className="mt-3 sm:mt-4" 
                  onClick={() => window.location.href = "/dashboard/exam"}
                >
                  <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  {t("takeExam")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {attempts.map((attempt) => (
              <Card 
                key={attempt.id}
                className="hover:shadow-lg transition-all navo-card-brand flex flex-col rounded-[14px] sm:rounded-[24px]"
              >
                <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm sm:text-base font-semibold truncate flex items-center gap-1.5 sm:gap-2">
                        <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                        <span className="truncate">{attempt.category_name}</span>
                      </CardTitle>
                      <CardDescription className="text-[10px] sm:text-xs mt-1 truncate">
                        {new Date(attempt.started_at).toLocaleDateString()} {t("at")} {new Date(attempt.started_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </CardDescription>
                    </div>
                    <Badge variant={getScoreBadge(attempt.score_percentage)} className="text-xs sm:text-base px-1.5 py-0.5 sm:px-2 flex-shrink-0">
                      {attempt.score_percentage}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between space-y-2 sm:space-y-3 p-3 pt-0 sm:p-6 sm:pt-0">
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="flex items-center justify-between text-[11px] sm:text-sm">
                      <span className="text-muted-foreground">{t("marks")}:</span>
                      <span className={`font-semibold ${getScoreColor(attempt.score_percentage)}`}>
                        {attempt.score_percentage}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] sm:text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <CheckCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-green-600" />
                        {t("correct")}
                      </div>
                      <span className="font-semibold">{attempt.correct_answers}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] sm:text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <XCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-red-600" />
                        {t("incorrect")}
                      </div>
                      <span className="font-semibold">{attempt.total_questions - attempt.correct_answers}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] sm:text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        {t("duration")}
                      </div>
                      <span className="font-semibold">{formatTime(attempt.duration_seconds)}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-1.5 sm:gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1 h-7 sm:h-8 text-[11px] sm:text-xs"
                      onClick={() => handleViewDetails(attempt)}
                    >
                      <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      {t("viewDetails")}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1 h-7 sm:h-8 text-[11px] sm:text-xs text-destructive hover:text-destructive"
                      onClick={() => handleDelete(attempt.id, attempt.category_name)}
                      disabled={deletingId === attempt.id}
                    >
                      {deletingId === attempt.id ? (
                        <div className="h-3 w-3 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-destructive border-t-transparent mr-1 sm:mr-2" />
                      ) : (
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      )}
                      {t("delete")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Exam Details Modal */}
      <ExamDetailsModal
        attempt={selectedAttempt}
        open={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
      />
      
      {/* Custom Confirm Dialog for Delete */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md border-0 shadow-2xl bg-gradient-to-br from-background to-muted/20">
          <DialogHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <DialogTitle className="text-2xl font-bold text-foreground">
              {confirmTitle}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-3 whitespace-pre-line text-sm leading-relaxed">
              {confirmMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-gradient-to-r from-destructive/5 to-destructive/10 border border-destructive/20 rounded-xl p-4 my-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-destructive rounded-full animate-pulse"></div>
              <p className="text-sm font-semibold text-destructive">
                {t("actionCannotBeUndone")}
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col gap-3 sm:flex-row">
            <Button 
              variant="outline"
              onClick={() => {
                setShowConfirm(false);
                setConfirmCallback(null);
              }}
              className="w-full sm:w-auto"
            >
              {t("cancel")}
            </Button>
            <Button 
              onClick={() => {
                setShowConfirm(false);
                confirmCallback?.();
                setConfirmCallback(null);
              }}
              variant="destructive"
              className="w-full sm:w-auto font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {t("deletePermanently")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <MobileBottomNav hide />
      </main>
    </>
  );
}

