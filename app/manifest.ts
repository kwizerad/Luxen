import { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let themeColor = "#22C55E";
  let systemName = "Navo PVS";

  try {
    const adminSupabase = createAdminClient();
    const { data: themeData } = await adminSupabase
      .from("system_config")
      .select("value")
      .eq("key", "theme_config")
      .single();

    if (themeData?.value) {
      const parsed = JSON.parse(themeData.value);
      if (parsed.light?.primaryColor) {
        themeColor = parsed.light.primaryColor;
      }
    }

    const { data: brandData } = await adminSupabase
      .from("system_config")
      .select("value")
      .eq("key", "branding_config")
      .single();

    if (brandData?.value) {
      const parsedBrand = JSON.parse(brandData.value);
      if (parsedBrand.systemName) {
        systemName = parsedBrand.systemName;
      }
    }
  } catch {}

  return {
    name: systemName,
    short_name: systemName,
    description: `${systemName} - Your lightweight modern learning platform. Access exams and learning materials offline.`,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: themeColor,
    orientation: "portrait-primary",
    scope: "/",
    lang: "en",
    dir: "ltr",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/icons/icon-192x192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: "/icons/icon-maskable.svg",
        sizes: "192x192 512x512",
        type: "image/svg+xml",
        purpose: "maskable"
      },
      {
        src: "/icons/icon-512x512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: "/icons/icon-180x180.svg",
        sizes: "180x180",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: "/icons/icon-120x120.svg",
        sizes: "120x120",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: "/icons/icon-76x76.svg",
        sizes: "76x76",
        type: "image/svg+xml",
        purpose: "any"
      }
    ],
    related_applications: [],
    prefer_related_applications: false,
    shortcuts: [
      {
        name: "Dashboard",
        short_name: "Dashboard",
        description: "Go to your dashboard",
        url: "/dashboard",
        icons: [{ "src": "/icons/icon-96x96.svg", "sizes": "96x96" }]
      },
      {
        name: "My Exams",
        short_name: "Exams",
        description: "View your exams",
        url: "/dashboard?view=exams",
        icons: [{ "src": "/icons/icon-96x96.svg", "sizes": "96x96" }]
      }
    ]
  };
}