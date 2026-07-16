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
};

export default nextConfig;
