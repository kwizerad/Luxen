"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/language-context";

export function SiteFooter() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border/20 bg-card/60 backdrop-blur-[24px] py-8 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row px-6">
        <p className="text-sm text-muted-foreground">
          {t("builtWith")}
        </p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link
            href="/"
            className="hover:text-foreground transition-colors"
          >
            {t("home")}
          </Link>
          <Link
            href="/"
            className="hover:text-foreground transition-colors"
          >
            {t("login")}
          </Link>
          <Link
            href="/auth/sign-up"
            className="hover:text-foreground transition-colors"
          >
            {t("signUp")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
