"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Hash, Infinity, Lock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { updateExamLimit, deleteExamLimit } from "@/lib/supabase/queries";
import { useLanguage } from "@/lib/language-context";

interface UserExamLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  currentLimit?: number;
  currentIsLimited?: boolean;
  onSuccess?: () => void;
}

export function UserExamLimitDialog({
  open,
  onOpenChange,
  userId,
  userEmail,
  currentLimit,
  currentIsLimited = true,
  onSuccess,
}: UserExamLimitDialogProps) {
  const { t } = useLanguage();
  const [limit, setLimit] = useState(currentLimit?.toString() || "5");
  const [isLimited, setIsLimited] = useState(currentIsLimited);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const numLimit = parseInt(limit, 10);

    if (isLimited && (isNaN(numLimit) || numLimit < 1 || numLimit > 100)) {
      toast.error(t("enterValidNumber"));
      return;
    }

    setLoading(true);

    try {
      await updateExamLimit(userId, isLimited ? numLimit : 5, isLimited);
      toast.success(isLimited
        ? t("examLimitUpdated") + numLimit + t("perDay")
        : t("userNowHasUnlimitedExamAccess")
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(t("failedToUpdateExamLimit") + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);

    try {
      await deleteExamLimit(userId);
      toast.success(t("examLimitResetToDefault"));
      setLimit("5");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(t("failedToResetExamLimit") + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-primary" />
            {t("setExamLimit")}
          </DialogTitle>
          <DialogDescription>
            {t("setExamLimitDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t("user")}</Label>
            <div className="p-3 bg-muted rounded-md text-sm font-medium">
              {userEmail}
            </div>
          </div>

          {/* Limit Toggle */}
          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${isLimited ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                {isLimited ? <Lock className="h-4 w-4" /> : <Infinity className="h-4 w-4" />}
              </div>
              <div>
                <Label htmlFor="limit-toggle" className="font-medium cursor-pointer">
                  {isLimited ? t("limitedAccess") : t("unlimitedAccess")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isLimited
                    ? t("userHasDailyExamLimits")
                    : t("userCanTakeUnlimitedExams")}
                </p>
              </div>
            </div>
            <Switch
              id="limit-toggle"
              checked={isLimited}
              onCheckedChange={setIsLimited}
            />
          </div>

          {/* Limit Input - Only show when limited */}
          {isLimited && (
            <div className="space-y-2">
              <Label htmlFor="limit">{t("dailyExamLimit")}</Label>
              <Input
                id="limit"
                type="number"
                min={1}
                max={100}
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                placeholder="5"
                className="text-lg"
              />
              <p className="text-xs text-muted-foreground">
                {t("enterNumberBetween")}
              </p>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-3">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>{t("note")}:</strong> {isLimited
                ? t("dailyLimitResetsAtMidnight")
                : t("userNoExamRestrictions")}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {currentLimit && (
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={loading}
              className="text-muted-foreground"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("resetToDefault")
              )}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t("saving")}
              </>
            ) : (
              isLimited ? t("saveLimit") : t("setUnlimited")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
