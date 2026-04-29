"use client";

import { useThemeConfig } from "@/lib/theme-config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Palette, Sparkles, RectangleHorizontal, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export function ThemeCustomizer() {
  const {
    config,
    setPrimaryColor,
    setHoverBorderColor,
    setGlowIntensity,
    resetToDefault,
  } = useThemeConfig();

  const handleReset = () => {
    resetToDefault();
    toast.success("Theme reset to default");
  };

  const cardHoverClass = "hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--primary)/0.3)] hover:-translate-y-1 hover:border-[var(--hover-border-color)] transition-all duration-300";

  return (
    <div className="space-y-6">
      {/* Primary Color */}
      <Card className={cardHoverClass}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-primary" />
            Primary Color
          </CardTitle>
          <CardDescription className="text-xs">
            Change the main theme color across all pages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="color"
              value={config.primaryColor}
              onChange={(e) => {
                setPrimaryColor(e.target.value);
                toast.success("Primary color updated");
              }}
              className="w-16 h-10 rounded cursor-pointer border border-border"
            />
            <div className="flex-1">
              <p className="text-sm font-medium">Selected Color</p>
              <p className="text-xs text-muted-foreground">{config.primaryColor}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {["#22C55E", "#3B82F6", "#EF4444", "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6", "#1F2937"].map(
              (color) => (
                <button
                  key={color}
                  onClick={() => {
                    setPrimaryColor(color);
                    toast.success("Primary color updated");
                  }}
                  className="w-8 h-8 rounded-full border-2 border-transparent hover:scale-110 transition-transform"
                  style={{
                    backgroundColor: color,
                    borderColor: config.primaryColor === color ? "hsl(var(--foreground))" : "transparent",
                  }}
                />
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hover Border Color */}
      <Card className={cardHoverClass}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <RectangleHorizontal className="h-4 w-4 text-primary" />
            Hover Border Color
          </CardTitle>
          <CardDescription className="text-xs">
            Customize the border color when hovering over cards
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="color"
              value={config.hoverBorderColor}
              onChange={(e) => {
                setHoverBorderColor(e.target.value);
                toast.success("Hover border color updated");
              }}
              className="w-16 h-10 rounded cursor-pointer border border-border"
            />
            <div className="flex-1">
              <p className="text-sm font-medium">Selected Color</p>
              <p className="text-xs text-muted-foreground">{config.hoverBorderColor}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {["#22C55E", "#3B82F6", "#EF4444", "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6", "#1F2937"].map(
              (color) => (
                <button
                  key={color}
                  onClick={() => {
                    setHoverBorderColor(color);
                    toast.success("Hover border color updated");
                  }}
                  className="w-8 h-8 rounded-full border-2 border-transparent hover:scale-110 transition-transform"
                  style={{
                    backgroundColor: color,
                    borderColor: config.hoverBorderColor === color ? "hsl(var(--foreground))" : "transparent",
                  }}
                />
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Glow Intensity */}
      <Card className={cardHoverClass}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Glow Intensity
          </CardTitle>
          <CardDescription className="text-xs">
            Adjust the hover glow effect (0 - 50 pixels)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Slider
            value={config.glowIntensity}
            onChange={(value) => {
              setGlowIntensity(value);
            }}
            min={0}
            max={50}
            step={1}
            label="Glow Radius"
          />
          <div className="mt-4 p-4 bg-secondary rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Preview:</p>
            <div
              className="w-full h-16 rounded-lg bg-primary/10 border transition-all duration-300"
              style={{
                boxShadow: `0 0 ${config.glowIntensity}px ${config.primaryColor}40`,
                borderColor: config.hoverBorderColor,
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Reset Button */}
      <Button
        variant="outline"
        onClick={handleReset}
        className="w-full"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Reset to Default
      </Button>
    </div>
  );
}
