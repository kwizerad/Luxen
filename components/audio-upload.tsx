"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/language-context";
import { uploadCourseFile, validateFile } from "@/lib/course-storage";
import { toast } from "sonner";
import { Upload, X, Loader2, Music } from "lucide-react";

interface AudioUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  folder: string;
  label?: string;
  disabled?: boolean;
}

export function AudioUpload({ value, onChange, folder, label, disabled }: AudioUploadProps) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error || t("audioUpload.invalidFile") || "Please select a supported audio file.");
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const result = await uploadCourseFile(file, folder, (p) => setProgress(p));
      onChange(result.publicUrl);
      toast.success(t("audioUpload.success") || "Audio uploaded");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || t("audioUpload.failed") || "Failed to upload audio.");
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleClear = () => {
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <Label className="text-xs text-[var(--admin-text)] flex items-center gap-1.5">
          <Music className="h-3 w-3 text-[var(--admin-primary)]" />
          {label}
        </Label>
      )}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFile}
          disabled={disabled || uploading}
        />
        {value ? (
          <>
            <audio
              controls
              src={value}
              className="flex-1 h-10 rounded-lg"
              onError={() => toast.error(t("audioUpload.loadError") || "Failed to load audio.")}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleClear}
              disabled={disabled || uploading}
              className="h-10 w-10 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              title={t("remove") || "Remove"}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            className="gap-2 border-[var(--admin-border)] text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading
              ? `${t("uploading") || "Uploading"} ${progress > 0 ? `${progress}%` : ""}`
              : (t("uploadAudio") || "Upload Audio")}
          </Button>
        )}
      </div>
      <p className="text-[10px] text-[var(--admin-muted)]">
        {t("audioUpload.supportedFormats") || "MP3, WAV, OGG, WebM, AAC. Max 50MB."}
      </p>
    </div>
  );
}
