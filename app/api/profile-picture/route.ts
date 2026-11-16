import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { compressUploadedImage } from "@/lib/server-image-compress";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Validate raw file size (10MB before automatic Sharp compression)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 });
    }

    // Compress and resize profile picture automatically with Sharp
    const bytes = await file.arrayBuffer();
    const rawBuffer = Buffer.from(bytes);
    const {
      buffer,
      contentType,
      extension,
      originalBytes,
      compressedBytes,
      savedPercent,
    } = await compressUploadedImage(rawBuffer, file.type, file.name, {
      maxDimension: 512,
      quality: 80,
      minBytesToCompress: 10 * 1024,
    });

    const fileName = `${user.id}.${extension}`;
    const filePath = `profile-pictures/${fileName}`;

    // Upload to Supabase Storage with long CDN cache
    const { error } = await supabase.storage
      .from("images")
      .upload(filePath, buffer, {
        contentType,
        cacheControl: "31536000",
        upsert: true,
      });

    if (error) {
      console.error("Supabase storage upload error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("images")
      .getPublicUrl(filePath);

    // Update user metadata with new avatar URL
    const { error: updateError } = await supabase.auth.updateUser({
      data: { avatar_url: publicUrl }
    });

    if (updateError) {
      console.error("Failed to update user metadata:", updateError);
    }

    return NextResponse.json({ 
      url: publicUrl, 
      path: filePath,
      originalBytes,
      compressedBytes,
      savedPercent,
      message: "Profile picture uploaded successfully" 
    });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload profile picture" }, 
      { status: 500 }
    );
  }
}
