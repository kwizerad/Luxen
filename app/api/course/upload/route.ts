import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/permissions";
import { compressUploadedImage } from "@/lib/server-image-compress";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
  "image/tiff",
]);

const MAX_RAW_IMAGE_BYTES = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let userIsAdmin = isAdmin(user);
    if (!userIsAdmin) {
      try {
        const adminSb = createAdminClient();
        const { data: profile } = await adminSb
          .from("user_profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        if (profile?.role?.toLowerCase() === "admin") {
          userIsAdmin = true;
        }
      } catch {}
    }

    if (!userIsAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const rawFolder = (formData.get("folder") as string | null) || "editor/images";
    const folder = rawFolder.replace(/[^a-zA-Z0-9/_-]/g, "").replace(/^\/+|\/+$/g, "") || "editor/images";

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    const mime = (file.type || "").toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(mime) && !mime.startsWith("image/")) {
      return NextResponse.json({ error: `Unsupported image type: ${file.type}` }, { status: 400 });
    }

    if (file.size > MAX_RAW_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image size must be less than 25MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const rawBuffer = Buffer.from(bytes);

    const {
      buffer,
      contentType,
      extension,
      originalBytes,
      compressedBytes,
      savedPercent,
    } = await compressUploadedImage(rawBuffer, file.type || "image/png", file.name, {
      maxDimension: 1280,
      quality: 80,
      minBytesToCompress: 12 * 1024,
    });

    const baseName = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 40) || "image";
    const filePath = `${folder}/${Date.now()}-${baseName}.${extension}`;

    const adminSb = createAdminClient();
    const { error: uploadError } = await adminSb.storage
      .from("course-assets")
      .upload(filePath, buffer, {
        contentType,
        cacheControl: "31536000",
        upsert: true,
      });

    if (uploadError) {
      console.error("[CourseUpload] Storage error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicData } = adminSb.storage.from("course-assets").getPublicUrl(filePath);

    return NextResponse.json({
      url: publicData.publicUrl,
      publicUrl: publicData.publicUrl,
      path: filePath,
      originalBytes,
      compressedBytes,
      savedPercent,
    });
  } catch (error: unknown) {
    console.error("[CourseUpload] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to upload course image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
