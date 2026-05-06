import type { NextConfig } from "next";
import withPWA from "next-pwa";

// Development config WITHOUT static export
// Use this for: npm run dev or local testing with API routes

const nextConfig: NextConfig = {
  // Enable for development to use API routes and middleware
  output: undefined,
  
  // Disable image optimization for testing
  images: {
    unoptimized: true,
  },
  
  // Silence Turbopack warning
  turbopack: {},
  
  // Handle trailing slashes consistently
  trailingSlash: true,
};

// Apply PWA configuration
const config = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: false,
  buildExcludes: [/middleware-manifest.json$/],
  runtimeCaching: [
    {
      urlPattern: /^https?:\/\/.*\.(?:js|css|woff2?|ttf|otf)$/,
      handler: "CacheFirst",
      options: {
        cacheName: "static-assets",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /^https?:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
      handler: "CacheFirst",
      options: {
        cacheName: "images",
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/(?!auth).*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "supabase-data",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60,
        },
        networkTimeoutSeconds: 3,
      },
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/v1\/.*/,
      handler: "NetworkOnly",
    },
    {
      urlPattern: /^https:\/\/.*\/api\/(?!auth).*/,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "api-cache",
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60,
        },
      },
    },
    {
      urlPattern: /\//,
      handler: "NetworkFirst",
      options: {
        cacheName: "pages",
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60,
        },
        networkTimeoutSeconds: 3,
        plugins: [
          {
            cachedResponseWillBeUsed: async ({ cachedResponse }: { cachedResponse: Response | null }) => {
              if (!cachedResponse) {
                return caches.match("/offline");
              }
              return cachedResponse;
            },
          },
        ],
      },
    },
  ],
  fallbacks: {
    document: "/offline",
  },
})(nextConfig);

export default config;
