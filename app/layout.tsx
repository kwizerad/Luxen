import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/lib/language-context";
import { ThemeConfigProvider } from "@/lib/theme-config";
import { BrandingConfigProvider } from "@/lib/branding-config";
import { AuthProvider } from "@/lib/auth-context";
import { AuthModalsProvider } from "@/lib/auth-modals-context";
import { FloatingSettings } from "@/components/floating-settings";
import { AuthModalsContainer } from "@/components/auth-modals-container";
import { ClientComponents } from "@/components/client-components";
import { UserPreferencesLoader } from "@/components/user-preferences-loader";
import { Toaster } from "@/components/ui/sonner";
import { GoogleAuthProvider } from "@/components/auth/GoogleAuthProvider";
import { ServiceWorkerRegistration } from "@/components/sw-registration";
import { ParticlesBackground } from "@/components/particles-background";
import { GlobalClickSpark } from "@/components/global-click-spark";
import { BackgroundManager } from "@/components/background-manager";
import { NetworkStatus } from "@/components/network-status";
import { SystemWatermark } from "@/components/system-watermark";
import { getSystemName } from "@/lib/server-config";
import { createAdminClient } from "@/lib/supabase/admin";
import "sonner/dist/styles.css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const defaultUrl = process.env.NEXT_PUBLIC_APP_URL || "https://navo.rw";

