"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useLanguage } from "@/lib/language-context";
import { Keyboard, Command } from "lucide-react";

interface ShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutsModal({ open, onOpenChange }: ShortcutsModalProps) {
  const { t } = useLanguage();

  const shortcutGroups = [
    {
      title: t("generalShortcuts") || "General",
      shortcuts: [
        { keys: ["Ctrl", "S"], desc: t("saveChanges") || "Save changes instantly" },
        { keys: ["Ctrl", "/"], desc: t("openShortcuts") || "Open keyboard shortcuts guide" },
        { keys: ["Esc"], desc: t("closeModals") || "Close dialogs or clear selection" },
      ],
    },
    {
      title: t("editorShortcuts") || "Rich Editor & Writing",
      shortcuts: [
        { keys: ["/"], desc: t("openSlashMenu") || "Open quick command slash menu" },
        { keys: ["Ctrl", "B"], desc: t("boldText") || "Toggle Bold formatting" },
        { keys: ["Ctrl", "I"], desc: t("italicText") || "Toggle Italic formatting" },
        { keys: ["Ctrl", "U"], desc: t("underlineText") || "Toggle Underline formatting" },
        { keys: ["Ctrl", "Z"], desc: t("undo") || "Undo last change" },
        { keys: ["Ctrl", "Y"], desc: t("redo") || "Redo change" },
      ],
    },
    {
      title: t("examShortcuts") || "Exam & Question Builder",
      shortcuts: [
        { keys: ["Alt", "N"], desc: t("newQuestion") || "Add new question" },
        { keys: ["Ctrl", "D"], desc: t("duplicateQuestion") || "Duplicate active question" },
        { keys: ["Alt", "Up/Down"], desc: t("reorderQuestion") || "Move question up / down" },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[var(--admin-card)] border-[var(--admin-border)] p-5">
        <DialogHeader className="mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[var(--admin-primary)]/10 text-[var(--admin-primary)] flex items-center justify-center">
              <Keyboard className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-[var(--admin-text)]">
                {t("keyboardShortcuts") || "Keyboard Shortcuts"}
              </DialogTitle>
              <DialogDescription className="text-xs text-[var(--admin-muted)]">
                {t("speedUpWorkflow") || "Speed up your authoring workflow in Course Studio"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 text-xs">
          {shortcutGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-2">
              <h4 className="font-semibold text-[var(--admin-muted)] uppercase tracking-wider text-[10px]">
                {group.title}
              </h4>
              <div className="rounded-lg border border-[var(--admin-border)] divide-y divide-[var(--admin-border)] overflow-hidden bg-[var(--admin-hover-bg)]/20">
                {group.shortcuts.map((s, sIdx) => (
                  <div key={sIdx} className="flex items-center justify-between p-2.5">
                    <span className="text-[var(--admin-text)]">{s.desc}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-1.5 py-0.5 rounded border border-[var(--admin-border)] bg-[var(--admin-card)] text-[11px] font-mono text-[var(--admin-text)] shadow-xs"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
