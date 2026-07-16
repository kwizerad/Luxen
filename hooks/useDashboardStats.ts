import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  calculateExamStats,
  groupByCategory,
  calculateStreak,
  ExamStats,
  CategoryPerformance,
} from '@/lib/dashboard-utils';

interface UseDashboardStatsReturn {
  stats: ExamStats;
  categoryPerformance: CategoryPerformance[];
  streak: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and calculate dashboard statistics
 */
export function useDashboardStats(userId?: string): UseDashboardStatsReturn {
  const [stats, setStats] = useState<ExamStats>({
    totalExams: 0,
    averageScore: 0,
    bestScore: 0,
    worstScore: 0,
    totalTime: 0,
    completedExams: 0,
    passRate: 0,
  });

  const [categoryPerformance, setCategoryPerformance] = useState<CategoryPerformance[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();

      // Get current user if userId not provided
      let user = userId;
      if (!user) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        user = authUser?.id;
        if (!user) throw new Error('User not authenticated');
      }

      // Fetch exam attempts
      const { data: attempts, error: attemptsError } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('user_id', user)
        .order('completed_at', { ascending: false });

      if (attemptsError) throw attemptsError;

      // Calculate stats
      const calculatedStats = calculateExamStats(attempts || []);
      const categoryBreakdown = groupByCategory(attempts || []);
      const calculatedStreak = calculateStreak(attempts || []);

      setStats(calculatedStats);
      setCategoryPerformance(categoryBreakdown);
      setStreak(calculatedStreak);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard stats';
      setError(errorMessage);
      console.error('Dashboard stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [userId]);

  return {
    stats,
    categoryPerformance,
    streak,
    loading,
    error,
    refetch: fetchStats,
  };
}
