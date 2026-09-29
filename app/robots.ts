import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://navo.rw";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/Admin",
          "/Admin/*",
          "/api/*",
          "/_next/*",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
