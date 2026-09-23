"use client";

import { useEffect, useState } from "react";
import { StickyNote, Check, Copy, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface TopicNotesProps {
  topicId: string;
  topicTitle: string;
  lessonTitle: string;
}

export function TopicNotes({ topicId, topicTitle, lessonTitle }: TopicNotesProps) {
  const storageKey = `luxen_note_${topicId}`;
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const savedNote = localStorage.getItem(storageKey);
      setNote(savedNote || "");
    } catch {
      setNote("");
    }
  }, [topicId, storageKey]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNote(value);
    try {
      if (value.trim()) {
        localStorage.setItem(storageKey, value);
      } else {
        localStorage.removeItem(storageKey);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    }
  };

  const copyNote = () => {
    if (!note) return;
    navigator.clipboard.writeText(note);
    toast.success("Notes copied to clipboard");
  };

  const downloadNote = () => {
    if (!note) return;
    const blob = new Blob([`Lesson: ${lessonTitle}\nTopic: ${topicTitle}\n\nNotes:\n${note}`], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Study-Notes-${topicTitle.slice(0, 20)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Notes downloaded");
  };

  const clearNote = () => {
    if (confirm("Are you sure you want to clear your notes for this topic?")) {
      setNote("");
      try {
        localStorage.removeItem(storageKey);
      } catch {}
      toast.info("Notes cleared");
    }
  };

  return (
    <div className="rounded-[16px] border bg-card/60 backdrop-blur-sm p-4 space-y-3 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-amber-500" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/90">
            Study Scratchpad & Notes
          </h4>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          {saved && (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <Check className="h-3 w-3" /> Auto-saved
            </span>
          )}
        </div>
      </div>

      <textarea
        value={note}
        onChange={handleChange}
        placeholder="Jot down key points, questions, or memory tricks for this topic... (auto-saved)"
        rows={4}
        className="w-full text-xs sm:text-sm bg-background/80 border rounded-xl p-3 resize-y focus:outline-none focus:ring-1 focus:ring-primary font-sans leading-relaxed text-foreground placeholder:text-muted-foreground/60"
      />

      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-[10px] text-muted-foreground">
          {note.length} chars
        </span>
        <div className="flex items-center gap-1">
          {note.length > 0 && (
            <>
              <Button type="button" variant="ghost" size="sm" onClick={copyNote} className="h-7 px-2 text-[11px] gap-1">
                <Copy className="h-3 w-3" /> Copy
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={downloadNote} className="h-7 px-2 text-[11px] gap-1">
                <Download className="h-3 w-3" /> Export
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={clearNote} className="h-7 px-2 text-[11px] text-rose-500 hover:text-rose-600 gap-1">
                <Trash2 className="h-3 w-3" /> Clear
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
