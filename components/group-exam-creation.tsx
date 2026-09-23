"use client";

import { useState, useEffect } from "react";
import { Search, Users, UserPlus, ArrowLeft, Check, X, FileText, Clock, Hash, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { canViewUserAvatar } from "@/lib/avatar-helper";
import { getExamCategories } from "@/lib/supabase/queries";
import { toast } from "sonner";

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
  const [activeTab, setActiveTab] = useState<"all" | "friends" | "classmates">("all");
  const [categories, setCategories] = useState<{ id: string; name: string; description?: string; duration_minutes?: number; question_count?: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [selectedInvitees, setSelectedInvitees] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, [user]);

  // Hide dock nav while in group exam creation flow on small devices
  useEffect(() => {
    sessionStorage.setItem("group-creation-active", "true");
    window.dispatchEvent(new CustomEvent("group-creation-state-change"));
    return () => {
      sessionStorage.removeItem("group-creation-active");
      window.dispatchEvent(new CustomEvent("group-creation-state-change"));
    };
  }, []);

  // Auto-select category when there's only one
  useEffect(() => {
    if (!loading && categories.length === 1 && !selectedCategory) {
      setSelectedCategory(categories[0].id);
    }
  }, [loading, categories, selectedCategory]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [requestsRes, classmatesRes, categoriesData] = await Promise.all([
        fetch("/api/classmate-requests").then((r) => r.json()).catch(() => ({ requests: [] })),
        fetch("/api/classmate-requests/classmates?exclude_friends=false").then((r) => r.json()).catch(() => ({ classmates: [] })),
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
      const acceptedFriendIds = new Set(
        allRequests
          .filter((r) => r.status === "accepted" && r.other_user?.id)
          .map((r) => r.other_user.id)
      );

      const classmatesList: any[] = (classmatesRes as any)?.classmates || [];
      const combinedMap = new Map<string, ClassmateProfile>();

      // 1. Add all from classmates API
      for (const c of classmatesList) {
        if (!c?.id || c.id === user.id) continue;
        combinedMap.set(c.id, {
          id: c.id,
          full_name: c.full_name || c.username || "Student",
          username: c.username,
          avatar_url: c.avatar_url,
          last_seen: c.last_seen,
          is_friend: acceptedFriendIds.has(c.id),
        });
      }

      // 2. Add any friends from requests that might not have been returned in classmates
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
          } else {
            const existing = combinedMap.get(u.id)!;
            existing.is_friend = true;
          }
        }
      }

      const mergedList = Array.from(combinedMap.values()).sort((a, b) => {
        if (a.is_friend && !b.is_friend) return -1;
        if (!a.is_friend && b.is_friend) return 1;
        return (a.full_name || "").localeCompare(b.full_name || "");
      });

      setAllUsers(mergedList);
      setCategories(categoriesList);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error(t("failedToLoadData") || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const friendsList = allUsers.filter((u) => u.is_friend);
  const nonFriendsList = allUsers.filter((u) => !u.is_friend);

  const displayedList = activeTab === "friends" ? friendsList : activeTab === "classmates" ? nonFriendsList : allUsers;

  const filteredInvitees = displayedList.filter((f) => {
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
        // Deselect all filtered
        filteredInvitees.forEach((f) => next.delete(f.id));
      } else {
        // Select all filtered
        filteredInvitees.forEach((f) => next.add(f.id));
      }
      return next;
    });
  };

  const areAllFilteredSelected =
    filteredInvitees.length > 0 && filteredInvitees.every((f) => selectedInvitees.has(f.id));

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
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
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t("loading") || "Loading..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] p-4 sm:p-6 pb-36 sm:pb-40">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted border border-border/40 transition-all active:scale-95 mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t("back") || "Back"}</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                {t("createGroupExam") || "Create Group Exam"}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t("createGroupExamDescription") || "Invite friends or classmates to compete together in a real-time exam"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {/* 1. Category Selection */}
          <Card className="border-2 border-border/70 rounded-2xl shadow-sm overflow-hidden">
            <CardHeader className="p-4 sm:p-5 pb-3 bg-muted/20 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>{t("selectCategory") || "Select Category"}</span>
                </CardTitle>
                {selectedCategoryObj && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs font-semibold">
                    {selectedCategoryObj.name}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              {categories.length === 1 ? (
                <div className="p-3.5 rounded-xl border-2 border-primary bg-primary/5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-foreground">{categories[0].name}</p>
                    {categories[0].description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{categories[0].description}</p>
                    )}
                  </div>
                  <Check className="h-5 w-5 text-primary shrink-0" />
                </div>
              ) : (
                <>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t("searchCategories") || "Search categories..."}
                      value={categorySearchQuery}
                      onChange={(e) => setCategorySearchQuery(e.target.value)}
                      className="pl-9 pr-8 h-10 rounded-xl"
                    />
                    {categorySearchQuery && (
                      <button
                        onClick={() => setCategorySearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {filteredCategories.length === 0 ? (
                      <div className="text-center py-6 text-xs text-muted-foreground">
                        {categorySearchQuery ? t("noResults") || "No categories found" : t("noCategoriesAvailable") || "No categories available"}
                      </div>
                    ) : (
                      filteredCategories.map((category) => {
                        const isSelected = selectedCategory === category.id;
                        return (
                          <div
                            key={category.id}
                            onClick={() => setSelectedCategory(category.id)}
                            className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                              isSelected
                                ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
                                : "border-border/60 hover:bg-muted/40 hover:border-border"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm truncate text-foreground">{category.name}</p>
                                {category.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{category.description}</p>
                                )}
                                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1 font-medium">
                                    <Clock className="h-3 w-3 text-primary" />
                                    {category.duration_minutes ? `${category.duration_minutes} ${t("minutes") || "min"}` : `20 ${t("minutes") || "min"}`}
                                  </span>
                                  <span className="opacity-40">•</span>
                                  <span className="flex items-center gap-1 font-medium">
                                    <Hash className="h-3 w-3 text-primary" />
                                    {category.question_count ?? 20} {t("questions") || "questions"}
                                  </span>
                                </div>
                              </div>
                              <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 border ${
                                isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                              }`}>
                                {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 2. Invitees Bulk Selection (Friends & All Classmates) */}
          <Card className="border-2 border-border/70 rounded-2xl shadow-sm overflow-hidden">
            <CardHeader className="p-4 sm:p-5 pb-3 bg-muted/20 border-b">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-500" />
                  <span>{t("selectInvitees") || "Select Invitees"}</span>
                </CardTitle>

                {/* Bulk Action Toggle */}
                {filteredInvitees.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="h-8 px-2.5 text-xs font-semibold rounded-lg gap-1.5 border-border hover:bg-muted"
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
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-3">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-muted/70 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === "all"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("all") || "All"} ({allUsers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("friends")}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === "friends"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("friends") || "Friends"} ({friendsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("classmates")}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === "classmates"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("classmatesList") || "Classmates"} ({nonFriendsList.length})
                </button>
              </div>

              {/* Search Friends & Classmates */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("searchFriendsClassmates") || "Search by name or username..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 h-10 rounded-xl"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Status bar */}
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>
                  {filteredInvitees.length} {filteredInvitees.length === 1 ? t("student") || "student" : t("students") || "students"}
                </span>
                <span className="font-semibold text-foreground">
                  {selectedInvitees.size} {selectedInvitees.size === 1 ? t("personSelected") || "selected" : t("peopleSelected") || "selected"}
                </span>
              </div>

              {/* List of Invitees */}
              <div className="space-y-1.5 max-h-72 sm:max-h-80 overflow-y-auto pr-1">
                {filteredInvitees.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground space-y-1">
                    <Users className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="font-medium">
                      {searchQuery ? t("noResults") || "No matching students found" : t("noClassmatesFound") || "No classmates found"}
                    </p>
                  </div>
                ) : (
                  filteredInvitees.map((invitee) => {
                    const isSelected = selectedInvitees.has(invitee.id);
                    return (
                      <div
                        key={invitee.id}
                        onClick={() => toggleInvitee(invitee.id)}
                        className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer select-none active:scale-[0.99] ${
                          isSelected
                            ? "border-primary/60 bg-primary/5 shadow-xs"
                            : "border-border/50 hover:bg-muted/40 hover:border-border"
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleInvitee(invitee.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <Avatar className="h-9 w-9 sm:h-10 sm:w-10 ring-1 ring-border/50 shrink-0">
                          {canViewUserAvatar(invitee.avatar_url, invitee.id, user?.id, user?.user_metadata?.role) && invitee.avatar_url ? (
                            <AvatarImage src={invitee.avatar_url} />
                          ) : (
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                              {getInitials(invitee.full_name || invitee.username)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold truncate text-foreground">
                              {invitee.full_name || invitee.username}
                            </p>
                            {invitee.is_friend ? (
                              <Badge variant="secondary" className="text-[9px] font-semibold bg-primary/10 text-primary px-1.5 py-0">
                                {t("friend") || "Friend"}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] font-normal text-muted-foreground border-border/60 px-1.5 py-0">
                                {t("classmate") || "Classmate"}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">@{invitee.username || "student"}</p>
                        </div>
                        {isSelected && (
                          <Badge variant="secondary" className="bg-primary/15 text-primary text-[10px] font-bold shrink-0">
                            {t("invited") || "Invited"}
                          </Badge>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Floating / Sticky Action Footer - Elevated and safe above dock nav */}
        <div className="sticky bottom-4 z-40 bg-background/95 dark:bg-card/95 backdrop-blur-xl border-2 border-border/80 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-2xl space-y-2.5">
          <div className="flex items-center justify-between text-xs px-1">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-muted-foreground">{t("selected") || "Selected"}:</span>
              <span className="font-bold text-foreground truncate">
                {selectedCategoryObj?.name || (t("noCategorySelected") || "No category")}
              </span>
            </div>
            <Badge
              variant={selectedInvitees.size > 0 ? "default" : "outline"}
              className="text-[11px] font-bold px-2 py-0.5 shrink-0"
            >
              {selectedInvitees.size} {t("selected") || "selected"}
            </Badge>
          </div>

          <Button
            onClick={handleStartExam}
            disabled={!selectedCategory || selectedInvitees.size === 0 || submitting}
            className="w-full h-12 rounded-xl text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-lg transition-all active:scale-[0.99] gap-2"
            size="lg"
          >
            {submitting ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>{t("creatingExam") || "Creating Group Exam..."}</span>
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                <span>
                  {selectedInvitees.size > 0
                    ? `${t("createAndSendInvitations") || "Create and Send Invitations"} (${selectedInvitees.size})`
                    : t("selectInviteesToContinue") || "Select classmates to continue"}
                </span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

