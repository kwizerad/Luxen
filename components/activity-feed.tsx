"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRelativeTime, ActivityItem } from '@/lib/dashboard-utils';
import { CheckCircle2, Medal, Star, Zap, Trophy, Calendar } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { Loader2 } from 'lucide-react';

interface ActivityFeedProps {
  activities: ActivityItem[];
  loading?: boolean;
  maxItems?: number;
  onActivityClick?: (activity: ActivityItem) => void;
}

export function ActivityFeed({ activities, loading = false, maxItems = 5, onActivityClick }: ActivityFeedProps) {
  const { t } = useLanguage();
  const displayActivities = activities.slice(0, maxItems);

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'exam_completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'achievement_unlocked':
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 'milestone_reached':
        return <Star className="h-5 w-5 text-purple-500" />;
      case 'profile_updated':
        return <Zap className="h-5 w-5 text-blue-500" />;
      default:
        return <Calendar className="h-5 w-5 text-gray-500" />;
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'exam_completed':
        return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800';
      case 'achievement_unlocked':
        return 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800';
      case 'milestone_reached':
        return 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800';
      case 'profile_updated':
        return 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("recentActivity")}</CardTitle>
        <CardDescription>{t("activityFeed.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {displayActivities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t("activityFeed.empty")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayActivities.map((activity) => (
              <div
                key={activity.id}
                onClick={() => onActivityClick?.(activity)}
                className={`flex gap-4 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${getActivityColor(activity.type)}`}
              >
                <div className="flex-shrink-0 mt-1">{getActivityIcon(activity.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{activity.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{activity.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatRelativeTime(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
