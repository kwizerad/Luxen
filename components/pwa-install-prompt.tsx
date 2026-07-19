"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Smartphone } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAInstallPrompt() {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    setIsIOS(isIOSDevice);

    // Handle beforeinstallprompt event (Chrome/Edge/Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after a short delay for better UX
      const timer = setTimeout(() => {
        const dismissed = typeof window !== "undefined" ? localStorage.getItem("navo-pwa-dismissed") : null;
        const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        
        if (!dismissed || Date.now() - dismissedTime > oneWeek) {
          setIsVisible(true);
        }
      }, 3000);

      return () => clearTimeout(timer);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Handle appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("navo-pwa-dismissed");
      }
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    // For iOS: show prompt after delay if not dismissed
    if (isIOSDevice) {
      const timer = setTimeout(() => {
        const dismissed = typeof window !== "undefined" ? localStorage.getItem("navo-pwa-dismissed") : null;
        const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        
        if (!dismissed || Date.now() - dismissedTime > oneWeek) {
          setIsVisible(true);
        }
      }, 5000);

      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt && !isIOS) return;

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
    
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("navo-pwa-dismissed", Date.now().toString());
    }
  };

  if (!mounted || isInstalled || !isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 md:bottom-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-card border rounded-lg shadow-lg p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              {isIOS ? (
                <Smartphone className="w-5 h-5 text-primary" />
              ) : (
                <Download className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm leading-tight">
                {t("pwa.installNavoLite")}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {isIOS 
                  ? t("pwa.iosInstallDescription")
                  : t("pwa.installDescription")
                }
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={t("dismissInstallPrompt")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isIOS && (
          <div className="mt-3">
            <Button 
              onClick={handleInstall} 
              size="sm" 
              className="w-full gap-2"
            >
              <Download className="w-4 h-4" />
              {t("installApp")}
            </Button>
          </div>
        )}

        {isIOS && (
          <div className="mt-3 text-xs text-muted-foreground bg-muted rounded px-3 py-2">
            <strong>{t("pwa.howToInstall")}</strong>
            <ol className="mt-1 ml-4 list-decimal space-y-0.5">
              <li>{t("pwa.iosStepOne")}</li>
              <li>{t("pwa.iosStepTwo")}</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
