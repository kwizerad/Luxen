"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, X, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/language-context";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
  folder?: string;
  className?: string;
}

export function ImageUpload({
  value,
  onChange,
  onUploadStart,
  onUploadEnd,
  folder = "exam-images",
  className,
}: ImageUploadProps) {
  const { t } = useLanguage();
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (file: File) => {
    // Validate file
    if (!file.type.startsWith("image/")) {
      toast.error(t("imageUpload.selectImageFile"));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("imageUpload.fileSizeLimit"));
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    setIsUploading(true);
    onUploadStart?.();

    try {
      const supabase = createClient();

      const timestamp = Date.now();
      const fileExt = file.name.split(".").pop();
      const fileName = `${timestamp}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePathLocal = `${folder}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("images")
        .upload(filePathLocal, file, {
          contentType: file.type,
          cacheControl: "3600",
        });

      if (uploadError) {
        console.error("Supabase storage upload error:", uploadError);
        throw uploadError;
      }

      const { data: publicData } = supabase.storage.from("images").getPublicUrl(filePathLocal);
      const publicUrl = publicData.publicUrl;

      // If profile picture, update user metadata
      if (folder === "profile-pictures") {
        try {
          const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
          if (updateError) console.error("Failed to update user metadata:", updateError);
        } catch (e) {
          console.error("Failed to update user metadata:", e);
        }
      }

      onChange(publicUrl);
      setFilePath(filePathLocal);
      toast.success(t("imageUploadedSuccess"));
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error?.message || t("imageUpload.failed"));
      setPreview(null);
    } finally {
      setIsUploading(false);
      onUploadEnd?.();
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileChange(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleRemove = async () => {
    if (filePath) {
      try {
        const supabase = createClient();
        const { error } = await supabase.storage.from("images").remove([filePath]);
        if (error) console.error("Supabase storage delete error:", error);
      } catch (error) {
        console.error("Failed to delete file:", error);
      }
    }
    onChange(undefined);
    setPreview(null);
    setFilePath(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (preview) {
    return (
      <div className={`relative ${className}`}>
        <img
          src={preview}
          alt={t("imageUpload.uploaded")}
          className="w-full h-48 object-cover rounded-lg border border-border"
        />
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8"
          onClick={handleRemove}
        >
          <X className="h-4 w-4" />
        </Button>
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={`border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer ${className}`}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleFileChange(file);
          }
        }}
      />
      {isUploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary-readable" />
          <p className="text-sm text-muted-foreground">{t("imageUpload.uploading")}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">{t("imageUpload.clickOrDrag")}</p>
          <p className="text-xs text-muted-foreground">
            {t("imageUpload.supportedFormats")}
          </p>
        </div>
      )}
    </div>
  );
}
