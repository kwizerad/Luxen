"use client";

import { useState, useEffect } from "react";
import { useBrandingConfig } from "@/lib/branding-config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageIcon, Type, RotateCcw, Save, Sparkles, Globe } from "lucide-react";
import { toast } from "sonner";

export function BrandingCustomizer() {
  const { config, setSystemName, setLogoUrl, setLogoText, saveConfig, resetToDefault } = useBrandingConfig();

  // Local state for preview before saving
  const [previewName, setPreviewName] = useState(config.systemName);
  const [previewLogoText, setPreviewLogoText] = useState(config.logoText);
  const [previewLogoUrl, setPreviewLogoUrl] = useState(config.logoUrl || "");
  const [hasChanges, setHasChanges] = useState(false);

  // Sync with config when it changes externally
  useEffect(() => {
    setPreviewName(config.systemName);
    setPreviewLogoText(config.logoText);
    setPreviewLogoUrl(config.logoUrl || "");
    setHasChanges(false);
  }, [config]);

  const handleNameChange = (value: string) => {
    setPreviewName(value);
    setHasChanges(true);
  };

  const handleLogoTextChange = (value: string) => {
    setPreviewLogoText(value.slice(0, 2)); // Limit to 2 characters
    setHasChanges(true);
  };

  const handleLogoUrlChange = (value: string) => {
    setPreviewLogoUrl(value);
    setHasChanges(true);
  };

  const handleClearLogoUrl = () => {
    setPreviewLogoUrl("");
    setHasChanges(true);
  };

  const handleSave = () => {
    saveConfig({
      systemName: previewName,
      logoText: previewLogoText,
      logoUrl: previewLogoUrl || null,
    });
    setHasChanges(false);
    toast.success("Branding settings saved and applied");
  };

  const handleReset = () => {
    resetToDefault();
    toast.success("Branding reset to default");
  };

  const cardHoverClass = "hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--primary)/0.3)] hover:-translate-y-1 hover:border-[var(--hover-border-color)] transition-all duration-300";

  return (
    <div className="space-y-4">
      {/* Preview Card */}
      <Card className={cardHoverClass}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-3 w-3 text-primary" />
            Live Preview
          </CardTitle>
          <CardDescription className="text-xs">
            See how your branding will appear
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center overflow-hidden">
              {previewLogoUrl ? (
                <img
                  src={previewLogoUrl}
                  alt={previewName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span className="text-primary-foreground font-bold text-sm">
                  {previewLogoText || "N"}
                </span>
              )}
            </div>
            <div>
              <p className="font-bold text-lg">{previewName || "System Name"}</p>
              <p className="text-xs text-muted-foreground">Header branding preview</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Name */}
      <Card className={cardHoverClass}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Globe className="h-3 w-3 text-primary" />
            System Name
          </CardTitle>
          <CardDescription className="text-xs">
            Change the name displayed throughout the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="system-name">Application Name</Label>
              <Input
                id="system-name"
                value={previewName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Enter system name"
                className="max-w-md"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logo Settings */}
      <Card className={cardHoverClass}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ImageIcon className="h-3 w-3 text-primary" />
            Logo Settings
          </CardTitle>
          <CardDescription className="text-xs">
            Customize your application logo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logo Text */}
          <div className="space-y-2">
            <Label htmlFor="logo-text" className="flex items-center gap-2">
              <Type className="h-3 w-3" />
              Logo Text (1-2 characters)
            </Label>
            <Input
              id="logo-text"
              value={previewLogoText}
              onChange={(e) => handleLogoTextChange(e.target.value)}
              placeholder="N"
              maxLength={2}
              className="max-w-xs"
              disabled={!!previewLogoUrl}
            />
            <p className="text-xs text-muted-foreground">
              Displayed when no image logo is set
            </p>
          </div>

          {/* Logo URL */}
          <div className="space-y-2">
            <Label htmlFor="logo-url">Logo Image URL</Label>
            <div className="flex gap-2">
              <Input
                id="logo-url"
                value={previewLogoUrl}
                onChange={(e) => handleLogoUrlChange(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="flex-1"
              />
              {previewLogoUrl && (
                <Button variant="outline" size="icon" onClick={handleClearLogoUrl}>
                  <span className="sr-only">Clear</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Recommended: Square image, at least 64x64px, PNG or SVG format
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="default"
          onClick={handleSave}
          disabled={!hasChanges}
          className="flex-1 min-w-[100px] h-8 text-sm"
        >
          <Save className="h-3 w-3 mr-1" />
          Save Changes
        </Button>
        <Button
          variant="outline"
          onClick={handleReset}
          className="flex-1 min-w-[100px] h-8 text-sm"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset
        </Button>
      </div>
    </div>
  );
}
