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
import "sonner/dist/styles.css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

const systemName = getSystemName();

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: `${systemName} - Modern Learning Platform`,
  description: `${systemName} - Your lightweight modern learning platform. Access exams and learning materials even offline.`,
  manifest: "/manifest.json",
  applicationName: `${systemName}`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: `${systemName}`,
    startupImage: [
      { url: "/icons/icon-192x192.png", media: "(device-width: 320px)" },
      { url: "/icons/icon-180x180.png", media: "(device-width: 375px)" },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
      <body className={`${inter.className} antialiased min-h-[100dvh]`}>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var s=localStorage.getItem('navo-theme');var t=s||'light';if(!s&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches){t='dark';}document.documentElement.classList.add(t);}catch(e){document.documentElement.classList.add('light');}try{var raw=localStorage.getItem('navo-theme-config');if(raw){var cfg=JSON.parse(raw);function hexToHSL(hex){var r=/^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);if(!r)return null;var R=parseInt(r[1],16)/255,G=parseInt(r[2],16)/255,B=parseInt(r[3],16)/255;var mx=Math.max(R,G,B),mn=Math.min(R,G,B);var h=0,s2=0,l=(mx+mn)/2;if(mx!==mn){var d=mx-mn;s2=l>0.5?d/(2-mx-mn):d/(mx+mn);if(mx===R)h=((G-B)/d+(G<B?6:0))/6;else if(mx===G)h=((B-R)/d+2)/6;else h=((R-G)/d+4)/6;}return{h:Math.round(h*360),s:Math.round(s2*100),l:Math.round(l*100)};}var isDark=document.documentElement.classList.contains('dark');var tc=isDark?cfg.dark:cfg.light;if(tc){var hsl=hexToHSL(tc.primaryColor);if(hsl){var el=document.documentElement.style;el.setProperty('--primary',hsl.h+' '+hsl.s+'% '+hsl.l+'%');el.setProperty('--primary-foreground',hsl.l>50?'0 0% 0%':'0 0% 100%');el.setProperty('--ring',hsl.h+' '+hsl.s+'% '+hsl.l+'%');var aL=Math.max(0,hsl.l-10);el.setProperty('--accent',hsl.h+' '+hsl.s+'% '+aL+'%');el.setProperty('--accent-foreground',aL>50?'0 0% 0%':'0 0% 100%');}el.setProperty('--hover-border-color',tc.hoverBorderColor);el.setProperty('--glow-intensity',(cfg.glowIntensity||24)+'px');}if(cfg.backgroundMode==='gradient'){document.body.classList.add('mesh-gradient-bg');}}}catch(e){}})();`}
        </Script>
        <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
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
                    <GoogleAuthProvider lazy>
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
