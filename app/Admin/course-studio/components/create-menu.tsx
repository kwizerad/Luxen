"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, FileText, ClipboardList } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

interface CreateMenuProps {
  disabled?: boolean;
  examDisabled?: boolean;
  examDisabledReason?: string;
  onNewLesson: () => void;
  onNewExam: () => void;
}

export function CreateMenu({
  disabled,
  examDisabled,
  examDisabledReason,
  onNewLesson,
  onNewExam,
}: CreateMenuProps) {
  const { t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" disabled={disabled} className="admin-btn-primary">
          <Plus className="h-4 w-4 mr-1.5" />
          {t("create") || "Create"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px] bg-[#0F172A] border-[var(--admin-border)] rounded-xl">
        <DropdownMenuItem
          onClick={onNewLesson}
          className="gap-2 text-[var(--admin-text)] focus:bg-[var(--admin-hover-bg)] focus:text-[var(--admin-text)] rounded-lg cursor-pointer"
        >
          <FileText className="h-4 w-4 text-[var(--admin-primary)]" />
          {t("newLesson") || "New Lesson"}
        </DropdownMenuItem>
        {examDisabled ? (
          <div className="px-2 py-2 text-xs text-[var(--admin-muted)] italic">
            {examDisabledReason || t("moduleAlreadyHasExam") || "This module already has an exam."}
          </div>
        ) : (
          <DropdownMenuItem
            onClick={onNewExam}
            className="gap-2 text-[var(--admin-text)] focus:bg-[var(--admin-hover-bg)] focus:text-[var(--admin-text)] rounded-lg cursor-pointer"
          >
            <ClipboardList className="h-4 w-4 text-[var(--admin-secondary)]" />
            {t("newExam") || "New Exam"}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
