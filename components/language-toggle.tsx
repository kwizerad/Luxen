"use client";

import { useState } from "react";

export function LanguageToggle() {
  const [language, setLanguage] = useState<"EN" | "RW">("RW");

  return (
    <div className="flex items-center gap-2 text-sm font-medium">
      <button
        onClick={() => setLanguage("EN")}
        className={`px-2 py-1 rounded transition-colors ${
          language === "EN"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </button>
      <span className="text-muted-foreground">|</span>
      <button
        onClick={() => setLanguage("RW")}
        className={`px-2 py-1 rounded transition-colors ${
          language === "RW"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        RW
      </button>
    </div>
  );
}
