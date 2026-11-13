"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Users,
  UserPlus,
  ArrowLeft,
  Check,
  X,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { canViewUserAvatar } from "@/lib/avatar-helper";
import { getExamCategories } from "@/lib/supabase/queries";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ClassmateProfile {
  id: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  last_seen?: string;
  is_friend?: boolean;
}

interface GroupExamCreationProps {
  onBack: () => void;
  onStartExam: (categoryId: string, inviteeIds: string[]) => void;
}

export function GroupExamCreation({ onBack, onStartExam }: GroupExamCreationProps) {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [allUsers, setAllUsers] = useState<ClassmateProfile[]>([]);
  const [categories, setCategories] = useState<
    {
      id: string;
      name: string;
      description?: string;
      duration_minutes?: number;
      question_count?: number;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [selectedInvitees, setSelectedInvitees] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, [user]);

  // Hide dock nav while in group exam creation flow
  useEffect(() => {
    sessionStorage.setItem("group-creation-active", "true");
    window.dispatchEvent(new CustomEvent("group-creation-state-change"));
    return () => {
      sessionStorage.removeItem("group-creation-active");
      window.dispatchEvent(new CustomEvent("group-creation-state-change"));
    };
  }, []);

  // Auto-select category when available
  useEffect(() => {
    if (!loading && categories.length >= 1 && !selectedCategory) {
      setSelectedCategory(categories[0].id);
    }
  }, [loading, categories, selectedCategory]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [requestsRes, categoriesData] = await Promise.all([
        fetch("/api/classmate-requests")
          .then((r) => r.json())
          .catch(() => ({ requests: [] })),
        getExamCategories(),
      ]);

      const requestsData = requestsRes as { requests?: any[]; is_public?: boolean };
      const categoriesList = (categoriesData.categories || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        duration_minutes: c.duration_minutes,
        question_count: c.question_count,
      }));

      const allRequests: any[] = requestsData.requests || [];
      const combinedMap = new Map<string, ClassmateProfile>();

      for (const r of allRequests) {
        if (r.status === "accepted" && r.other_user && r.other_user.id !== user.id) {
          const u = r.other_user;
          if (!combinedMap.has(u.id)) {
            combinedMap.set(u.id, {
              id: u.id,
              full_name: u.full_name || u.username || "Friend",
              username: u.username,
              avatar_url: u.avatar_url,
              last_seen: u.last_seen,
              is_friend: true,
            });
          }
        }
      }

      const mergedList = Array.from(combinedMap.values()).sort((a, b) =>
        (a.full_name || "").localeCompare(b.full_name || "")
      );

      setAllUsers(mergedList);
      setCategories(categoriesList);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error(t("failedToLoadData") || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const filteredInvitees = allUsers.filter((f) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return f.full_name?.toLowerCase().includes(q) || f.username?.toLowerCase().includes(q);
  });

  const filteredCategories = categories.filter((c) => {
    if (!categorySearchQuery) return true;
    const q = categorySearchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q);
  });

  const toggleInvitee = (id: string) => {
    setSelectedInvitees((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (filteredInvitees.length === 0) return;
    const allSelected = filteredInvitees.every((f) => selectedInvitees.has(f.id));
    setSelectedInvitees((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        filteredInvitees.forEach((f) => next.delete(f.id));
      } else {
        filteredInvitees.forEach((f) => next.add(f.id));
      }
      return next;
    });
  };

  const areAllFilteredSelected =
    filteredInvitees.length > 0 && filteredInvitees.every((f) => selectedInvitees.has(f.id));

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleStartExam = async () => {
    if (!selectedCategory) {
      toast.error(t("selectCategory") || "Please select a category");
      return;
    }
    const cleanInvitees = Array.from(selectedInvitees).filter((id) => id && id !== user?.id);
    if (cleanInvitees.length === 0) {
      toast.error(t("selectInvitees") || "Please select at least one person to invite");
      return;
    }
    setSubmitting(true);
    try {
      await onStartExam(selectedCategory, cleanInvitees);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategoryObj = categories.find((c) => c.id === selectedCategory);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[320px]">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-primary border-t-transparent mb-3" />
        <p className="text-xs sm:text-sm text-muted-foreground">{t("loading") || "Loading..."}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full max-w-4xl mx-auto">
      {/* Scrollable Main Canvas */}
      <div className="flex-1 overflow-y-auto px-3.5 sm:px-6 pt-4 sm:pt-6 pb-6 space-y-5">
        {/* Unified Top Header (No nested boxes) */}
        <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-4">
          <div className="space-y-1 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-1 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t("back") || "Back"}</span>
            </button>
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
              {t("createGroupExam") || "Create Group Exam"}
            </h1>
          </div>
        </div>

        {/* Quiet Inline Exam Category Selector (Only expands when > 1 category exists) */}
        {categories.length === 1 ? (
          <div className="flex items-center justify-between gap-2 text-xs sm:text-sm text-muted-foreground">
            <span className="truncate font-medium text-foreground">
              {categories[0].name}
            </span>
            <span className="tabular-nums shrink-0">
              {categories[0].question_count ?? 20} Q · {categories[0].duration_minutes ?? 20}m
            </span>
          </div>
        ) : categories.length > 1 ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {t("selectCategory") || "Category"}
              </span>
              {categories.length > 5 && (
                <div className="relative w-44">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder={t("searchCategories") || "Filter..."}
                    value={categorySearchQuery}
                    onChange={(e) => setCategorySearchQuery(e.target.value)}
                    className="pl-8 pr-6 h-8 text-xs rounded-lg"
                  />
                  {categorySearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCategorySearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {filteredCategories.map((category) => {
                const isSelected = selectedCategory === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategory(category.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted/40"
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 shrink-0" />}
                    <span className="truncate max-w-[200px]">{category.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Primary Focal Area: Invite Classmates List (Single Clean Container) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs sm:text-sm text-muted-foreground tabular-nums">
              <span className="font-semibold text-foreground">
                {t("selectInvitees") || "Invite Classmates"}
              </span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span>
                {selectedInvitees.size}/{filteredInvitees.length}
              </span>
            </div>

            {filteredInvitees.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-border/60 hover:bg-muted/50 text-foreground transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {areAllFilteredSelected ? (
                  <>
                    <CheckSquare className="h-3.5 w-3.5 text-primary" />
                    <span>{t("deselectAll") || "Deselect All"}</span>
                  </>
                ) : (
                  <>
                    <Square className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{t("selectAll") || "Select All"}</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchFriends") || "Search friends..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 sm:h-10 rounded-xl text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Unified Hairline-Divided Roster (No nested cards) */}
          <div className="border border-border/60 rounded-xl divide-y divide-border/50 overflow-hidden bg-card/40 dark:bg-zinc-900/30">
            {filteredInvitees.length === 0 ? (
              <div className="text-center py-10 px-4 text-xs sm:text-sm text-muted-foreground space-y-2">
                <Users className="h-7 w-7 mx-auto text-muted-foreground/40" />
                <p>
                  {searchQuery
                    ? t("noResults") || "No matching friends found"
                    : t("noFriendsToInvite") || "No friends to invite yet"}
                </p>
              </div>
            ) : (
              <div className="max-h-[45vh] overflow-y-auto divide-y divide-border/50">
                {filteredInvitees.map((invitee) => {
                  const isSelected = selectedInvitees.has(invitee.id);
                  return (
                    <div
                      key={invitee.id}
                      onClick={() => toggleInvitee(invitee.id)}
                      className={cn(
                        "flex items-center gap-3 px-3.5 py-2.5 sm:px-4 sm:py-3 transition-colors cursor-pointer select-none",
                        isSelected
                          ? "bg-primary/[0.08] dark:bg-primary/15"
                          : "hover:bg-muted/40"
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleInvitee(invitee.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0"
                      />
                      <Avatar className="h-8 w-8 sm:h-9 sm:w-9 ring-1 ring-border/50 shrink-0">
                        {canViewUserAvatar(
                          invitee.avatar_url,
                          invitee.id,
                          user?.id,
                          user?.user_metadata?.role
                        ) && invitee.avatar_url ? (
                          <AvatarImage src={invitee.avatar_url} />
                        ) : (
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                            {getInitials(invitee.full_name || invitee.username)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {invitee.full_name || invitee.username}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          @{invitee.username || "student"}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clean Docked Action Bar (Zero floating card clutter, safe wrapping on narrow mobile) */}
      <div className="sticky bottom-0 z-20 border-t border-border/60 bg-background/95 dark:bg-zinc-950/95 backdrop-blur-xl px-3.5 sm:px-6 py-3 space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground tabular-nums">
          <span className="truncate min-w-0">
            {selectedCategoryObj?.name || t("noCategorySelected") || "Select category"}
          </span>
          <span className="shrink-0 font-medium text-foreground">
            {selectedInvitees.size} {t("selected") || "selected"}
          </span>
        </div>

        <Button
          type="button"
          onClick={handleStartExam}
          disabled={!selectedCategory || selectedInvitees.size === 0 || submitting}
          className="w-full min-h-[42px] h-auto py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold whitespace-normal text-center leading-snug"
        >
          {submitting ? (
            <>
              <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin shrink-0" />
              <span>{t("creatingExam") || "Creating Group Exam..."}</span>
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 shrink-0" />
              <span>
                {selectedInvitees.size > 0
                  ? `${t("createAndSendInvitations") || "Send Invitations"} (${selectedInvitees.size})`
                  : t("selectInvitees") || "Select classmates to invite"}
              </span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
