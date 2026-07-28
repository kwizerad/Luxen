"use client";

import { ProgressRing } from './dashboard-widgets';
import { calculateProfileCompletion } from '@/lib/dashboard-utils';
import { Button } from '@/components/ui/button';
import { Edit2, CheckCircle2, UserCircle2 } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { Skeleton } from '@/components/ui/skeleton';

interface ProfileCompletionProps {
  userMetadata: Record<string, any>;
  onEditClick?: () => void;
  isLoading?: boolean;
}

export function ProfileCompletion({ userMetadata, onEditClick, isLoading = false }: ProfileCompletionProps) {
  const { t } = useLanguage();
  const completionPercentage = calculateProfileCompletion(userMetadata);
  const isComplete = completionPercentage === 100;

  const requiredFields = [
    { key: 'first_name', label: t("firstName") },
    { key: 'last_name', label: t("lastName") },
    { key: 'email', label: t("email") },
    { key: 'phone', label: t("phone") },
    { key: 'birthdate', label: t("dateOfBirth") },
    { key: 'nationality', label: t("nationality") },
    { key: 'avatar_url', label: t("profilePicture") },
  ];

  const filledFields = requiredFields.filter((field) => userMetadata[field.key] && String(userMetadata[field.key]).trim() !== '');

  if (isLoading) {
    return (
      <div className="premium-dash-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <Skeleton className="h-2 w-full rounded-full mb-3" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="premium-dash-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="premium-dash-icon premium-icon-blue !w-10 !h-10">
            <UserCircle2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="premium-dash-title truncate">{t("profileCompletion")}</h3>
            <p className="premium-dash-subtitle line-clamp-1">{t("profileCompletion.description")}</p>
          </div>
        </div>
        {isComplete && (
          <div className="premium-dash-icon premium-icon-green !w-9 !h-9 !rounded-full">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="premium-progress-track mb-2">
              <div
                className="premium-progress-fill"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {filledFields.length} {t("profileCompletion.of")} {requiredFields.length} {t("profileCompletion.fieldsCompleted")}
            </p>
          </div>
          <span className="text-2xl font-bold tracking-tight shrink-0">{completionPercentage}%</span>
        </div>

        {/* Missing fields */}
        {!isComplete && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("profileCompletion.missingFields")}</p>
            <div className="grid grid-cols-2 gap-2">
              {requiredFields
                .filter((field) => !userMetadata[field.key] || String(userMetadata[field.key]).trim() === '')
                .map((field) => (
                  <div
                    key={field.key}
                    className="text-xs text-muted-foreground px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.04] line-clamp-1"
                  >
                    • {field.label}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Action button */}
        {!isComplete && (
          <Button onClick={onEditClick} variant="default" size="sm" className="w-full">
            <Edit2 className="h-3.5 w-3.5 mr-2" />
            {t("profileCompletion.completeProfile")}
          </Button>
        )}
      </div>
    </div>
  );
}