export async function generateMetadata(): Promise<Metadata> {
  let logoUrl: string | null = null;
  let configuredSystemName = getSystemName();

  try {
    const adminSupabase = createAdminClient();
    const { data: brandData } = await adminSupabase
      .from("system_config")
      .select("value")
      .eq("key", "branding_config")
      .single();

    if (brandData?.value) {
      const parsed = JSON.parse(brandData.value);
      if (parsed.logoUrl) {
        logoUrl = parsed.logoUrl;
      }
      if (parsed.systemName) {
        configuredSystemName = parsed.systemName;
      }
    }
  } catch {
    // Fallback to default icons if database is unreachable during build
  }

  const ogImage = logoUrl || "/icons/icon-512x512.png";

  return {
    metadataBase: new URL(defaultUrl),
    title: {
      default: "Navo PVS",
      template: "%s | Navo PVS",
    },
    description:
      "Pass your Rwanda driving theory exam. Study official traffic regulations (Amategeko y'Umuhanda), practice real mock exams, road signs, and audio lessons in Kinyarwanda, English, and French.",
    keywords: [
      "navo",
      "navo.rw",
      "amategeko y'umuhanda",
      "ibizamini by'uruhushya rw'agateganyo",
      "ibizamini bya polisi",
      "irembo driving exam",
      "provisional driving license rwanda",
      "rwanda traffic rules",
      "code de la route rwandais",
      "permis provisoire rwanda",
      "ibimenyetso byo ku muhanda",
      "auto ecole kigali",
      "driving school rwanda",
      "ibibazo n'ibisubizo by'amategeko y'umuhanda",
    ],
    authors: [{ name: "Navo Rwanda", url: "https://navo.rw" }],
    creator: configuredSystemName,
    publisher: configuredSystemName,
    category: "Education",
    alternates: {
      canonical: "https://navo.rw",
    },
    openGraph: {
      type: "website",
      locale: "rw_RW",
      alternateLocale: ["en_US", "fr_FR"],
      url: "https://navo.rw",
      siteName: configuredSystemName,
      title: "Navo PVS",
      description:
        "Pass your Rwanda driving theory exam with official practice tests, traffic regulations, AI explanations, and multilingual study guides in Kinyarwanda, English, and French.",
      images: [
        {
          url: ogImage,
          width: 512,
          height: 512,
          alt: "Navo - Rwanda Driving Platform",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Navo PVS",
      description: "Official Rwanda traffic regulations, mock exams, road signs, and voice explanations.",
      images: [ogImage],
    },
    manifest: "/manifest.json",
    applicationName: configuredSystemName,
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: configuredSystemName,
      startupImage: [
        { url: logoUrl || "/icons/icon-192x192.png", media: "(device-width: 320px)" },
        { url: logoUrl || "/icons/icon-180x180.png", media: "(device-width: 375px)" },
      ],
    },
    formatDetection: {
      telephone: false,
    },
    icons: logoUrl
      ? {
          icon: [{ url: logoUrl }],
          shortcut: [{ url: logoUrl }],
          apple: [{ url: logoUrl }],
        }
      : {
          icon: [
            { url: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
            { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
            { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
          ],
          shortcut: [
            { url: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
          ],
          apple: [
            { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
            { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
            { url: "/icons/icon-120x120.png", sizes: "120x120", type: "image/png" },
            { url: "/icons/icon-76x76.png", sizes: "76x76", type: "image/png" },
          ],
        },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#22c55e",
  viewportFit: "cover",
};

// Font configuration for static export (no Google Fonts network dependency)
// Using system font stack via CSS

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body suppressHydrationWarning className={`${inter.className} antialiased min-h-[100dvh]`}>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var s=localStorage.getItem('navo-theme');var isDark=false;if(s==='dark'){isDark=true;}else if(s==='light'){isDark=false;}else if(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches){isDark=true;}if(isDark){document.documentElement.classList.add('dark');document.documentElement.classList.remove('light');document.documentElement.style.colorScheme='dark';}else{document.documentElement.classList.add('light');document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light';}}catch(e){document.documentElement.classList.add('light');}try{var raw=localStorage.getItem('navo-theme-config');if(raw){var cfg=JSON.parse(raw);function hexToHSL(hex){var r=/^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);if(!r)return null;var R=parseInt(r[1],16)/255,G=parseInt(r[2],16)/255,B=parseInt(r[3],16)/255;var mx=Math.max(R,G,B),mn=Math.min(R,G,B);var h=0,s2=0,l=(mx+mn)/2;if(mx!==mn){var d=mx-mn;s2=l>0.5?d/(2-mx-mn):d/(mx+mn);if(mx===R)h=((G-B)/d+(G<B?6:0))/6;else if(mx===G)h=((B-R)/d+2)/6;else h=((R-G)/d+4)/6;}return{h:Math.round(h*360),s:Math.round(s2*100),l:Math.round(l*100)};}var isD=document.documentElement.classList.contains('dark');var tc=isD?cfg.dark:cfg.light;if(tc){var hsl=hexToHSL(tc.primaryColor);if(hsl){var el=document.documentElement.style;el.setProperty('--primary',hsl.h+' '+hsl.s+'% '+hsl.l+'%');el.setProperty('--primary-foreground',hsl.l>50?'0 0% 0%':'0 0% 100%');el.setProperty('--ring',hsl.h+' '+hsl.s+'% '+hsl.l+'%');var aL=Math.max(0,hsl.l-10);el.setProperty('--accent',hsl.h+' '+hsl.s+'% '+aL+'%');el.setProperty('--accent-foreground',aL>50?'0 0% 0%':'0 0% 100%');}el.setProperty('--hover-border-color',tc.hoverBorderColor);el.setProperty('--glow-intensity',(cfg.glowIntensity||24)+'px');if(tc.primaryColor){var m=document.querySelectorAll('meta[name="theme-color"]');if(m.length>0){m.forEach(function(el){var med=el.getAttribute('media');if(med&&med.indexOf('light')!==-1&&cfg.light){el.setAttribute('content',cfg.light.primaryColor);}else if(med&&med.indexOf('dark')!==-1&&cfg.dark){el.setAttribute('content',cfg.dark.primaryColor);}else{el.setAttribute('content',tc.primaryColor);}});}else{var nm=document.createElement('meta');nm.name='theme-color';nm.content=tc.primaryColor;document.head.appendChild(nm);}}}if(cfg.backgroundMode==='gradient'){document.documentElement.classList.add('mesh-gradient-bg');}}}catch(e){}})();`}
        </Script>
        <Script
          id="schema-org-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "EducationalApplication",
              name: "Navo",
              alternateName: ["Navo Rwanda", "Navo Driving Theory", "Amategeko y'Umuhanda Navo"],
              url: "https://navo.rw",
              applicationCategory: "EducationalApplication",
              operatingSystem: "Web, iOS, Android",
              description:
                "Rwanda's leading driving theory and police provisional exam preparation platform with official traffic regulations, real mock exams, and trilingual study guides.",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "RWF",
              },
              areaServed: {
                "@type": "Country",
                name: "Rwanda",
              },
              inLanguage: ["rw", "en", "fr"],
            }),
          }}
        />
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem={true}
            disableTransitionOnChange
            storageKey="navo-theme"
          >
            <ThemeConfigProvider>
              <BackgroundManager />
              <GlobalClickSpark />
              <ParticlesBackground />
              <BrandingConfigProvider>
                <SystemWatermark />
                <LanguageProvider>
                  <AuthProvider>
                    <GoogleAuthProvider>
                      <ServiceWorkerRegistration />
                      <AuthModalsProvider>
                        <Toaster position="top-right" richColors closeButton />
                        {children}
                        <NetworkStatus />
                        <FloatingSettings />
                        <AuthModalsContainer />
                        <ClientComponents />
                        <UserPreferencesLoader />
                      </AuthModalsProvider>
                    </GoogleAuthProvider>
                  </AuthProvider>
                </LanguageProvider>
              </BrandingConfigProvider>
            </ThemeConfigProvider>
          </ThemeProvider>
        
      </body>
    </html>
  );
}
