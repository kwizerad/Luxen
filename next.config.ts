import type { NextConfig } from "next";
const withPWA = require("next-pwa");

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Disable image optimization for PWA static export compatibility
  images: {
    unoptimized: true,
  },
  // Silence Turbopack warning
  turbopack: {},
};

// Apply PWA configuration only in production
const config = isProduction
  ? withPWA({
      dest: "public",
      register: true,
      skipWaiting: true,
      disable: false,
      buildExcludes: [/middleware-manifest.json$/],
      // Runtime caching strategies
      runtimeCaching: [
        // Cache static assets (JS, CSS, fonts)
        {
          urlPattern: /^https?:\/\/.*\.(?:js|css|woff2?|ttf|otf)$/,
          handler: "CacheFirst",
          options: {
            cacheName: "static-assets",
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
            },
          },
        },
        // Cache images
        {
          urlPattern: /^https?:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
          handler: "CacheFirst",
          options: {
            cacheName: "images",
            expiration: {
              maxEntries: 200,
              maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
            },
          },
        },
        // Supabase API - Network first, fallback to cache
        // This ensures auth works but provides offline support for data
        {
          urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/(?!auth).*/,
          handler: "NetworkFirst",
          options: {
            cacheName: "supabase-data",
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 24 * 60 * 60, // 1 day
            },
            networkTimeoutSeconds: 3,
          },
        },
        // Do NOT cache auth endpoints - always network
        {
          urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/v1\/.*/,
          handler: "NetworkOnly",
        },
        // Cache other API responses with stale-while-revalidate
        {
          urlPattern: /^https:\/\/.*\/api\/(?!auth).*/,
          handler: "StaleWhileRevalidate",
          options: {
            cacheName: "api-cache",
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60, // 1 hour
            },
          },
        },
        // Fallback for all other navigation requests
        {
          urlPattern: /\//,
          handler: "NetworkFirst",
          options: {
            cacheName: "pages",
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 24 * 60 * 60, // 1 day
            },
            networkTimeoutSeconds: 3,
            plugins: [
              {
                // Redirect to offline page when network fails
                cachedResponseWillBeUsed: async ({ cachedResponse }: { cachedResponse: Response | null }) => {
                  if (!cachedResponse) {
                    // Return the offline page
                    return caches.match("/offline");
                  }
                  return cachedResponse;
                },
              },
            ],
          },
        },
      ],
      // Additional options for better PWA experience
      fallbacks: {
        document: "/offline",
      },
    })(nextConfig)
  : nextConfig;

export default config;
