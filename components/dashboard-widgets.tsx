"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import React, { memo } from 'react';

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
      className="rounded-[12px] sm:rounded-[16px] lg:rounded-[24px] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
      onClick={onClick}
    >
      {/* Mobile: vertical compact layout (4-in-a-row) */}
      <div className="flex flex-col items-center gap-1 p-2 text-center sm:hidden">
        <div className="p-1 rounded-[6px] bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          {React.isValidElement(icon)
            ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
                className: cn('h-3 w-3', (icon.props as { className?: string }).className),
              })
            : icon}
        </div>
        <div className="flex items-baseline gap-0.5">
          <span className="text-sm font-bold leading-none">
            {typeof value === 'number' ? Math.round(value) : value}
          </span>
          {unit && <span className="text-[9px] text-muted-foreground leading-none">{unit}</span>}
        </div>
        <CardTitle className="text-[9px] font-medium text-muted-foreground leading-tight line-clamp-2">
          {title}
        </CardTitle>
      </div>

      {/* Tablet & Desktop: horizontal layout */}
      <div className="hidden sm:flex sm:flex-col">
        <CardHeader className="p-3 pb-2 lg:p-4 lg:pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-xs font-medium text-muted-foreground lg:text-sm line-clamp-1">{title}</CardTitle>
            <div className="p-1.5 rounded-[8px] bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0 lg:p-2 lg:rounded-[10px]">
              {React.isValidElement(icon)
                ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
                    className: cn(
                      'h-3.5 w-3.5 lg:h-4 lg:w-4',
                      (icon.props as { className?: string }).className
                    ),
                  })
                : icon}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 lg:p-4 lg:pt-0">
          <div className="space-y-1 lg:space-y-2">
            <div className="flex items-baseline gap-1.5 lg:gap-2">
              <span className="text-lg font-bold lg:text-2xl">
                {typeof value === 'number' ? Math.round(value) : value}
              </span>
              {unit && <span className="text-xs text-muted-foreground lg:text-sm">{unit}</span>}
            </div>
            {trend && (
              <div className="flex items-center gap-1">
                {trend.direction === 'up' && (
                  <ArrowUpRight className="h-3.5 w-3.5 text-green-500 lg:h-4 lg:w-4" />
                )}
                {trend.direction === 'down' && (
                  <ArrowDownRight className="h-3.5 w-3.5 text-red-500 lg:h-4 lg:w-4" />
                )}
                <span
                  className={`text-[10px] font-medium lg:text-xs ${
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
            {description && <p className="text-[10px] text-muted-foreground lg:text-xs line-clamp-1">{description}</p>}
          </div>
        </CardContent>
      </div>
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
          className="px-5 py-2.5 rounded-[14px] text-sm font-medium bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 hover:shadow-lg active:scale-[0.97] transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  );
});
