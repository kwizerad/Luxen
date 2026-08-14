"use client";

import { useState, useEffect } from "react";
import { Search, Users, UserPlus, ArrowLeft, Check, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
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
  const [classmates, setClassmates] = useState<FriendProfile[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; description?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [selectedInvitees, setSelectedInvitees] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showFriends, setShowFriends] = useState(true);

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
      const supabase = createClient();

      const [classmatesRes, requestsRes, categoriesRes] = await Promise.all([
        fetch("/api/classmate-requests/classmates").then((r) => r.json()),
        fetch("/api/classmate-requests").then((r) => r.json()),
        supabase
          .from("exam_categories")
          .select("id, name, description")
          .eq("is_published", true)
          .order("name", { ascending: true }),
      ]);

      const classmatesData = classmatesRes as { classmates?: FriendProfile[]; error?: string };
      const requestsData = requestsRes as { requests?: any[]; is_public?: boolean };
      const categoriesData = categoriesRes.data || [];

      const allRequests: any[] = requestsData.requests || [];
      const acceptedFriends = allRequests
        .filter((r) => r.status === "accepted")
        .map((r) => r.other_user);

      const friendIds = new Set(acceptedFriends.map((f: FriendProfile) => f.id));
      const pendingRequestIds = new Set(
        allRequests.filter((r) => r.status === "pending").map((r: any) => r.other_user.id)
      );
      const allKnownUserIds = new Set([...friendIds, ...pendingRequestIds]);
      const classmatesList = classmatesData.classmates || [];
      const filteredClassmates = classmatesList.filter((c: FriendProfile) => !allKnownUserIds.has(c.id));

      setFriends(acceptedFriends);
      setClassmates(filteredClassmates);
      setCategories(categoriesData as { id: string; name: string; description?: string }[]);

      // Auto-switch to classmates if no friends
      setShowFriends(acceptedFriends.length > 0);
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

  const filteredClassmates = classmates.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.full_name?.toLowerCase().includes(q) || c.username?.toLowerCase().includes(q);
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
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedCategory === category.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{category.name}</p>
                              {category.description && (
                                <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                              )}
                            </div>
                            {selectedCategory === category.id && (
                              <Check className="h-5 w-5 text-primary" />
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
                  placeholder={t("searchFriendsClassmates") || "Search friends or classmates..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Tab Switcher */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setShowFriends(true)}
                  disabled={friends.length === 0}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    showFriends && friends.length > 0
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  } ${friends.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {t("friends") || "Friends"} ({friends.length})
                </button>
                <button
                  onClick={() => setShowFriends(false)}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    !showFriends
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t("classmatesList") || "Classmates"} ({classmates.length})
                </button>
              </div>

              {/* List */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {showFriends ? (
                  filteredFriends.length === 0 ? (
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
                  )
                ) : (
                  filteredClassmates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchQuery ? t("noResults") || "No results" : t("noClassmatesFound") || "No classmates found"}
                    </div>
                  ) : (
                    filteredClassmates.map((classmate) => (
                      <div
                        key={classmate.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          checked={selectedInvitees.has(classmate.id)}
                          onCheckedChange={() => toggleInvitee(classmate.id)}
                        />
                        <Avatar className="h-10 w-10">
                          {classmate.avatar_url ? (
                            <AvatarImage src={classmate.avatar_url} />
                          ) : (
                            <AvatarFallback>{getInitials(classmate.full_name)}</AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {classmate.full_name || classmate.username}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">@{classmate.username}</p>
                        </div>
                      </div>
                    ))
                  )
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
