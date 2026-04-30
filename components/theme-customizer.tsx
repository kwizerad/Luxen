"use client";

import { useState, useEffect } from "react";
import { useThemeConfig } from "@/lib/theme-config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Palette, Sparkles, RectangleHorizontal, RotateCcw, Save, Sun, Moon, Check, X, Star } from "lucide-react";
import { toast } from "sonner";

export function ThemeCustomizer() {
  const {
    config,
    setLightPrimaryColor,
    setLightHoverBorderColor,
    setDarkPrimaryColor,
    setDarkHoverBorderColor,
    setGlowIntensity,
    saveConfig,
    resetToDefault,
  } = useThemeConfig();

  // Local state for preview before saving
  const [previewConfig, setPreviewConfig] = useState(config);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync previewConfig with config when config changes (e.g., on initial load or reset)
  useEffect(() => {
    setPreviewConfig({
      light: { ...config.light },
      dark: { ...config.dark },
      glowIntensity: config.glowIntensity,
    });
    setHasChanges(false);
  }, [config]);

  const handleLightPrimaryColorChange = (color: string) => {
    const newConfig = { ...previewConfig, light: { ...previewConfig.light, primaryColor: color } };
    setPreviewConfig(newConfig);
    setHasChanges(true);
    // Apply preview immediately
    applyThemePreview(newConfig);
  };

  const handleLightHoverBorderColorChange = (color: string) => {
    const newConfig = { ...previewConfig, light: { ...previewConfig.light, hoverBorderColor: color } };
    setPreviewConfig(newConfig);
    setHasChanges(true);
    // Apply preview immediately
    applyThemePreview(newConfig);
  };

  const handleDarkPrimaryColorChange = (color: string) => {
    const newConfig = { ...previewConfig, dark: { ...previewConfig.dark, primaryColor: color } };
    setPreviewConfig(newConfig);
    setHasChanges(true);
    // Apply preview immediately
    applyThemePreview(newConfig);
  };

  const handleDarkHoverBorderColorChange = (color: string) => {
    const newConfig = { ...previewConfig, dark: { ...previewConfig.dark, hoverBorderColor: color } };
    setPreviewConfig(newConfig);
    setHasChanges(true);
    // Apply preview immediately
    applyThemePreview(newConfig);
  };

  const handleGlowIntensityChange = (intensity: number) => {
    const newConfig = { ...previewConfig, glowIntensity: intensity };
    setPreviewConfig(newConfig);
    setHasChanges(true);
    // Apply preview immediately
    applyThemePreview(newConfig);
  };

  const applyThemePreview = (themeConfig: any) => {
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    const themeColors = isDark ? themeConfig.dark : themeConfig.light;
    
    // Convert hex to HSL for preview
    const hexToHSL = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return null;
      let r = parseInt(result[1], 16) / 255;
      let g = parseInt(result[2], 16) / 255;
      let b = parseInt(result[3], 16) / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    };
    
    const hsl = hexToHSL(themeColors.primaryColor);
    if (hsl) {
      root.style.setProperty("--primary", `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      root.style.setProperty("--primary-foreground", hsl.l > 50 ? "0 0% 0%" : "0 0% 100%");
      root.style.setProperty("--ring", `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      const accentL = Math.max(0, hsl.l - 10);
      root.style.setProperty("--accent", `${hsl.h} ${hsl.s}% ${accentL}%`);
      root.style.setProperty("--accent-foreground", accentL > 50 ? "0 0% 0%" : "0 0% 100%");
    }
    root.style.setProperty("--hover-border-color", themeColors.hoverBorderColor);
    root.style.setProperty("--glow-intensity", `${themeConfig.glowIntensity}px`);
  };

  const handleSave = () => {
    saveConfig(previewConfig);
    setHasChanges(false);
    toast.success("Theme settings saved and applied");
  };

  const handleReset = () => {
    resetToDefault();
    setPreviewConfig({
      light: { ...config.light },
      dark: { ...config.dark },
      glowIntensity: config.glowIntensity,
    });
    setHasChanges(false);
    toast.success("Theme reset to default");
  };

  const cardHoverClass = "hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--primary)/0.3)] hover:-translate-y-1 hover:border-[var(--hover-border-color)] transition-all duration-300";

  const colorPresets = ["#22C55E", "#3B82F6", "#EF4444", "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6", "#1F2937"];

  return (
    <div className="space-y-4">
      {/* Light/Dark Theme Colors - Horizontal Layout */}
      <Card className={cardHoverClass}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Palette className="h-3 w-3 text-primary" />
            Theme Colors
          </CardTitle>
          <CardDescription className="text-xs">
            Customize colors for light and dark modes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Light Theme */}
            <div className="space-y-3 p-3 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sun className="h-3 w-3 text-primary" />
                <p className="text-xs font-semibold">Light Mode</p>
              </div>
              
              {/* Primary Color */}
              <div className="space-y-1">
                <p className="text-xs font-medium">Primary Color</p>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={previewConfig.light.primaryColor}
                    onChange={(e) => handleLightPrimaryColorChange(e.target.value)}
                    className="w-8 h-6 rounded cursor-pointer border border-border"
                  />
                  <p className="text-xs text-muted-foreground">{previewConfig.light.primaryColor}</p>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {colorPresets.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleLightPrimaryColorChange(color)}
                      className="w-5 h-5 rounded-full border-2 transition-all duration-200 hover:scale-110"
                      style={{
                        backgroundColor: color,
                        borderColor: previewConfig.light.primaryColor === color ? config.light.primaryColor : "transparent",
                        boxShadow: previewConfig.light.primaryColor === color ? `0 0 4px ${config.light.primaryColor}` : "none",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Hover Border Color */}
              <div className="space-y-1 pt-2 border-t">
                <p className="text-xs font-medium">Hover Border Color</p>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={previewConfig.light.hoverBorderColor}
                    onChange={(e) => handleLightHoverBorderColorChange(e.target.value)}
                    className="w-8 h-6 rounded cursor-pointer border border-border"
                  />
                  <p className="text-xs text-muted-foreground">{previewConfig.light.hoverBorderColor}</p>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {colorPresets.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleLightHoverBorderColorChange(color)}
                      className="w-5 h-5 rounded-full border-2 transition-all duration-200 hover:scale-110"
                      style={{
                        backgroundColor: color,
                        borderColor: previewConfig.light.hoverBorderColor === color ? config.light.primaryColor : "transparent",
                        boxShadow: previewConfig.light.hoverBorderColor === color ? `0 0 4px ${config.light.primaryColor}` : "none",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Dark Theme */}
            <div className="space-y-3 p-3 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Moon className="h-3 w-3 text-primary" />
                <p className="text-xs font-semibold">Dark Mode</p>
              </div>
              
              {/* Primary Color */}
              <div className="space-y-1">
                <p className="text-xs font-medium">Primary Color</p>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={previewConfig.dark.primaryColor}
                    onChange={(e) => handleDarkPrimaryColorChange(e.target.value)}
                    className="w-8 h-6 rounded cursor-pointer border border-border"
                  />
                  <p className="text-xs text-muted-foreground">{previewConfig.dark.primaryColor}</p>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {colorPresets.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleDarkPrimaryColorChange(color)}
                      className="w-5 h-5 rounded-full border-2 transition-all duration-200 hover:scale-110"
                      style={{
                        backgroundColor: color,
                        borderColor: previewConfig.dark.primaryColor === color ? config.dark.primaryColor : "transparent",
                        boxShadow: previewConfig.dark.primaryColor === color ? `0 0 4px ${config.dark.primaryColor}` : "none",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Hover Border Color */}
              <div className="space-y-1 pt-2 border-t">
                <p className="text-xs font-medium">Hover Border Color</p>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={previewConfig.dark.hoverBorderColor}
                    onChange={(e) => handleDarkHoverBorderColorChange(e.target.value)}
                    className="w-8 h-6 rounded cursor-pointer border border-border"
                  />
                  <p className="text-xs text-muted-foreground">{previewConfig.dark.hoverBorderColor}</p>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {colorPresets.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleDarkHoverBorderColorChange(color)}
                      className="w-5 h-5 rounded-full border-2 transition-all duration-200 hover:scale-110"
                      style={{
                        backgroundColor: color,
                        borderColor: previewConfig.dark.hoverBorderColor === color ? config.dark.primaryColor : "transparent",
                        boxShadow: previewConfig.dark.hoverBorderColor === color ? `0 0 4px ${config.dark.primaryColor}` : "none",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Glow Intensity */}
      <Card className={cardHoverClass}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-3 w-3 text-primary" />
            Glow Intensity
          </CardTitle>
          <CardDescription className="text-xs">
            Adjust the hover glow effect (0 - 50 pixels)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Slider
            value={previewConfig.glowIntensity}
            onChange={(value) => handleGlowIntensityChange(value)}
            min={0}
            max={50}
            step={1}
            label="Glow Radius"
          />
        </CardContent>
      </Card>

      {/* Demo Content - Shows theme changes instantly */}
      <Card className={cardHoverClass}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Star className="h-3 w-3 text-primary" />
            Live Preview
          </CardTitle>
          <CardDescription className="text-xs">
            See your theme changes in action
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Demo Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button size="sm">Primary Button</Button>
            <Button variant="secondary" size="sm">Secondary</Button>
            <Button variant="outline" size="sm">Outline</Button>
            <Button variant="destructive" size="sm">Destructive</Button>
          </div>

          {/* Demo Status */}
          <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg border border-primary/20">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            <p className="text-xs text-primary">Theme changes apply instantly</p>
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
