"use client";

import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, Minus, type LucideIcon } from 'lucide-react';
import React, { memo } from 'react';

/* ---------- Mini Sparkline ---------- */
/* A lightweight inline SVG sparkline rendered from a small data array. */
function MiniSparkline({
  data,
  color = '#6366F1',
  width = 80,
  height = 28,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;
  const gradId = `spark-${color.replace('#', '')}`;

  return (
    <svg width={width} height={height} className="premium-sparkline" viewBox={`0 0 ${width} ${height}`} fill="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradId})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---------- Mini Progress Bar ---------- */
function MiniProgress({ percentage, color }: { percentage: number; color?: string }) {
  return (
    <div className="premium-progress-track">
      <div
        className="premium-progress-fill"
        style={{
          width: `${Math.min(100, Math.max(0, percentage))}%`,
          background: color
            ? `linear-gradient(90deg, ${color}, ${color}aa)`
            : undefined,
        }}
      />
    </div>
  );
}

/* ---------- KPICard ---------- */
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
  sparklineData?: number[];
  sparklineColor?: string;
  progressPercentage?: number;
  progressColor?: string;
  iconVariant?: 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'teal';
}

export const KPICard = memo(function KPICard({
  title,
  value,
  unit,
  icon,
  trend,
  description,
  onClick,
  sparklineData,
  sparklineColor,
  progressPercentage,
  progressColor,
  iconVariant = 'blue',
}: KPICardProps) {
  const iconClass = `premium-dash-icon premium-icon-${iconVariant}`;

  return (
    <div className="premium-kpi-card group" onClick={onClick}>
      {/* Mobile: vertical compact layout (4-in-a-row) */}
      <div className="flex flex-col items-center gap-1 p-2 text-center sm:hidden">
        <div className={cn(iconClass, '!w-7 !h-7 !rounded-lg')}>
          {React.isValidElement(icon)
            ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
                className: cn('h-3.5 w-3.5', (icon.props as { className?: string }).className),
              })
            : icon}
        </div>
        <div className="flex items-baseline gap-0.5">
          <span className="text-sm font-bold leading-none">
            {typeof value === 'number' ? Math.round(value) : value}
          </span>
          {unit && <span className="text-[9px] text-muted-foreground leading-none">{unit}</span>}
        </div>
        <span className="text-[9px] font-medium text-muted-foreground leading-tight line-clamp-2">
          {title}
        </span>
      </div>

      {/* Tablet & Desktop: premium horizontal layout */}
      <div className="hidden sm:flex sm:flex-col p-6 h-full">
        {/* Header: label + icon */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <span className="premium-dash-label line-clamp-1">{title}</span>
          <div className={iconClass}>
            {React.isValidElement(icon)
              ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
                  className: cn('h-5 w-5', (icon.props as { className?: string }).className),
                })
              : icon}
          </div>
        </div>

        {/* Value */}
        <div className="flex items-baseline gap-1.5 mb-3">
          <span className="premium-dash-value">
            {typeof value === 'number' ? Math.round(value) : value}
          </span>
          {unit && <span className="text-sm font-medium text-muted-foreground">{unit}</span>}
        </div>

        {/* Trend / description / sparkline / progress */}
        <div className="mt-auto space-y-2">
          {trend && (
            <div className={
              trend.direction === 'up' ? 'premium-trend-up' :
              trend.direction === 'down' ? 'premium-trend-down' :
              'premium-trend-stable'
            }>
              {trend.direction === 'up' && <ArrowUpRight className="h-3.5 w-3.5" />}
              {trend.direction === 'down' && <ArrowDownRight className="h-3.5 w-3.5" />}
              {trend.direction === 'stable' && <Minus className="h-3.5 w-3.5" />}
              <span>{trend.percentage > 0 ? '+' : ''}{trend.percentage}%</span>
            </div>
          )}

          {sparklineData && sparklineData.length >= 2 && (
            <MiniSparkline data={sparklineData} color={sparklineColor || '#6366F1'} />
          )}

          {typeof progressPercentage === 'number' && (
            <MiniProgress percentage={progressPercentage} color={progressColor} />
          )}

          {description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
});

/* ---------- ProgressRing ---------- */
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
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <defs>
            <linearGradient id="premium-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth="6"
            className="premium-ring-bg"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="premium-ring-fill"
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

/* ---------- StatBadge ---------- */
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

/* ---------- EmptyState ---------- */
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
      <div className="premium-empty-icon">
        {React.isValidElement(icon)
          ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
              className: cn('h-7 w-7 text-muted-foreground', (icon.props as { className?: string }).className),
            })
          : icon}
      </div>
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
