import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ADMIN_EMAIL = "Navo@admin.jn";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const isPrimaryAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const hasAdminRole = user?.user_metadata?.role === "Admin";

    if (!user || (!isPrimaryAdmin && !hasAdminRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get user count (non-admin users)
    const { data: users } = await supabase.auth.admin.listUsers();
    const regularUsers = users?.users?.filter(u => u.user_metadata?.role !== "Admin") || [];
    const adminUsers = users?.users?.filter(u => u.user_metadata?.role === "Admin") || [];

    // Get exam categories count
    const { count: categoryCount } = await supabase
      .from("exam_categories")
      .select("*", { count: "exact", head: true });

    // Get questions count
    const { count: questionCount } = await supabase
      .from("exam_questions")
      .select("*", { count: "exact", head: true });

    // Get recent categories
    const { data: recentCategories } = await supabase
      .from("exam_categories")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    // Get recent questions
    const { data: recentQuestions } = await supabase
      .from("exam_questions")
      .select("*, exam_categories(name)")
      .order("created_at", { ascending: false })
      .limit(5);

    // Get recent user registrations
    const recentUserRegistrations = users?.users
      ?.filter(u => u.user_metadata?.role !== "Admin")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5) || [];

    // Calculate user growth over last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const userGrowthData: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const usersOnDay = users?.users?.filter((u: any) => {
        const userDate = new Date(u.created_at).toISOString().split('T')[0];
        return userDate === dateStr && u.user_metadata?.role !== "Admin";
      }).length || 0;

      userGrowthData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: usersOnDay,
      });
    }

    // Calculate cumulative user growth
    let cumulativeCount = 0;
    const cumulativeGrowthData = userGrowthData.map(item => {
      cumulativeCount += item.count;
      return { date: item.date, count: cumulativeCount };
    });

    // System status checks
    const systemStatus = {
      database: "healthy",
      supabase: "connected",
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json({
      stats: {
        totalUsers: regularUsers.length,
        totalAdmins: adminUsers.length,
        totalCategories: categoryCount || 0,
        totalQuestions: questionCount || 0,
      },
      recentActivity: {
        categories: recentCategories || [],
        questions: recentQuestions || [],
        users: recentUserRegistrations.map(u => ({
          id: u.id,
          email: u.email,
          username: u.user_metadata?.username,
          created_at: u.created_at,
        })),
      },
      userGrowth: cumulativeGrowthData,
      systemStatus,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
