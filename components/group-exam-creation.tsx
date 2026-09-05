"use client";

import { useState, useEffect } from "react";
import { Search, Users, UserPlus, ArrowLeft, Check, X, FileText, Clock, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { getExamCategories } from "@/lib/supabase/queries";
import { toast } from "sonner";

interface FriendProfile {
  id: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  last_seen?: string;
}

interface GroupExamCreationProps {
  onBack: () => void;
  onStartExam: (categoryId: string, inviteeIds: string[]) => void;
}

export function GroupExamCreation({ onBack, onStartExam }: GroupExamCreationProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const supabase = createClient();

  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; description?: string; duration_minutes?: number; question_count?: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [selectedInvitees, setSelectedInvitees] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, [user]);

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
      const [requestsRes, categoriesData] = await Promise.all([
        fetch("/api/classmate-requests").then((r) => r.json()),
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
      const acceptedFriends = allRequests
        .filter((r) => r.status === "accepted")
        .map((r) => r.other_user);

      setFriends(acceptedFriends);
      setCategories(categoriesList);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error(t("failedToLoadData") || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const filteredFriends = friends.filter((f) => {
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

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleStartExam = () => {
    if (!selectedCategory) {
      toast.error(t("selectCategory") || "Please select a category");
      return;
    }
    if (selectedInvitees.size === 0) {
      toast.error(t("selectInvitees") || "Please select at least one person to invite");
      return;
    }
    onStartExam(selectedCategory, Array.from(selectedInvitees));
  };

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
    <div className="min-h-[calc(100vh-80px)] p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("back") || "Back"}
          </button>
          <h1 className="text-2xl font-bold mb-2">{t("createGroupExam") || "Create Group Exam"}</h1>
          <p className="text-muted-foreground">{t("createGroupExamDescription") || "Invite friends or classmates to compete in a group exam"}</p>
        </div>

        <div className="space-y-6">
          {/* 1. Category Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t("selectCategory") || "Select Category"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categories.length === 1 ? (
                <div className="p-3 rounded-lg border border-primary bg-primary/5">
                  <p className="font-medium">{categories[0].name}</p>
                  {categories[0].description && (
                    <p className="text-sm text-muted-foreground mt-1">{categories[0].description}</p>
                  )}
                </div>
              ) : (
                <>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t("searchCategories") || "Search categories..."}
                      value={categorySearchQuery}
                      onChange={(e) => setCategorySearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {filteredCategories.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {categorySearchQuery ? t("noResults") || "No results" : t("noCategoriesAvailable") || "No categories available"}
                      </div>
                    ) : (
                      filteredCategories.map((category) => (
                        <div
                          key={category.id}
                          onClick={() => setSelectedCategory(category.id)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            selectedCategory === category.id
                              ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
                              : "border-border hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{category.name}</p>
                              {category.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{category.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
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
                            {selectedCategory === category.id && (
                              <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 2. Search + 3. Tabs + 4. User List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t("selectInvitees") || "Select Invitees"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("searchFriends") || "Search friends..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* List of Friends */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {filteredFriends.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery ? t("noResults") || "No results" : t("noFriendsYet") || "No friends yet"}
                  </div>
                ) : (
                  filteredFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedInvitees.has(friend.id)}
                        onCheckedChange={() => toggleInvitee(friend.id)}
                      />
                      <Avatar className="h-10 w-10">
                        {friend.avatar_url ? (
                          <AvatarImage src={friend.avatar_url} />
                        ) : (
                          <AvatarFallback>{getInitials(friend.full_name)}</AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {friend.full_name || friend.username}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">@{friend.username}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Selected Count */}
              {selectedInvitees.size > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {selectedInvitees.size} {selectedInvitees.size === 1 ? t("personSelected") || "person selected" : t("peopleSelected") || "people selected"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Start Button */}
          <Button
            onClick={handleStartExam}
            disabled={!selectedCategory || selectedInvitees.size === 0}
            className="w-full"
            size="lg"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            {t("createAndSendInvitations") || "Create and Send Invitations"}
          </Button>
        </div>
      </div>
    </div>
  );
}
