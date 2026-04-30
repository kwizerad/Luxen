"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, X, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (file: File) => {
    // Validate file
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
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
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      // Use profile-picture API for profile pictures, otherwise use upload API
      const apiUrl = folder === "profile-pictures" ? "/api/profile-picture" : "/api/upload";
      
      const res = await fetch(apiUrl, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.url) {
        onChange(data.url);
        setFilePath(data.path);
        toast.success("Image uploaded successfully");
      } else {
        toast.error(data.error || "Failed to upload image");
        setPreview(null);
      }
    } catch (error) {
      toast.error("Failed to upload image");
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
        await fetch(`/api/upload?path=${encodeURIComponent(filePath)}`, {
          method: "DELETE",
        });
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
          alt="Uploaded"
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
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Uploading...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Click or drag image here</p>
          <p className="text-xs text-muted-foreground">
            PNG, JPG, GIF up to 5MB
          </p>
        </div>
      )}
    </div>
  );
}
