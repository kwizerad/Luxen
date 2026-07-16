"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Zap, Trophy, TrendingUp, Target } from 'lucide-react';
import { memo } from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
  };
  description?: string;
  onClick?: () => void;
}

export const KPICard = memo(function KPICard({ title, value, unit, icon, trend, description, onClick }: KPICardProps) {
  return (
    <Card
      className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className="text-primary">{icon}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {typeof value === 'number' ? Math.round(value) : value}
            </span>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          </div>
          {trend && (
            <div className="flex items-center gap-1">
              {trend.direction === 'up' && (
                <ArrowUpRight className="h-4 w-4 text-green-500" />
              )}
              {trend.direction === 'down' && (
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              )}
              <span
                className={`text-xs font-medium ${
                  trend.direction === 'up'
                    ? 'text-green-600'
                    : trend.direction === 'down'
                      ? 'text-red-600'
                      : 'text-muted-foreground'
                }`}
              >
                {trend.percentage > 0 ? '+' : ''}{trend.percentage}%
              </span>
            </div>
          )}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </CardContent>
    </Card>
  );
});

interface ProgressRingProps {
  percentage: number;
  label: string;
  size?: number;
}

export const ProgressRing = memo(function ProgressRing({ percentage, label, size = 120 }: ProgressRingProps) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-secondary"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="text-primary transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold">{percentage}%</span>
        </div>
      </div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
});

interface StatBadgeProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

export const StatBadge = memo(function StatBadge({ label, value, icon, variant = 'default', size = 'md' }: StatBadgeProps) {
  const variantClasses = {
    default: 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
    success: 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100',
    warning: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100',
    info: 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100',
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <div className={`rounded-full flex items-center gap-2 font-medium ${variantClasses[variant]} ${sizeClasses[size]}`}>
      {icon && <span>{icon}</span>}
      <span>{value}</span>
      <span className="opacity-75">{label}</span>
    </div>
  );
});

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState = memo(function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 text-4xl opacity-50">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-xs">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
});
