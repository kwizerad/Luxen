"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Lock, Loader2, Globe, Moon, Sun, Monitor, Type, User, Camera, Upload, X, RefreshCw, MoreVertical, Eye, ChevronDown, ChevronUp, Shield, Bell, Smartphone, History, Download, Trash2, CheckCircle, AlertCircle, Info, Mail, Search, BookOpen } from "lucide-react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type TextSize = "sm" | "md" | "lg";
type Language = "English" | "Arabic" | "Kinyarwanda" | "French";
type LanguageCode = "en" | "rw" | "fr" | "ar";

interface UserSettingsProps {
  user: any;
  onUserUpdate?: (user: any) => void;
  showUsernameChange?: boolean;
  showPasswordChange?: boolean;
}

export default function UserSettings({ user, onUserUpdate, showUsernameChange = false, showPasswordChange = false }: UserSettingsProps) {
  const { theme, setTheme } = useTheme();
  const [textSize, setTextSize] = useState<TextSize>("md");
  const [language, setLanguage] = useState("en");
  const [cardHoverClass, setCardHoverClass] = useState("transition-all duration-200 hover:shadow-lg");

  // Profile state
  const [firstName, setFirstName] = useState(user?.user_metadata?.first_name || "");
  const [lastName, setLastName] = useState(user?.user_metadata?.last_name || "");
  const [username, setUsername] = useState(user?.user_metadata?.username || "");
  const [gender, setGender] = useState(user?.user_metadata?.gender || "");
  const [nationality, setNationality] = useState(user?.user_metadata?.nationality || "");
  const [birthdate, setBirthdate] = useState(user?.user_metadata?.birthdate || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || "");
  const [googleAvatarUrl, setGoogleAvatarUrl] = useState(user?.user_metadata?.google_avatar_url || "");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Dialog state
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditProfileDialog, setShowEditProfileDialog] = useState(false);

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updating, setUpdating] = useState(false);

  // Card collapse state
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
  const [appearanceLanguageOpen, setAppearanceLanguageOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [courseLanguageOpen, setCourseLanguageOpen] = useState(false);

  // Additional state for new features
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState({
    courses: true,
    exams: true,
    announcements: true,
    grades: true,
  });

  // Load user preferences from metadata
  useEffect(() => {
    if (user?.user_metadata) {
      const metadata = user.user_metadata;
      
      // Load notification preferences
      if (metadata.notification_preferences) {
        setNotificationPreferences(metadata.notification_preferences);
      }
      
      // Load course language
      if (metadata.course_language) {
        setCourseLanguage(metadata.course_language);
      }
      if (metadata.course_language_id) {
        setCourseLanguageId(metadata.course_language_id);
      }
      
      // Load theme preference
      if (metadata.theme) {
        setTheme(metadata.theme);
      }
      
      // Load text size preference
      if (metadata.text_size) {
        setTextSize(metadata.text_size);
        applyTextSize(metadata.text_size);
      }
      
      // Load language preference
      if (metadata.language) {
        setLanguage(metadata.language);
      }
    }
  }, [user]);

  const applyTextSize = (size: TextSize) => {
    const root = document.documentElement;
    switch (size) {
      case "sm":
        root.style.fontSize = "14px";
        break;
      case "md":
        root.style.fontSize = "16px";
        break;
      case "lg":
        root.style.fontSize = "18px";
        break;
    }
  };

  const saveUserPreferences = async (preferences: any) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: preferences
      });

      if (error) throw error;

      if (onUserUpdate) {
        const { data: { user: updatedUser } } = await supabase.auth.getUser();
        if (updatedUser) onUserUpdate(updatedUser);
      }
    } catch (error: any) {
      toast.error("Failed to save preferences: " + error.message);
    }
  };

  // Load available published course languages
  useEffect(() => {
    loadAvailableCourseLanguages();
  }, []);

  const loadAvailableCourseLanguages = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('course_language_courses')
        .select('*')
        .eq('is_published', true);

      if (error) throw error;
      setAvailableCourseLanguages(data || []);
    } catch (error) {
      console.error('Failed to load course languages:', error);
    }
  };
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [courseLanguage, setCourseLanguage] = useState("English");
  const [courseLanguageId, setCourseLanguageId] = useState<string | null>(null);
  const [availableCourseLanguages, setAvailableCourseLanguages] = useState<any[]>([]);
  const [showCourseLanguageDialog, setShowCourseLanguageDialog] = useState(false);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const textSizes = [
    { value: "sm", label: "Small" },
    { value: "md", label: "Medium" },
    { value: "lg", label: "Large" },
  ];

  const languages = [
    { value: "en", label: "English" },
    { value: "rw", label: "Kinyarwanda" },
    { value: "fr", label: "Français" },
    { value: "ar", label: "العربية" },
  ];

  const t = (key: string) => {
    const translations: Record<string, string> = {
      theme: "Theme",
      light: "Light",
      dark: "Dark",
      system: "System",
      textSize: "Text Size",
      language: "Language",
    };
    return translations[key] || key;
  };

  const handleTextSizeChange = async (size: TextSize) => {
    setTextSize(size);
    document.documentElement.style.fontSize = size === "sm" ? "14px" : size === "md" ? "16px" : "18px";
    
    // Save to user metadata
    await saveUserPreferences({ text_size: size });
  };

  const handleLanguageChange = async (newLanguage: LanguageCode) => {
    setLanguage(newLanguage);
    
    // Save to user metadata
    await saveUserPreferences({ language: newLanguage });
  };

  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme);
    
    // Save to user metadata
    await saveUserPreferences({ theme: newTheme });
  };

  const handleCardToggle = (cardName: string) => {
    const cardStates = {
      profileSettingsOpen: setProfileSettingsOpen,
      privacyOpen: setPrivacyOpen,
      securityOpen: setSecurityOpen,
      changePasswordOpen: setChangePasswordOpen,
      appearanceLanguageOpen: setAppearanceLanguageOpen,
      notificationsOpen: setNotificationsOpen,
      courseLanguageOpen: setCourseLanguageOpen,
    };

    // Close all cards first
    Object.entries(cardStates).forEach(([key, setter]) => {
      if (key !== cardName) {
        setter(false);
      }
    });

    // Toggle the clicked card
    cardStates[cardName as keyof typeof cardStates]((prev: boolean) => !prev);
  };

  const getDisplayName = () => {
    if (firstName && lastName) return `${firstName} ${lastName}`;
    if (firstName) return firstName;
    if (lastName) return lastName;
    return user?.email?.split("@")[0] || "User";
  };

  const getInitials = () => {
    const name = getDisplayName();
    return name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const displayAvatarUrl = avatarUrl || googleAvatarUrl;

  const handleAvatarUpload = async (url: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: url },
      });

      if (error) throw error;

      setAvatarUrl(url);
      toast.success("Profile picture updated successfully");

      if (onUserUpdate) {
        const { data: { user: updatedUser } } = await supabase.auth.getUser();
        if (updatedUser) onUserUpdate(updatedUser);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile picture");
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: null },
      });

      if (error) throw error;

      setAvatarUrl("");
      setShowRemoveDialog(false);
      toast.success("Profile picture removed successfully");

      if (onUserUpdate) {
        const { data: { user: updatedUser } } = await supabase.auth.getUser();
        if (updatedUser) onUserUpdate(updatedUser);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to remove profile picture");
    }
  };

  const handleRestoreGoogleAvatar = async () => {
    if (googleAvatarUrl) {
      await handleAvatarUpload(googleAvatarUrl);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setUpdating(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Summary Card */}
      <Card className={`${cardHoverClass} bg-gradient-to-r from-primary/10 to-primary/5`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20 border-4 border-primary/30">
              {displayAvatarUrl && <AvatarImage src={displayAvatarUrl} alt={getDisplayName()} />}
              <AvatarFallback className="text-2xl font-semibold">{getInitials()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{getDisplayName()}</h2>
              <p className="text-muted-foreground">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {user?.user_metadata?.role || "User"}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {user?.created_at ? `Joined ${new Date(user.created_at).toLocaleDateString()}` : "Member"}
                </Badge>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowViewDialog(true)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowUploadDialog(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Change Photo
                </DropdownMenuItem>
                {googleAvatarUrl && avatarUrl !== googleAvatarUrl && (
                  <DropdownMenuItem onClick={handleRestoreGoogleAvatar}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Restore Google
                  </DropdownMenuItem>
                )}
                {avatarUrl && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowRemoveDialog(true)} className="text-red-600">
                      <X className="mr-2 h-4 w-4" />
                      Remove Photo
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search settings..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Account Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-600">
            <User className="h-5 w-5" />
            Account
          </h3>
          
          {/* Profile Settings */}
          <Card 
            className={`${cardHoverClass} hover:border-blue-500/50 cursor-pointer transition-all duration-300 ease-in-out`}
            onClick={() => handleCardToggle('profileSettingsOpen')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Profile Settings</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardToggle('profileSettingsOpen');
                  }}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${profileSettingsOpen ? 'rotate-180' : ''}`} />
                </Button>
              </div>
              <CardDescription className="text-xs">Manage your profile information</CardDescription>
            </CardHeader>
            {profileSettingsOpen && (
            <CardContent className="pt-0 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden transition-all duration-300 ease-in-out max-h-[500px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Profile Picture</span>
                  <Badge variant={avatarUrl ? "default" : "secondary"} className="text-xs">
                    {avatarUrl ? "Set" : "Not Set"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Personal Info</span>
                  <Badge variant={firstName || lastName ? "default" : "secondary"} className="text-xs">
                    {firstName || lastName ? "Complete" : "Incomplete"}
                  </Badge>
                </div>
                {showUsernameChange && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Username</span>
                    <Badge variant={username ? "default" : "secondary"} className="text-xs">
                      {username ? "Set" : "Not Set"}
                    </Badge>
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => setShowEditProfileDialog(true)}>
                Edit Profile
              </Button>
            </CardContent>
            )}
          </Card>

          {/* Privacy & Data */}
          <Card 
            className={`${cardHoverClass} hover:border-blue-500/50 cursor-pointer transition-all duration-300 ease-in-out`}
            onClick={() => handleCardToggle('privacyOpen')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Privacy & Data</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardToggle('privacyOpen');
                  }}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${privacyOpen ? 'rotate-180' : ''}`} />
                </Button>
              </div>
              <CardDescription className="text-xs">Export, delete, retention</CardDescription>
            </CardHeader>
            {privacyOpen && (
            <CardContent className="pt-0 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden transition-all duration-300 ease-in-out max-h-[500px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <span className="text-sm">Download Data</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    try {
                      const supabase = createClient();
                      const { data: { user: currentUser } } = await supabase.auth.getUser();
                      
                      if (!currentUser) {
                        toast.error("User not found");
                        return;
                      }

                      // Create a JSON file with user data
                      const userData = {
                        profile: currentUser.user_metadata,
                        email: currentUser.email,
                        created_at: currentUser.created_at,
                        updated_at: currentUser.updated_at,
                      };

                      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `user-data-${Date.now()}.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      
                      toast.success("Data exported successfully");
                    } catch (error: any) {
                      toast.error("Failed to export data: " + error.message);
                    }
                  }}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-600">Delete Account</span>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => {
                    setShowDeleteDialog(true);
                  }}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  Data retained for 30 days after deletion
                </p>
              </div>
            </CardContent>
            )}
          </Card>
        </div>

        {/* Security Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-red-600">
            <Shield className="h-5 w-5" />
            Security
          </h3>
          
          {/* Security Settings */}
          <Card 
            className={`${cardHoverClass} hover:border-red-500/50 cursor-pointer transition-all duration-300 ease-in-out`}
            onClick={() => handleCardToggle('securityOpen')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Security Settings</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardToggle('securityOpen');
                  }}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${securityOpen ? 'rotate-180' : ''}`} />
                </Button>
              </div>
              <CardDescription className="text-xs">Login history, sessions</CardDescription>
            </CardHeader>
            {securityOpen && (
            <CardContent className="pt-0 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden transition-all duration-300 ease-in-out max-h-[500px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <span className="text-sm">Active Sessions</span>
                <Badge variant="secondary" className="text-xs">1 Active</Badge>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => {
                  toast.info("Session management and login history will be available in the next update");
                }}
              >
                View Security Details
              </Button>
            </CardContent>
            )}
          </Card>

          {/* Change Password */}
          {showPasswordChange && (
          <Card 
            className={`${cardHoverClass} hover:border-red-500/50 cursor-pointer transition-all duration-300 ease-in-out`}
            onClick={() => handleCardToggle('changePasswordOpen')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Change Password</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardToggle('changePasswordOpen');
                  }}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${changePasswordOpen ? 'rotate-180' : ''}`} />
                </Button>
              </div>
              <CardDescription className="text-xs">Update your password</CardDescription>
            </CardHeader>
            {changePasswordOpen && (
            <CardContent className="pt-0 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden transition-all duration-300 ease-in-out max-h-[500px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <form onSubmit={handleUpdatePassword} className="space-y-3">
                <div className="grid gap-2">
                  <Label htmlFor="newPassword" className="text-sm">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    className="h-9"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword" className="text-sm">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    required
                    className="h-9"
                  />
                </div>
                <Button type="submit" disabled={updating} className="w-full" size="sm">
                  {updating ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
            )}
          </Card>
          )}
        </div>

        {/* Preferences Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-purple-600">
            <Moon className="h-5 w-5" />
            Preferences
          </h3>
          
          {/* Appearance & Language */}
          <Card 
            className={`${cardHoverClass} hover:border-purple-500/50 cursor-pointer transition-all duration-300 ease-in-out`}
            onClick={() => handleCardToggle('appearanceLanguageOpen')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Appearance & Language</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardToggle('appearanceLanguageOpen');
                  }}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${appearanceLanguageOpen ? 'rotate-180' : ''}`} />
                </Button>
              </div>
              <CardDescription className="text-xs">Theme, text size, language</CardDescription>
            </CardHeader>
            {appearanceLanguageOpen && (
            <CardContent className="pt-0 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden transition-all duration-300 ease-in-out max-h-[500px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="space-y-2">
                <Label className="text-xs">Theme</Label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: "light", icon: Sun, label: t("light") },
                    { value: "dark", icon: Moon, label: t("dark") },
                    { value: "system", icon: Monitor, label: t("system") },
                  ].map(({ value, icon: Icon, label }) => (
                    <Button
                      key={value}
                      variant={theme === value ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleThemeChange(value)}
                      className="min-w-[80px]"
                    >
                      <Icon className="h-3 w-3 mr-1" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Text Size</Label>
                <div className="flex gap-2 flex-wrap">
                  {textSizes.map(({ value, label }) => (
                    <Button
                      key={value}
                      variant={textSize === value ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleTextSizeChange(value as TextSize)}
                      className="min-w-[80px]"
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Language</Label>
                <div className="flex gap-2 flex-wrap">
                  {languages.map(({ value, label }) => (
                    <Button
                      key={value}
                      variant={language === value ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleLanguageChange(value as any)}
                      className="min-w-[80px]"
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
            )}
          </Card>

          {/* Course Language */}
          <Card 
            className={`${cardHoverClass} hover:border-purple-500/50 cursor-pointer transition-all duration-300 ease-in-out`}
            onClick={() => handleCardToggle('courseLanguageOpen')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Course Selection</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardToggle('courseLanguageOpen');
                  }}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${courseLanguageOpen ? 'rotate-180' : ''}`} />
                </Button>
              </div>
              <CardDescription className="text-xs">Choose your learning course</CardDescription>
            </CardHeader>
            {courseLanguageOpen && (
            <CardContent className="pt-0 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden transition-all duration-300 ease-in-out max-h-[500px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <span className="text-sm">Current Course</span>
                <Badge variant="default" className="text-xs">{courseLanguage}</Badge>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => setShowCourseLanguageDialog(true)}
              >
                Change Course
              </Button>
            </CardContent>
            )}
          </Card>

          {/* Notifications */}
          <Card 
            className={`${cardHoverClass} hover:border-purple-500/50 cursor-pointer transition-all duration-300 ease-in-out`}
            onClick={() => handleCardToggle('notificationsOpen')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Notifications</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardToggle('notificationsOpen');
                  }}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${notificationsOpen ? 'rotate-180' : ''}`} />
                </Button>
              </div>
              <CardDescription className="text-xs">Email, push, preferences</CardDescription>
            </CardHeader>
            {notificationsOpen && (
            <CardContent className="pt-0 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden transition-all duration-300 ease-in-out max-h-[500px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <span className="text-sm">Email Alerts</span>
                <Button
                  variant={emailNotifications ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEmailNotifications(!emailNotifications)}
                >
                  {emailNotifications ? "On" : "Off"}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Browser Alerts</span>
                <Button
                  variant={pushNotifications ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPushNotifications(!pushNotifications)}
                >
                  {pushNotifications ? "On" : "Off"}
                </Button>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => setShowNotificationDialog(true)}
              >
                Choose What to Get
              </Button>
            </CardContent>
            )}
          </Card>
        </div>

      </div>

      {/* Dialogs */}
      {/* Remove Profile Picture Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Profile Picture?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your current profile picture. You can upload a new one or restore your Google profile picture later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveAvatar}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Profile Picture Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Profile Picture</DialogTitle>
            <DialogDescription>
              Upload a new profile picture from your device
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (!file.type.startsWith("image/")) {
                    toast.error("Please select an image file");
                    return;
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    toast.error("File size must be less than 5MB");
                    return;
                  }
                  
                  setUploadingAvatar(true);
                  try {
                    const supabase = createClient();
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                    const filePath = `profile-pictures/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                      .from('avatars')
                      .upload(filePath, file);

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                      .from('avatars')
                      .getPublicUrl(filePath);

                    await handleAvatarUpload(publicUrl);
                    setShowUploadDialog(false);
                  } catch (error: any) {
                    toast.error("Failed to upload image: " + error.message);
                  } finally {
                    setUploadingAvatar(false);
                  }
                }
              }}
              disabled={uploadingAvatar}
              className="w-full"
            />
            {uploadingAvatar && (
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* View Profile Picture Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profile Picture</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center">
            <img
              src={avatarUrl}
              alt="Profile"
              className="max-w-full max-h-96 rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfileDialog} onOpenChange={setShowEditProfileDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your personal information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            setUpdatingProfile(true);
            
            try {
              const supabase = createClient();
              const updateData: any = {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
                gender: gender,
                nationality: nationality,
                birthdate: birthdate,
              };
              
              if (showUsernameChange && username) {
                updateData.username = username.trim();
              }
              
              const { data, error } = await supabase.auth.updateUser({
                data: updateData,
              });
              
              if (error) throw error;
              
              toast.success("Profile updated successfully");
              
              if (onUserUpdate && data?.user) {
                onUserUpdate(data.user);
              }
              setShowEditProfileDialog(false);
            } catch (error: any) {
              toast.error(error.message || "Failed to update profile");
            } finally {
              setUpdatingProfile(false);
            }
          }} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter first name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter last name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nationality">Nationality</Label>
              <Input
                id="nationality"
                type="text"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                placeholder="Enter nationality"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="birthdate">Date of Birth</Label>
              <Input
                id="birthdate"
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
              />
            </div>
            {showUsernameChange && (
              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowEditProfileDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updatingProfile}>
                {updatingProfile ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Course Language Dialog */}
      <Dialog open={showCourseLanguageDialog} onOpenChange={setShowCourseLanguageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose Course</DialogTitle>
            <DialogDescription>
              Select the course you want to learn from available published courses
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {availableCourseLanguages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No published courses available</p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableCourseLanguages.map((course) => (
                  <div
                    key={course.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      courseLanguageId === course.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-secondary"
                    }`}
                    onClick={() => {
                      setCourseLanguage(course.title);
                      setCourseLanguageId(course.id);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{course.title}</div>
                        {course.description && (
                          <div className={`text-xs mt-1 ${courseLanguageId === course.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                            {course.description}
                          </div>
                        )}
                      </div>
                      {courseLanguageId === course.id && (
                        <CheckCircle className="h-5 w-5" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowCourseLanguageDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={async () => {
                  try {
                    const supabase = createClient();
                    const { error } = await supabase.auth.updateUser({
                      data: { 
                        course_language: courseLanguage,
                        course_language_id: courseLanguageId
                      }
                    });

                    if (error) throw error;

                    toast.success("Course selection saved");
                    setShowCourseLanguageDialog(false);

                    if (onUserUpdate) {
                      const { data: { user: updatedUser } } = await supabase.auth.getUser();
                      if (updatedUser) onUserUpdate(updatedUser);
                    }
                  } catch (error: any) {
                    toast.error("Failed to save: " + error.message);
                  }
                }}
                disabled={!courseLanguageId}
              >
                Save Selection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notification Preferences Dialog */}
      <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose What to Get</DialogTitle>
            <DialogDescription>
              Pick the types of alerts you want to receive
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="courses"
                  checked={notificationPreferences.courses}
                  onChange={(e) => setNotificationPreferences({...notificationPreferences, courses: e.target.checked})}
                  className="rounded"
                />
                <label htmlFor="courses" className="text-sm cursor-pointer">New Courses and Lessons</label>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="exams"
                  checked={notificationPreferences.exams}
                  onChange={(e) => setNotificationPreferences({...notificationPreferences, exams: e.target.checked})}
                  className="rounded"
                />
                <label htmlFor="exams" className="text-sm cursor-pointer">Exam Results and Reminders</label>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="announcements"
                  checked={notificationPreferences.announcements}
                  onChange={(e) => setNotificationPreferences({...notificationPreferences, announcements: e.target.checked})}
                  className="rounded"
                />
                <label htmlFor="announcements" className="text-sm cursor-pointer">System Messages</label>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="grades"
                  checked={notificationPreferences.grades}
                  onChange={(e) => setNotificationPreferences({...notificationPreferences, grades: e.target.checked})}
                  className="rounded"
                />
                <label htmlFor="grades" className="text-sm cursor-pointer">Grade Updates</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowNotificationDialog(false)}>
                Cancel
              </Button>
              <Button onClick={async () => {
                try {
                  const supabase = createClient();
                  const { error } = await supabase.auth.updateUser({
                    data: { notification_preferences: notificationPreferences }
                  });

                  if (error) throw error;

                  toast.success("Alert choices saved");
                  setShowNotificationDialog(false);

                  if (onUserUpdate) {
                    const { data: { user: updatedUser } } = await supabase.auth.getUser();
                    if (updatedUser) onUserUpdate(updatedUser);
                  }
                } catch (error: any) {
                  toast.error("Failed to save: " + error.message);
                }
              }}>
                Save Choices
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deleteConfirm">Type "DELETE" to confirm</Label>
              <Input
                id="deleteConfirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (deleteConfirmText !== "DELETE") {
                    toast.error("Please type DELETE to confirm");
                    return;
                  }

                  setDeletingAccount(true);
                  try {
                    const supabase = createClient();
                    const { error } = await supabase.auth.admin.deleteUser(
                      user?.id
                    );

                    if (error) throw error;

                    toast.success("Account deleted successfully");
                    await supabase.auth.signOut();
                    window.location.href = "/";
                  } catch (error: any) {
                    toast.error("Failed to delete account: " + error.message);
                  } finally {
                    setDeletingAccount(false);
                    setShowDeleteDialog(false);
                    setDeleteConfirmText("");
                  }
                }}
                disabled={deletingAccount || deleteConfirmText !== "DELETE"}
                className="bg-red-600 hover:bg-red-700"
              >
                {deletingAccount ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Account"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
