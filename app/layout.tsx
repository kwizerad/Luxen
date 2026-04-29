import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/lib/language-context";
import { ThemeConfigProvider } from "@/lib/theme-config";
import { Toaster } from "@/components/ui/sonner";
import Script from "next/script";
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
      </head>
      <body className={`${inter.className} antialiased`}>
        <Script
          id="theme-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function getTheme() {
                  const stored = localStorage.getItem('navo-theme');
                  if (stored) return stored;
                  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                }
                const theme = getTheme();
                document.documentElement.classList.add(theme);
                
                // Apply custom theme config
                const themeConfig = localStorage.getItem('navo-theme-config');
                if (themeConfig) {
                  try {
                    const config = JSON.parse(themeConfig);
                    
                    // Hex to HSL conversion
                    function hexToHSL(hex) {
                      const result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
                      if (!result) return null;
                      let r = parseInt(result[1], 16) / 255;
                      let g = parseInt(result[2], 16) / 255;
                      let b = parseInt(result[3], 16) / 255;
                      const max = Math.max(r, g, b);
                      const min = Math.min(r, g, b);
                      let h = 0, s = 0, l = (max + min) / 2;
                      if (max !== min) {
                        const d = max - min;
                        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                        switch (max) {
                          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                          case g: h = ((b - r) / d + 2) / 6; break;
                          case b: h = ((r - g) / d + 4) / 6; break;
                        }
                      }
                      return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
                    }
                    
                    const hsl = hexToHSL(config.primaryColor);
                    if (hsl) {
                      document.documentElement.style.setProperty('--primary', hsl.h + ' ' + hsl.s + '% ' + hsl.l + '%');
                      document.documentElement.style.setProperty('--primary-foreground', hsl.l > 50 ? '0 0% 0%' : '0 0% 100%');
                    }
                    document.documentElement.style.setProperty('--hover-border-color', config.hoverBorderColor);
                    document.documentElement.style.setProperty('--glow-intensity', config.glowIntensity + 'px');
                  } catch (e) {}
                }
              })();
            `,
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="navo-theme"
        >
          <LanguageProvider>
            <ThemeConfigProvider>
              {children}
              <Toaster position="top-right" richColors closeButton />
            </ThemeConfigProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
