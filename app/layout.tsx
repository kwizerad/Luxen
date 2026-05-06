import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/lib/language-context";

// Use CSS variables for fonts to support static export without network dependencies
const fontClass = "font-sans";
import { ThemeConfigProvider } from "@/lib/theme-config";
import { BrandingConfigProvider } from "@/lib/branding-config";
import { AuthProvider } from "@/lib/auth-context";
import { AuthModalsProvider } from "@/lib/auth-modals-context";
import { FloatingSettings } from "@/components/floating-settings";
import { GoogleOneTap } from "@/components/google-one-tap";
import { AuthModalsContainer } from "@/components/auth-modals-container";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Navo Lite - Modern Learning Platform",
  description: "Navo Lite - Your lightweight modern learning platform. Access courses, exams, and learning materials even offline.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Navo Lite",
  },
  icons: {
    icon: [
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
      <head>
        <script src="/theme-init.js" />
      </head>
      <body className={`${fontClass} antialiased`}>
        <BrandingConfigProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            storageKey="navo-theme"
          >
            <LanguageProvider>
              <AuthProvider>
                <AuthModalsProvider>
                  <ThemeConfigProvider>
                  {children}
                  <FloatingSettings />
                  <GoogleOneTap />
                  <AuthModalsContainer />
                  <PWAInstallPrompt />
                  <Toaster position="top-right" richColors closeButton />
                </ThemeConfigProvider>
              </AuthModalsProvider>
              </AuthProvider>
            </LanguageProvider>
          </ThemeProvider>
        </BrandingConfigProvider>
      </body>
    </html>
  );
}
