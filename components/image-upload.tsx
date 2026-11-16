"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { compressImageFile } from "@/lib/image-compression";
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

  // Keep preview in sync when value prop changes externally
  useEffect(() => {
    setPreview(value || null);
  }, [value]);

  const handleFileChange = async (file: File) => {
    // Validate file type and pre-compression cap (20MB)
    if (!file.type.startsWith("image/")) {
      toast.error(t("imageUpload.selectImageFile"));
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error(t("imageUpload.fileSizeLimit"));
      return;
    }

    // Show immediate local preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setIsUploading(true);
    onUploadStart?.();

    try {
      const targetMaxDim = folder === "profile-pictures" ? 512 : 1280;
      const uploadFile = await compressImageFile(file, {
        maxDimension: targetMaxDim,
        quality: 0.80,
        minBytesToCompress: 15 * 1024,
      });

      if (uploadFile.size > 5 * 1024 * 1024) {
        toast.error(t("imageUpload.fileSizeLimit"));
        setPreview(value || null);
        return;
      }

      const supabase = createClient();
      let publicUrl = "";
      let uploadedPath = "";

      // Prefer server-side `/api/upload` so Sharp ensures optimal WebP encoding
      try {
        const formData = new FormData();
        formData.append("file", uploadFile);
        formData.append("folder", folder);

        const apiRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (apiRes.ok) {
          const apiData = await apiRes.json();
          if (apiData?.url) {
            publicUrl = apiData.url;
            uploadedPath = apiData.path || "";
          }
        }
      } catch {
        // Fallback to direct Supabase upload with client-compressed file below
      }

      if (!publicUrl) {
        const timestamp = Date.now();
        const fileExt = uploadFile.name.split(".").pop() || "webp";
        const fileName = `${timestamp}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePathLocal = `${folder}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(filePathLocal, uploadFile, {
            contentType: uploadFile.type || file.type,
            cacheControl: "31536000",
          });

        if (uploadError) {
          console.error("Supabase storage upload error:", uploadError);
          throw uploadError;
        }

        const { data: publicData } = supabase.storage.from("images").getPublicUrl(filePathLocal);
        publicUrl = publicData.publicUrl;
        uploadedPath = filePathLocal;
      }

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
      setFilePath(uploadedPath);
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
          referrerPolicy="no-referrer"
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
