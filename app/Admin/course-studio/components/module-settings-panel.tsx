"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/language-context";
import { Module, CourseStatus } from "@/lib/courses-store";
import { Layers } from "lucide-react";

interface ModuleSettingsPanelProps {
  module: Module;
  onChange: (module: Module) => void;
}

const STATUSES: CourseStatus[] = ["draft", "published", "archived"];

export function ModuleSettingsPanel({ module, onChange }: ModuleSettingsPanelProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-[var(--admin-text)] font-medium">
        <Layers className="h-4 w-4 text-[var(--admin-secondary)]" />
        {t("moduleSettings") || "Module Settings"}
      </div>

      <div className="space-y-2">
        <Label className="text-[var(--admin-text)]">{t("moduleTitle") || "Module Title"}</Label>
        <Input
          value={module.title}
          onChange={(e) => onChange({ ...module, title: e.target.value })}
          className="admin-input"
          placeholder={t("moduleTitle") || "Module title"}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-[var(--admin-text)]">{t("status") || "Status"}</Label>
        <Select
          value={module.status}
          onValueChange={(value) => onChange({ ...module, status: value as CourseStatus })}
        >
          <SelectTrigger className="admin-input">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{t(s) || s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
