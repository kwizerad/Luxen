"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Settings2, Shield, ClipboardList } from "lucide-react";
import { getSystemConfig, updateSystemConfig } from "@/lib/supabase/queries";
import type { SystemConfig } from "@/lib/database.types";

export function SystemConfigSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configs, setConfigs] = useState<Record<string, SystemConfig>>({});
  
  // Individual settings
  const [examLimit, setExamLimit] = useState<number>(5);
  const [violationsEnabled, setViolationsEnabled] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const loadConfigs = async () => {
      try {
        const { configs: data } = await getSystemConfig();
        if (data) {
          const configMap: Record<string, SystemConfig> = {};
          data.forEach((c: SystemConfig) => {
            configMap[c.key] = c;
          });
          setConfigs(configMap);
          
          // Set individual values
          if (configMap["universal_exam_limit"]) {
            setExamLimit(parseInt(configMap["universal_exam_limit"].value, 10) || 5);
          }
          if (configMap["violation_measures_enabled"]) {
            setViolationsEnabled(configMap["violation_measures_enabled"].value === "true");
          }
        }
      } catch (error: any) {
        toast.error("Failed to load system configuration: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    loadConfigs();
  }, []);

  const handleSaveExamLimit = async () => {
    try {
      setSaving(true);
      await updateSystemConfig(
        "universal_exam_limit",
        examLimit.toString(),
        "Universal daily exam limit applied to all users"
      );
      toast.success("Universal exam limit updated successfully");
    } catch (error: any) {
      toast.error("Failed to update exam limit: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveViolations = async () => {
    try {
      setSaving(true);
      await updateSystemConfig(
        "violation_measures_enabled",
        violationsEnabled.toString(),
        "Enable/disable exam security violation measures (fullscreen, copy/paste prevention, etc.)"
      );
      toast.success(`Violation measures ${violationsEnabled ? "enabled" : "disabled"} successfully`);
    } catch (error: any) {
      toast.error("Failed to update violation settings: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="border border-border rounded-[32px] bg-card shadow-sm">
        <CardHeader>
          <CardTitle>System Configuration</CardTitle>
          <CardDescription>Loading configuration...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Universal Exam Limit */}
      <Card className="border border-border rounded-[32px] bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Universal Exam Limit
          </CardTitle>
          <CardDescription>
            Set the daily exam limit that applies to all users system-wide
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="exam-limit">Daily Exam Limit (per user)</Label>
            <div className="flex items-center gap-4">
              <Input
                id="exam-limit"
                type="number"
                min={1}
                max={100}
                value={examLimit}
                onChange={(e) => setExamLimit(parseInt(e.target.value, 10) || 1)}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">
                exams per day per user
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              This limit will be applied to all users unless they have individual limits set.
            </p>
          </div>
          
          <Button 
            onClick={handleSaveExamLimit} 
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Exam Limit"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Violation Measures Toggle */}
      <Card className="border border-border rounded-[32px] bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Exam Security Settings
          </CardTitle>
          <CardDescription>
            Enable or disable exam security violation measures
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="violations-toggle" className="text-base">
                Violation Measures
              </Label>
              <p className="text-sm text-muted-foreground">
                Fullscreen enforcement, copy/paste prevention, tab switching detection
              </p>
            </div>
            <Switch
              id="violations-toggle"
              checked={violationsEnabled}
              onCheckedChange={setViolationsEnabled}
            />
          </div>
          
          <div className="bg-muted rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              Current Status: {" "}
              <span className={`font-medium ${violationsEnabled ? "text-green-600" : "text-red-600"}`}>
                {violationsEnabled ? "ENABLED" : "DISABLED"}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {violationsEnabled 
                ? "Exam security features are active. Users will be monitored for violations."
                : "Exam security features are disabled. Users can take exams without restrictions."}
            </p>
          </div>
          
          <Button 
            onClick={handleSaveViolations} 
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Security Settings"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
