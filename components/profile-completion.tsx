"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressRing } from './dashboard-widgets';
import { calculateProfileCompletion } from '@/lib/dashboard-utils';
import { Button } from '@/components/ui/button';
import { Edit2, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';

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
      <Card className="animate-pulse rounded-[14px] sm:rounded-[24px]">
        <CardHeader className="p-3 sm:p-6">
          <div className="h-5 sm:h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/2"></div>
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
          <div className="h-24 sm:h-32 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[14px] sm:rounded-[24px]">
      <CardHeader className="p-3 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm sm:text-base">{t("profileCompletion")}</CardTitle>
            <CardDescription className="text-[11px] sm:text-sm line-clamp-2">{t("profileCompletion.description")}</CardDescription>
          </div>
          {isComplete && <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 shrink-0" />}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
        <div className="space-y-3 sm:space-y-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="bg-secondary rounded-full h-2 sm:h-3 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 sm:mt-2">
                {filledFields.length} {t("profileCompletion.of")} {requiredFields.length} {t("profileCompletion.fieldsCompleted")}
              </p>
            </div>
            <span className="text-lg sm:text-2xl font-bold ml-2 sm:ml-4 shrink-0">{completionPercentage}%</span>
          </div>

          {!isComplete && (
            <div className="space-y-1.5 sm:space-y-2">
              <p className="text-xs sm:text-sm font-medium mb-2 sm:mb-3">{t("profileCompletion.missingFields")}</p>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                {requiredFields
                  .filter((field) => !userMetadata[field.key] || String(userMetadata[field.key]).trim() === '')
                  .map((field) => (
                    <div key={field.key} className="text-[10px] sm:text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded line-clamp-1">
                      • {field.label}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {!isComplete && (
            <Button onClick={onEditClick} variant="default" size="sm" className="w-full">
              <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              {t("profileCompletion.completeProfile")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
