/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: '.next',
  images: {
    unoptimized: false,
    domains: [],
    remotePatterns: [],
  },
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: [
      'recharts',
      'lucide-react',
      'framer-motion',
      '@radix-ui/react-icons',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-label',
      '@radix-ui/react-progress',
      '@radix-ui/react-switch',
      'date-fns',
    ],
  },
};

export default nextConfig;
