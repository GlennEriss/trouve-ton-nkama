import type { NextConfig } from "next";
import withPWA from '@ducanh2912/next-pwa';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'tonnkama.com',
          },
        ],
        destination: 'https://www.tonnkama.com/:path*',
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        port: '',
        pathname: '/*',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/v0/b/home-rent-1534e.appspot.com/o/*',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/v0/b/location-maison-prod-167da.firebasestorage.app/o/*',
      },
      {
        protocol: 'https',
        hostname: 'tonnkama.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.tonnkama.com',
        port: '',
        pathname: '/**',
      },
    ],
    unoptimized: true, // Désactive l'optimisation d'image de Next.js
  },
};

const withPwaConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

// Turbopack warns when `webpack` is configured but `turbo` is not.
// next-pwa injects a webpack function even when disabled in development,
// so we only apply the plugin outside development.
export default process.env.NODE_ENV === 'development'
  ? nextConfig
  : withPwaConfig(nextConfig);
