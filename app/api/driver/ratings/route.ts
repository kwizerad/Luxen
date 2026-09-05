import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get("driver_id");

    if (!driverId) {
      return NextResponse.json({ error: "Driver ID is required" }, { status: 400 });
    }

    const { data: ratings, error } = await supabase
      .from("driver_ratings")
      .select("*, student:student_id(id, full_name, username, avatar_url)")
      .eq("driver_id", driverId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const allRatings = ratings || [];
    const count = allRatings.length;
    const average = count > 0
      ? Math.round((allRatings.reduce((sum: number, r: any) => sum + r.rating, 0) / count) * 10) / 10
      : 0;

    return NextResponse.json({ ratings: allRatings, average, count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch ratings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { driver_id, rating, review } = body;

    if (!driver_id || !rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Driver ID and rating (1-5) are required" },
        { status: 400 }
      );
    }

    if (driver_id === user.id) {
      return NextResponse.json(
        { error: "You cannot rate yourself" },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from("driver_ratings")
      .select("id")
      .eq("driver_id", driver_id)
      .eq("student_id", user.id)
      .maybeSingle();

    if (existing) {
      const { data: updated, error } = await supabase
        .from("driver_ratings")
        .update({ rating, review, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ rating: updated, status: "success" });
    }

    const { data: created, error } = await supabase
      .from("driver_ratings")
      .insert([{ driver_id, student_id: user.id, rating, review }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ rating: created, status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create rating.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
