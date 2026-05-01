"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";

type Language = "English" | "Arabic" | "Kinyarwanda" | "French";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Get default system name from localStorage or fallback to "Navo"
const getDefaultSystemName = (): string => {
  if (typeof window === "undefined") return "Navo";
  const saved = localStorage.getItem("navo-branding-config");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return parsed.systemName || "Navo";
    } catch (e) {
      return "Navo";
    }
  }
  return "Navo";
};

const translations: Record<Language, Record<string, string>> = {
  English: {
    "navo": "Navo",
    "home": "Home",
    "about": "About",
    "features": "Features",
    "welcome": "Welcome",
    "welcome.description": "Your modern SaaS application is ready. Get started by authenticating to access all features.",
    "signIn": "Sign In",
    "createAccount": "Create Account",
    "secure": "Secure",
    "secure.description": "Enterprise-grade security with end-to-end encryption",
    "fast": "Fast",
    "fast.description": "Lightning-fast performance with global CDN",
    "simple": "Simple",
    "simple.description": "Intuitive interface designed for everyone",
    "theme": "Theme",
    "language": "Language",
    "textSize": "Text Size",
    "help": "Help",
    "small": "Small",
    "medium": "Medium",
    "large": "Large",
    "system": "System",
    "light": "Light",
    "dark": "Dark",
  },
  Arabic: {
    "navo": "نافو",
    "home": "الرئيسية",
    "about": "حول",
    "features": "الميزات",
    "welcome": "مرحباً",
    "welcome.description": "تطبيق SaaS الحديث الخاص بك جاهز. ابدأ بالمصادقة للوصول إلى جميع الميزات.",
    "signIn": "تسجيل الدخول",
    "createAccount": "إنشاء حساب",
    "secure": "آمن",
    "secure.description": "أمان على مستوى المؤسسات مع تشفير من طرف إلى طرف",
    "fast": "سريع",
    "fast.description": "أداء سريع للغاية مع شبكة توصيل محتوى عالمية",
    "simple": "بسيط",
    "simple.description": "واجهة بديهية مصممة للجميع",
    "theme": "المظهر",
    "language": "اللغة",
    "textSize": "حجم النص",
    "help": "مساعدة",
    "small": "صغير",
    "medium": "متوسط",
    "large": "كبير",
    "system": "النظام",
    "light": "فاتح",
    "dark": "داكن",
  },
  French: {
    "navo": "Navo",
    "home": "Accueil",
    "about": "À propos",
    "features": "Fonctionnalités",
    "welcome": "Bienvenue",
    "welcome.description": "Votre application SaaS moderne est prête. Connectez-vous pour accéder à toutes les fonctionnalités.",
    "signIn": "Connexion",
    "createAccount": "Créer un compte",
    "secure": "Sécurisé",
    "secure.description": "Sécurité de niveau entreprise avec chiffrement de bout en bout",
    "fast": "Rapide",
    "fast.description": "Performances ultra rapides avec CDN mondial",
    "simple": "Simple",
    "simple.description": "Interface intuitive conçue pour tous",
    "theme": "Thème",
    "language": "Langue",
    "textSize": "Taille du texte",
    "help": "Aide",
    "small": "Petit",
    "medium": "Moyen",
    "large": "Grand",
    "system": "Système",
    "light": "Clair",
    "dark": "Sombre",
  },
  Kinyarwanda: {
    "navo": "Navo",
    "home": "Ahabanza",
    "about": "Ibyerekeye",
    "features": "Ibirimo",
    "welcome": "Murakaza neza",
    "welcome.description": "Porogaramu yawe ya SaaS ya kigezweho iri gukorera. Tangira ukoresheje kugira ngo uwinjire mubirimo byose.",
    "signIn": "Injira",
    "createAccount": "Yindi konti",
    "secure": "Bwenge",
    "secure.description": "Ubwenge ku rwiyemezamirimo hamwe nuburyo bwo gushyiramo amabwiriza",
    "fast": "Byihuse",
    "fast.description": "Imikorara myiza cyane hamwe na CDN yisi yose",
    "simple": "Byoroshye",
    "simple.description": "Imigaragarire yoroshye yubwenge bwose",
    "theme": "Uburyo",
    "language": "Ururimi",
    "textSize": "Ingano y'inyandiko",
    "help": "Ifashayobora",
    "small": "Gitoya",
    "medium": "Gatoya",
    "large": "Kinini",
    "system": "Sisitemu",
    "light": "Umutuku",
    "dark": "Umukara",
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("English");
  const [systemName, setSystemName] = useState<string>("Navo");

  useEffect(() => {
    const savedLanguage = typeof window !== "undefined" ? localStorage.getItem("navo-language") : null;
    if (savedLanguage && ["English", "Arabic", "Kinyarwanda", "French"].includes(savedLanguage)) {
      setLanguageState(savedLanguage as Language);
    }

    setSystemName(getDefaultSystemName());

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "navo-branding-config") {
        setSystemName(getDefaultSystemName());
      }
      if (e.key === "navo-language" && e.newValue && ["English", "Arabic", "Kinyarwanda", "French"].includes(e.newValue)) {
        setLanguageState(e.newValue as Language);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("navo-language", lang);
    }
  };

  const t = (key: string): string => {
    if (key === "navo") {
      return systemName;
    }
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
