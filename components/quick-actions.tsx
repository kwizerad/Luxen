"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { PlayCircle, FileText, Settings, BarChart3, Trophy, BookOpen, ArrowUpRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import { Skeleton } from '@/components/ui/skeleton';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'secondary';
  iconVariant?: 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'teal';
}

interface QuickActionsProps {
  actions?: QuickAction[];
  isLoading?: boolean;
}

const getDefaultActions = (t: (key: string) => string): QuickAction[] => [
  {
    id: 'take-exam',
    label: t("takeExam"),
    description: t("quickActions.startNewExam"),
    icon: <PlayCircle className="h-5 w-5" />,
    href: '/dashboard/exam',
    variant: 'primary',
    iconVariant: 'blue',
  },
  {
    id: 'view-results',
    label: t("quickActions.myResults"),
    description: t("quickActions.viewExamHistory"),
    icon: <Trophy className="h-5 w-5" />,
    href: '/userExam',
    variant: 'secondary',
    iconVariant: 'orange',
  },
  {
    id: 'analytics',
    label: t("quickActions.analytics"),
    description: t("quickActions.viewPerformance"),
    icon: <BarChart3 className="h-5 w-5" />,
    href: '/dashboard',
    variant: 'secondary',
    iconVariant: 'purple',
  },
  {
    id: 'settings',
    label: t("settings"),
    description: t("quickActions.manageProfile"),
    icon: <Settings className="h-5 w-5" />,
    href: '/dashboard/settings',
    variant: 'secondary',
    iconVariant: 'teal',
  },
];

export function QuickActions({ actions, isLoading = false }: QuickActionsProps) {
  const { t } = useLanguage();
  const displayActions = actions || getDefaultActions(t);

  if (isLoading) {
    return (
      <>
        <div className="flex sm:hidden gap-1.5 overflow-hidden -mx-1 px-1">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="flex-1 h-8 rounded-full" />
          ))}
        </div>
        <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="premium-quick-action p-6 min-h-[160px]">
              <Skeleton className="h-12 w-12 rounded-2xl mx-auto mb-4" />
              <Skeleton className="h-4 w-24 mx-auto mb-2" />
              <Skeleton className="h-3 w-32 mx-auto" />
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile: horizontal pill chips (icon + label inline) */}
      <div className="flex sm:hidden gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
        {displayActions.map((action) => {
          const isPrimary = action.variant === 'primary';
          return (
            <Link
              key={action.id}
              href={action.href || '#'}
              onClick={action.onClick}
              className={`no-underline shrink-0 flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 transition-all duration-200 active:scale-95 ${
                isPrimary
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/30'
                  : 'bg-card/60 text-foreground border-border/40 hover:bg-accent/50'
              }`}
            >
              {React.isValidElement(action.icon)
                ? React.cloneElement(action.icon as React.ReactElement<{ className?: string }>, {
                    className: cn(
                      'h-3.5 w-3.5 shrink-0',
                      (action.icon.props as { className?: string }).className
                    ),
                  })
                : action.icon}
              <span className="text-[10px] font-semibold leading-none whitespace-nowrap">
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Tablet & Desktop: premium glass card grid */}
      <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-4 gap-4">
        {displayActions.map((action) => {
          const isPrimary = action.variant === 'primary';
          const iconVariant = action.iconVariant || 'blue';
          return (
            <Link
              key={action.id}
              href={action.href || '#'}
              onClick={action.onClick}
              className="no-underline group"
            >
              <div
                className={cn(
                  'premium-quick-action h-full p-6 flex flex-col items-center text-center gap-4',
                  isPrimary && 'premium-quick-action-primary'
                )}
              >
                {/* Icon in soft circular gradient background */}
                <div className={cn('premium-dash-icon !w-12 !h-12 !rounded-2xl', `premium-icon-${iconVariant}`)}>
                  {React.isValidElement(action.icon)
                    ? React.cloneElement(action.icon as React.ReactElement<{ className?: string }>, {
                        className: cn('h-5 w-5', (action.icon.props as { className?: string }).className),
                      })
                    : action.icon}
                </div>

                {/* Label + description */}
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">{action.label}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{action.description}</p>
                </div>

                {/* Arrow reveal on hover */}
                <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <span>Open</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}

interface FloatingActionButtonProps {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  primary?: boolean;
}

export function FloatingActionButton({
  icon,
  label,
  href = '#',
  onClick,
  primary = true,
}: FloatingActionButtonProps) {
  return (
    <Link href={href} onClick={onClick}>
      <div
        className={`fixed bottom-8 right-8 rounded-full p-4 shadow-glass dark:shadow-glass-dark transition-all duration-300 hover:scale-110 cursor-pointer backdrop-blur-[24px] border border-border/20 ${
          primary
            ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-glow dark:hover:shadow-glow-dark'
            : 'bg-card/70 text-foreground hover:bg-card/90'
        }`}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-sm hidden sm:inline">{label}</span>
        </div>
      </div>
    </Link>
  );
}
