"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 p-1 rounded-[14px] bg-muted/60 border border-border/20">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme("light")}
        className={theme === "light" ? "bg-background/80 shadow-sm rounded-[10px]" : "rounded-[10px]"}
      >
        <Sun className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Light</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme("dark")}
        className={theme === "dark" ? "bg-background/80 shadow-sm rounded-[10px]" : "rounded-[10px]"}
      >
        <Moon className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Dark</span>
      </Button>
    </div>
  );
}
