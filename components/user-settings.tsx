"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "next-themes";
import { useLanguage } from "@/lib/language-context";
import { Lock, Loader2, Globe, Moon, Sun, Monitor, Type, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

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

  useEffect(() => {
    setMounted(true);
    // Load saved text size from localStorage
    const saved = localStorage.getItem("navo-text-size") as TextSize;
    if (saved) {
      setTextSize(saved);
      applyTextSize(saved);
    }
  }, []);

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

  if (!mounted) {
    return null;
  }

  const languages = [
    { value: "English", label: "English" },
    { value: "Arabic", label: "Arabic" },
    { value: "Kinyarwanda", label: "Kinyarwanda" },
  ];

  const textSizes = [
    { value: "small", label: t("small"), size: "14px" },
    { value: "medium", label: t("medium"), size: "16px" },
    { value: "large", label: t("large"), size: "18px" },
  ];

  // Card glow hover class - uses dynamic CSS variables
  const cardHoverClass = "hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--primary)/0.3)] hover:-translate-y-1 hover:border-[var(--hover-border-color)] transition-all duration-300";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
      {/* Appearance Settings */}
      <Card className={cardHoverClass}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-primary" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize how the app looks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
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
            <Label className="flex items-center gap-2">
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
        </CardContent>
      </Card>

      {/* Username Change */}
      {showUsernameChange && (
        <Card className={cardHoverClass}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-primary" />
              Change Username
            </CardTitle>
            <CardDescription className="text-xs">
              Update your display name
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateUsername} className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="username" className="text-xs">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                  className="h-9"
                />
              </div>
              
              
              <Button type="submit" disabled={updatingUsername} size="sm" className="w-full">
                {updatingUsername ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Username"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Language Settings */}
      <Card className={cardHoverClass}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            {t("language")}
          </CardTitle>
          <CardDescription>
            Choose your preferred language
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Password Change */}
      {showPasswordChange && (
        <Card className={cardHoverClass}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4 text-primary" />
              Change Password
            </CardTitle>
            <CardDescription className="text-xs">
              Update your account password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="newPassword" className="text-xs">New Password</Label>
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
                <Label htmlFor="confirmPassword" className="text-xs">Confirm Password</Label>
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
              
              
              <Button type="submit" disabled={updating} size="sm" className="w-full">
                {updating ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
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
    </div>
  );
}
