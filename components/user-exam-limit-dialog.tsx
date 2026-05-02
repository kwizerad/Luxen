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
import { Loader2, Hash } from "lucide-react";

interface UserExamLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  currentLimit?: number;
  onSuccess?: () => void;
}

export function UserExamLimitDialog({
  open,
  onOpenChange,
  userId,
  userEmail,
  currentLimit,
  onSuccess,
}: UserExamLimitDialogProps) {
  const [limit, setLimit] = useState(currentLimit?.toString() || "5");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const numLimit = parseInt(limit, 10);

    if (isNaN(numLimit) || numLimit < 1 || numLimit > 100) {
      toast.error("Please enter a valid number between 1 and 100");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/exam/limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          daily_limit: numLimit,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`Exam limit updated to ${numLimit} per day`);
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(data.error || "Failed to update exam limit");
      }
    } catch (error) {
      toast.error("Failed to update exam limit");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);

    try {
      const res = await fetch(`/api/exam/limits?userId=${userId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Exam limit reset to default (5 per day)");
        setLimit("5");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(data.error || "Failed to reset exam limit");
      }
    } catch (error) {
      toast.error("Failed to reset exam limit");
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
            Set Exam Limit
          </DialogTitle>
          <DialogDescription>
            Set the maximum number of exams this user can take per day.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>User</Label>
            <div className="p-3 bg-muted rounded-md text-sm font-medium">
              {userEmail}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="limit">Daily Exam Limit</Label>
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
              Enter a number between 1 and 100. Default is 5 exams per day.
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-3">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Note:</strong> The daily limit resets at midnight UTC. Users will see how many exams they have remaining.
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
                "Reset to Default"
              )}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              "Save Limit"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
