"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "next-themes";
import { useLanguage } from "@/lib/language-context";
import { Lock, Loader2, Globe, Moon, Sun, Monitor, Type, User, Camera, Upload, X, RefreshCw, MoreVertical, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type TextSize = "small" | "medium" | "large";

interface UserSettingsProps {
  showPasswordChange?: boolean;
  showUsernameChange?: boolean;
  user?: any;
  onUserUpdate?: (user: any) => void;
}

export function UserSettings({ showPasswordChange = true, showUsernameChange = false, user, onUserUpdate }: UserSettingsProps) {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [textSize, setTextSize] = useState<TextSize>("medium");
  const [mounted, setMounted] = useState(false);
  
  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updating, setUpdating] = useState(false);
  
  // Username change state
  const [username, setUsername] = useState(user?.user_metadata?.username || "");
  const [updatingUsername, setUpdatingUsername] = useState(false);
  
  // Profile picture state
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || user?.user_metadata?.google_avatar_url || user?.user_metadata?.picture || "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [googleAvatarUrl, setGoogleAvatarUrl] = useState(user?.user_metadata?.google_avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  
  // Profile information state
  const [firstName, setFirstName] = useState(user?.user_metadata?.first_name || "");
  const [lastName, setLastName] = useState(user?.user_metadata?.last_name || "");
  const [gender, setGender] = useState(user?.user_metadata?.gender || "");
  const [nationality, setNationality] = useState(user?.user_metadata?.nationality || "");
  const [birthdate, setBirthdate] = useState(user?.user_metadata?.birthdate || "");
  const [updatingProfile, setUpdatingProfile] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load saved text size from localStorage
    const saved = localStorage.getItem("navo-text-size") as TextSize;
    if (saved) {
      setTextSize(saved);
      applyTextSize(saved);
    }
  }, []);

  useEffect(() => {
    setUsername(user?.user_metadata?.username || "");
    setAvatarUrl(user?.user_metadata?.avatar_url || user?.user_metadata?.google_avatar_url || user?.user_metadata?.picture || "");
    setGoogleAvatarUrl(user?.user_metadata?.google_avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "");
    setFirstName(user?.user_metadata?.first_name || "");
    setLastName(user?.user_metadata?.last_name || "");
    setGender(user?.user_metadata?.gender || "");
    setNationality(user?.user_metadata?.nationality || "");
    setBirthdate(user?.user_metadata?.birthdate || user?.user_metadata?.date_of_birth || user?.user_metadata?.birthday || user?.user_metadata?.dob || "");
  }, [user]);

  const applyTextSize = (size: TextSize) => {
    const root = document.documentElement;
    if (size === "small") {
      root.style.fontSize = "14px";
    } else if (size === "medium") {
      root.style.fontSize = "16px";
    } else if (size === "large") {
      root.style.fontSize = "18px";
    }
  };

  const handleTextSizeChange = (size: TextSize) => {
    setTextSize(size);
    localStorage.setItem("navo-text-size", size);
    applyTextSize(size);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
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

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast.error("Username cannot be empty");
      return;
    }
    
    if (username.length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }
    
    setUpdatingUsername(true);
    
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.updateUser({
        data: { username: username.trim() },
      });
      
      if (error) throw error;
      
      toast.success("Username updated successfully");
      
      // Notify parent component of user update
      if (onUserUpdate && data?.user) {
        onUserUpdate(data.user);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update username");
    } finally {
      setUpdatingUsername(false);
    }
  };

  const handleAvatarUpload = async (imageUrl: string | undefined) => {
    if (!imageUrl) {
      setAvatarUrl("");
      return;
    }
    
    setUploadingAvatar(true);
    
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.updateUser({
        data: { avatar_url: imageUrl },
      });
      
      if (error) throw error;
      
      setAvatarUrl(imageUrl);
      toast.success("Profile picture updated successfully");
      
      // Notify parent component of user update
      if (onUserUpdate && data?.user) {
        onUserUpdate(data.user);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile picture");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    setShowRemoveDialog(false);
    
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.updateUser({
        data: { avatar_url: null },
      });
      
      if (error) throw error;
      
      setAvatarUrl("");
      toast.success("Profile picture removed successfully");
      
      // Notify parent component of user update
      if (onUserUpdate && data?.user) {
        onUserUpdate(data.user);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to remove profile picture");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRestoreGoogleAvatar = async () => {
    if (!googleAvatarUrl) {
      toast.error("No Google profile picture available to restore");
      return;
    }
    
    setUploadingAvatar(true);
    
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.updateUser({
        data: { avatar_url: googleAvatarUrl },
      });
      
      if (error) throw error;
      
      setAvatarUrl(googleAvatarUrl);
      toast.success("Google profile picture restored successfully");
      
      // Notify parent component of user update
      if (onUserUpdate && data?.user) {
        onUserUpdate(data.user);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to restore Google profile picture");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setUpdatingProfile(true);
    
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          gender: gender,
          nationality: nationality,
          birthdate: birthdate,
        },
      });
      
      if (error) throw error;
      
      toast.success("Profile information updated successfully");
      
      // Notify parent component of user update
      if (onUserUpdate && data?.user) {
        onUserUpdate(data.user);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const getDisplayName = () => {
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    return user?.user_metadata?.full_name || user?.user_metadata?.username || user?.email || "User";
  };

  const getInitials = () => {
    const name = getDisplayName();
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayAvatarUrl = avatarUrl || googleAvatarUrl;

  if (!mounted) {
    return null;
  }

  const languages = [
    { value: "English", label: "English" },
    { value: "Arabic", label: "Arabic" },
    { value: "Kinyarwanda", label: "Kinyarwanda" },
    { value: "French", label: "French" },
  ];

  const textSizes = [
    { value: "small", label: t("small"), size: "14px" },
    { value: "medium", label: t("medium"), size: "16px" },
    { value: "large", label: t("large"), size: "18px" },
  ];

  // Card glow hover class - uses dynamic CSS variables
  const cardHoverClass = "hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--primary)/0.3)] hover:-translate-y-1 hover:border-[var(--hover-border-color)] transition-all duration-300";

  return (
    <>
      {/* Profile Settings Card - Profile Picture, Profile Information, Username */}
      <Card className={`${cardHoverClass}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            Profile Settings
          </CardTitle>
          <CardDescription className="text-sm">
            Manage your profile picture, name, and username
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Picture Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-4">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-primary/20">
                  {displayAvatarUrl && <AvatarImage src={displayAvatarUrl} alt={getDisplayName()} />}
                  <AvatarFallback className="text-2xl font-semibold">{getInitials()}</AvatarFallback>
                </Avatar>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {avatarUrl && (
                    <>
                      <DropdownMenuItem onClick={() => setShowViewDialog(true)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={() => setShowUploadDialog(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Change
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
                        Remove
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="border-t" />

          {/* Profile Information Form - Combined with Username */}
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
              
              // Notify parent component of user update
              if (onUserUpdate && data?.user) {
                onUserUpdate(data.user);
              }
            } catch (error: any) {
              toast.error(error.message || "Failed to update profile");
            } finally {
              setUpdatingProfile(false);
            }
          }} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="firstName" className="text-sm">First Name</Label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter first name"
                className="h-10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName" className="text-sm">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter last name"
                className="h-10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gender" className="text-sm">Gender</Label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring h-10"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nationality" className="text-sm">Nationality</Label>
              <Input
                id="nationality"
                type="text"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                placeholder="Enter nationality"
                className="h-10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="birthdate" className="text-sm">Date of Birth</Label>
              <Input
                id="birthdate"
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                className="h-10"
              />
            </div>
            {showUsernameChange && (
              <div className="grid gap-2">
                <Label htmlFor="username" className="text-sm">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                  className="h-10"
                />
              </div>
            )}
            <Button type="submit" disabled={updatingProfile} className="w-full">
              {updatingProfile ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Profile"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

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
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("folder", "profile-pictures");

                    const res = await fetch("/api/profile-picture", {
                      method: "POST",
                      body: formData,
                    });

                    const data = await res.json();

                    if (data.url) {
                      await handleAvatarUpload(data.url);
                      setShowUploadDialog(false);
                    } else {
                      toast.error(data.error || "Failed to upload image");
                    }
                  } catch (error) {
                    toast.error("Failed to upload image");
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

      {/* Appearance & Language Card */}
      <Card className={`${cardHoverClass}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Moon className="h-5 w-5 text-primary" />
            Appearance & Language
          </CardTitle>
          <CardDescription className="text-sm">
            Customize theme, text size, and language
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm">
              <Sun className="h-4 w-4" />
              {t("theme")}
            </Label>
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
                  onClick={() => setTheme(value)}
                  className="gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Text Size */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm">
              <Type className="h-4 w-4" />
              {t("textSize")}
            </Label>
            <div className="flex gap-2 flex-wrap">
              {textSizes.map(({ value, label }) => (
                <Button
                  key={value}
                  variant={textSize === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleTextSizeChange(value as TextSize)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="border-t" />

          {/* Language */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4" />
              {t("language")}
            </Label>
            <div className="flex gap-2 flex-wrap">
              {languages.map(({ value, label }) => (
                <Button
                  key={value}
                  variant={language === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLanguage(value as any)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Change */}
      {showPasswordChange && (
        <Card className={`${cardHoverClass}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-5 w-5 text-primary" />
              Change Password
            </CardTitle>
            <CardDescription className="text-sm">
              Update your account password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="newPassword" className="text-sm">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  className="h-10"
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
                  className="h-10"
                />
              </div>
              
              <Button type="submit" disabled={updating} className="w-full">
                {updating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  );
}
