// Dashboard utility functions for calculations and data formatting

export interface ExamStats {
  totalExams: number;
  averageScore: number;
  bestScore: number;
  worstScore: number;
  totalTime: number;
  completedExams: number;
  passRate: number;
}

export interface CategoryPerformance {
  categoryId: string;
  categoryName: string;
  attempts: number;
  averageScore: number;
  bestScore: number;
  lastAttempt?: Date;
}

export interface ActivityItem {
  id: string;
  type: 'exam_completed' | 'profile_updated' | 'achievement_unlocked' | 'milestone_reached';
  title: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Calculate exam statistics from attempt data
 */
export function calculateExamStats(attempts: any[]): ExamStats {
  if (!attempts || attempts.length === 0) {
    return {
      totalExams: 0,
      averageScore: 0,
      bestScore: 0,
      worstScore: 0,
      totalTime: 0,
      completedExams: 0,
      passRate: 0,
    };
  }

  const completedAttempts = attempts.filter((a) => a.status === 'completed' || a.score_percentage !== null);
  const scores = completedAttempts.map((a) => a.score_percentage || 0);
  
  const totalTime = completedAttempts.reduce((sum, a) => sum + (a.duration_seconds || 0), 0);
  const passCount = completedAttempts.filter((a) => (a.score_percentage || 0) >= 50).length;

  return {
    totalExams: attempts.length,
    averageScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    bestScore: scores.length > 0 ? Math.max(...scores) : 0,
    worstScore: scores.length > 0 ? Math.min(...scores) : 0,
    totalTime: totalTime,
    completedExams: completedAttempts.length,
    passRate: completedAttempts.length > 0 ? Math.round((passCount / completedAttempts.length) * 100) : 0,
  };
}

/**
 * Group exam attempts by category
 */
export function groupByCategory(attempts: any[]): CategoryPerformance[] {
  const grouped: Record<string, any> = {};

  attempts.forEach((attempt) => {
    const categoryId = attempt.category_id || 'unknown';
    const categoryName = attempt.category_name || 'Unknown Category';

    if (!grouped[categoryId]) {
      grouped[categoryId] = {
        categoryId,
        categoryName,
        attempts: 0,
        scores: [],
        lastAttempt: null,
      };
    }

    grouped[categoryId].attempts += 1;
    grouped[categoryId].scores.push(attempt.score_percentage || 0);
    
    const attemptDate = new Date(attempt.completed_at);
    if (!grouped[categoryId].lastAttempt || attemptDate > grouped[categoryId].lastAttempt) {
      grouped[categoryId].lastAttempt = attemptDate;
    }
  });

  return Object.values(grouped).map((cat) => ({
    categoryId: cat.categoryId,
    categoryName: cat.categoryName,
    attempts: cat.attempts,
    averageScore: cat.scores.length > 0 ? Math.round(cat.scores.reduce((a: number, b: number) => a + b, 0) / cat.scores.length) : 0,
    bestScore: cat.scores.length > 0 ? Math.max(...cat.scores) : 0,
    lastAttempt: cat.lastAttempt,
  }));
}

/**
 * Format time duration in seconds to readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

/**
 * Calculate profile completion percentage
 */
export function calculateProfileCompletion(userMetadata: Record<string, any>): number {
  const fields = [
    'first_name',
    'last_name',
    'email',
    'avatar_url',
    'phone',
    'birthdate',
    'nationality',
    'address',
    'city',
    'state',
    'zip_code',
  ];

  const filledFields = fields.filter((field) => userMetadata[field] && String(userMetadata[field]).trim() !== '').length;
  return Math.round((filledFields / fields.length) * 100);
}

/**
 * Get trending direction for a metric
 */
export function getTrendingDirection(
  current: number,
  previous: number
): 'up' | 'down' | 'stable' {
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'stable';
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString();
}

/**
 * Generate mock activity feed data (replace with real data fetching)
 */
export function generateActivityFeed(attempts: any[]): ActivityItem[] {
  const activities: ActivityItem[] = [];

  attempts.slice(0, 10).forEach((attempt) => {
    activities.push({
      id: `exam-${attempt.id}`,
      type: 'exam_completed',
      title: `Completed ${attempt.category_name}`,
      description: `Scored ${attempt.score_percentage}% with ${attempt.correct_answers}/${attempt.total_questions} correct answers`,
      timestamp: new Date(attempt.completed_at),
      metadata: {
        score: attempt.score_percentage,
        categoryName: attempt.category_name,
      },
    });
  });

  return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Calculate streak (consecutive days of activity)
 */
export function calculateStreak(attempts: any[]): number {
  if (!attempts || attempts.length === 0) return 0;

  const dates = attempts
    .map((a) => new Date(a.completed_at).toDateString())
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort()
    .reverse();

  let streak = 1;
  const today = new Date();

  for (let i = 0; i < dates.length - 1; i++) {
    const currentDate = new Date(dates[i]);
    const nextDate = new Date(dates[i + 1]);
    const diffDays = Math.floor((currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  // Check if streak is broken (last activity not today or yesterday)
  if (dates.length > 0) {
    const lastDate = new Date(dates[0]);
    const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 1) return 0;
  }

  return streak;
}
