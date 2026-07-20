"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayCircle, FileText, Settings, BarChart3, Trophy, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'secondary';
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
  },
  {
    id: 'view-results',
    label: t("quickActions.myResults"),
    description: t("quickActions.viewExamHistory"),
    icon: <Trophy className="h-5 w-5" />,
    href: '/userExam',
    variant: 'secondary',
  },
  {
    id: 'analytics',
    label: t("quickActions.analytics"),
    description: t("quickActions.viewPerformance"),
    icon: <BarChart3 className="h-5 w-5" />,
    href: '/dashboard',
    variant: 'secondary',
  },
  {
    id: 'settings',
    label: t("settings"),
    description: t("quickActions.manageProfile"),
    icon: <Settings className="h-5 w-5" />,
    href: '/dashboard/settings',
    variant: 'secondary',
  },
];

export function QuickActions({ actions, isLoading = false }: QuickActionsProps) {
  const { t } = useLanguage();
  const displayActions = actions || getDefaultActions(t);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-muted/60 rounded-[24px] h-32 animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {displayActions.map((action) => (
        <Link
          key={action.id}
          href={action.href || '#'}
          onClick={action.onClick}
          className="no-underline"
        >
          <Card
            className={`h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer ${
              action.variant === 'primary'
                ? 'border-primary/50 bg-primary/5 hover:bg-primary/10'
                : ''
            }`}
          >
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    action.variant === 'primary'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {action.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{action.label}</h3>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
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
            ? 'bg-gradient-to-br from-primary to-[#3B82F6] text-primary-foreground hover:shadow-glow dark:hover:shadow-glow-dark'
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
