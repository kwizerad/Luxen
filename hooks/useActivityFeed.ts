import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { generateActivityFeed, ActivityItem } from '@/lib/dashboard-utils';

interface UseActivityFeedReturn {
  activities: ActivityItem[];
  loading: boolean;
  error: string | null;
  filterByType: (type: ActivityItem['type']) => ActivityItem[];
}

/**
 * Hook to fetch and manage activity feed
 */
export function useActivityFeed(userId?: string): UseActivityFeedReturn {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const fetchActivity = async () => {
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

        // Fetch exam attempts for activity feed
        const { data: attempts, error: attemptsError } = await supabase
          .from('exam_attempts')
          .select('*')
          .eq('user_id', user)
          .order('completed_at', { ascending: false })
          .limit(20);

        if (attemptsError) throw attemptsError;

        // Generate activity feed
        const feed = generateActivityFeed(attempts || []);
        setActivities(feed);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch activity feed';
        setError(errorMessage);
        console.error('Activity feed error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [userId]);

  const filterByType = (type: ActivityItem['type']) => {
    return activities.filter((activity) => activity.type === type);
  };

  return {
    activities,
    loading,
    error,
    filterByType,
  };
}
