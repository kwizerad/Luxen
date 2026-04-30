import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
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
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExt = file.name.split(".").pop();
    const fileName = `profile-pictures/${user.id}/${timestamp}.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      // If bucket doesn't exist, try using exam-files as fallback
      const fallbackFileName = `profile-pictures/${user.id}/${timestamp}.${fileExt}`;
      const { data: fallbackData, error: fallbackError } = await supabase.storage
        .from("exam-files")
        .upload(fallbackFileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (fallbackError) {
        return NextResponse.json({ error: fallbackError.message }, { status: 500 });
      }

      // Get public URL from fallback bucket
      const { data: { publicUrl } } = supabase.storage
        .from("exam-files")
        .getPublicUrl(fallbackFileName);

      return NextResponse.json({ 
        url: publicUrl,
        path: fallbackFileName,
        name: file.name,
        size: file.size,
      });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    return NextResponse.json({ 
      url: publicUrl,
      path: fileName,
      name: file.name,
      size: file.size,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json({ error: "No path provided" }, { status: 400 });
    }

    // Only allow users to delete their own files
    if (!path.includes(user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Try avatars bucket first
    let error = await supabase.storage.from("avatars").remove([path]).then(({ error: e }) => e);
    
    // If that fails, try exam-files bucket
    if (error) {
      error = await supabase.storage.from("exam-files").remove([path]).then(({ error: e }) => e);
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
