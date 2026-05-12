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
import Link from "next/link";

export default function UserExamsPage() {
  const { config } = useBrandingConfig();
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
        toast.error("Failed to load exam history: " + error.message);
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
    setConfirmTitle("Delete Exam History?");
    setConfirmMessage(`Are you sure you want to delete the exam record for "${category}"?\n\nThis action cannot be undone.`);
    setConfirmCallback(() => async () => {
      try {
        setDeletingId(attemptId);
        await deleteExamAttempt(attemptId);
        setAttempts(attempts.filter(a => a.id !== attemptId));
        toast.success("Exam history deleted successfully", {
          description: "The record has been hidden from your view but remains visible to administrators"
        });
      } catch (error: any) {
        toast.error("Failed to delete exam history: " + error.message);
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

  return (
    <>
      {/* Floating Navo Button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 bg-background/95 backdrop-blur-sm shadow-lg p-2">
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
      
      <div className="container mx-auto px-4 py-4 md:py-8 pt-16 md:pt-8 pb-24 md:pb-8 space-y-6 relative">
        <Watermark />

      {/* Exam History */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Exam History</h2>
        
        {attempts.length === 0 ? (
          <Card className="navo-card-brand">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No exams taken yet. Start your first exam!
                </p>
                <Button 
                  className="mt-4" 
                  onClick={() => window.location.href = "/dashboard/exam"}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Take Exam
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {attempts.map((attempt) => (
              <Card 
                key={attempt.id}
                className="hover:shadow-lg transition-all navo-card-brand flex flex-col"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold truncate flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="truncate">{attempt.category_name}</span>
                      </CardTitle>
                      <CardDescription className="text-xs mt-1 truncate">
                        {new Date(attempt.started_at).toLocaleDateString()} at {new Date(attempt.started_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </CardDescription>
                    </div>
                    <Badge variant={getScoreBadge(attempt.score_percentage)} className="text-base px-2 py-0.5 flex-shrink-0">
                      {attempt.score_percentage}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Marks:</span>
                      <span className={`font-semibold ${getScoreColor(attempt.score_percentage)}`}>
                        {attempt.score_percentage}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        Correct
                      </div>
                      <span className="font-semibold">{attempt.correct_answers}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <XCircle className="h-3 w-3 text-red-600" />
                        Incorrect
                      </div>
                      <span className="font-semibold">{attempt.total_questions - attempt.correct_answers}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Duration
                      </div>
                      <span className="font-semibold">{formatTime(attempt.duration_seconds)}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={() => handleViewDetails(attempt)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(attempt.id, attempt.category_name)}
                      disabled={deletingId === attempt.id}
                    >
                      {deletingId === attempt.id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-destructive border-t-transparent mr-2" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Delete
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
        <DialogContent className="max-w-md border-red-500 border-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-red-700">
              <AlertTriangle className="h-6 w-6" />
              {confirmTitle}
            </DialogTitle>
            <DialogDescription className="text-base mt-2 whitespace-pre-line">
              {confirmMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 my-4">
            <p className="text-sm text-red-800 font-medium text-center">
              This action cannot be undone
            </p>
          </div>
          <DialogFooter className="flex-row gap-3">
            <Button 
              variant="outline"
              onClick={() => {
                setShowConfirm(false);
                setConfirmCallback(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                setShowConfirm(false);
                confirmCallback?.();
                setConfirmCallback(null);
              }}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <MobileBottomNav />
      </div>
    </>
  );
}

