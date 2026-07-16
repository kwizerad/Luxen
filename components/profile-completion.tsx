"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressRing } from './dashboard-widgets';
import { calculateProfileCompletion } from '@/lib/dashboard-utils';
import { Button } from '@/components/ui/button';
import { Edit2, CheckCircle2 } from 'lucide-react';

interface ProfileCompletionProps {
  userMetadata: Record<string, any>;
  onEditClick?: () => void;
  isLoading?: boolean;
}

export function ProfileCompletion({ userMetadata, onEditClick, isLoading = false }: ProfileCompletionProps) {
  const completionPercentage = calculateProfileCompletion(userMetadata);
  const isComplete = completionPercentage === 100;

  const requiredFields = [
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'birthdate', label: 'Date of Birth' },
    { key: 'nationality', label: 'Nationality' },
    { key: 'avatar_url', label: 'Profile Picture' },
  ];

  const filledFields = requiredFields.filter((field) => userMetadata[field.key] && String(userMetadata[field.key]).trim() !== '');

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Profile Completion</CardTitle>
            <CardDescription>Complete your profile to unlock all features</CardDescription>
          </div>
          {isComplete && <CheckCircle2 className="h-6 w-6 text-green-500" />}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="bg-secondary rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {filledFields.length} of {requiredFields.length} fields completed
              </p>
            </div>
            <span className="text-2xl font-bold ml-4">{completionPercentage}%</span>
          </div>

          {!isComplete && (
            <div className="space-y-2">
              <p className="text-sm font-medium mb-3">Missing fields:</p>
              <div className="grid grid-cols-2 gap-2">
                {requiredFields
                  .filter((field) => !userMetadata[field.key] || String(userMetadata[field.key]).trim() === '')
                  .map((field) => (
                    <div key={field.key} className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded">
                      • {field.label}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {!isComplete && (
            <Button onClick={onEditClick} variant="default" size="sm" className="w-full">
              <Edit2 className="h-4 w-4 mr-2" />
              Complete Profile
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
