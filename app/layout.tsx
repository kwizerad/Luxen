import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/lib/language-context";
import { ThemeConfigProvider } from "@/lib/theme-config";
import { BrandingConfigProvider } from "@/lib/branding-config";
import { AuthModalsProvider } from "@/lib/auth-modals-context";
import { FloatingSettings } from "@/components/floating-settings";
import { GoogleOneTap } from "@/components/google-one-tap";
import { AuthModalsContainer } from "@/components/auth-modals-container";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Navo",
  description: "Navo - Your modern learning platform",
};

const inter = Inter({
  variable: "--font-inter",
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

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
      <body className={`${inter.className} antialiased`}>
        <BrandingConfigProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            storageKey="navo-theme"
          >
            <LanguageProvider>
              <AuthModalsProvider>
                <ThemeConfigProvider>
                  {children}
                  <FloatingSettings />
                  <GoogleOneTap />
                  <AuthModalsContainer />
                  <Toaster position="top-right" richColors closeButton />
                </ThemeConfigProvider>
              </AuthModalsProvider>
            </LanguageProvider>
          </ThemeProvider>
        </BrandingConfigProvider>
      </body>
    </html>
  );
}
