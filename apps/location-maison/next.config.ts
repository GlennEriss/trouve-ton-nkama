import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Configuration pour forcer www comme version canonique
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

export default nextConfig;
