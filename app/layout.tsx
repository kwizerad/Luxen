import type { Metadata, Viewport } from "next";
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
import { getSystemName } from "@/lib/server-config";
import "./globals.css";

const fontClass = "font-sans";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

const systemName = getSystemName();

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: `${systemName} Lite - Modern Learning Platform`,
  description: `${systemName} Lite - Your lightweight modern learning platform. Access courses, exams, and learning materials even offline.`,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: `${systemName} Lite`,
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
      { url: "/icons/icon-192x192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/icon-512x512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/icon-192x192.svg", sizes: "192x192" },
      { url: "/icons/icon-180x180.svg", sizes: "180x180" },
      { url: "/icons/icon-120x120.svg", sizes: "120x120" },
      { url: "/icons/icon-76x76.svg", sizes: "76x76" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#3b82f6",
};

// Font configuration for static export (no Google Fonts network dependency)
// Using system font stack via CSS

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontClass} antialiased`}>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            storageKey="navo-theme"
          >
            <ThemeConfigProvider>
              <BrandingConfigProvider>
                <LanguageProvider>
                  <AuthProvider>
                    <AuthModalsProvider>
                      {children}
                      <FloatingSettings />
                      <AuthModalsContainer />
                      <ClientComponents />
                      <UserPreferencesLoader />
                      <Toaster position="top-right" richColors closeButton />
                    </AuthModalsProvider>
                  </AuthProvider>
                </LanguageProvider>
              </BrandingConfigProvider>
            </ThemeConfigProvider>
          </ThemeProvider>
        
      </body>
    </html>
  );
}
