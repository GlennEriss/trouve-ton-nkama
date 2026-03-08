import type { NextConfig } from "next";
import withPWA, { runtimeCaching as defaultRuntimeCaching } from '@ducanh2912/next-pwa';

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
        pathname: '/v0/b/**/o/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
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

const staticJsRuntimeCache = defaultRuntimeCaching.find(
  (entry) => entry.options?.cacheName === 'static-js-assets'
);

const crossOriginRuntimeCache = defaultRuntimeCaching.find(
  (entry) => entry.options?.cacheName === 'cross-origin'
);

const runtimeCachingOverrides = [
  ...(staticJsRuntimeCache
    ? [
        {
          ...staticJsRuntimeCache,
          // Keep static JS cache for first-party scripts only.
          urlPattern: ({ sameOrigin, url }: { sameOrigin: boolean; url: URL }) =>
            sameOrigin && /\.(?:js)$/i.test(url.pathname),
        },
      ]
    : []),
  ...(crossOriginRuntimeCache
    ? [
        {
          ...crossOriginRuntimeCache,
          // Do not route AdSense traffic through Workbox runtime caching.
          urlPattern: ({ sameOrigin, url }: { sameOrigin: boolean; url: URL }) =>
            !sameOrigin &&
            ![
              'pagead2.googlesyndication.com',
              'tpc.googlesyndication.com',
              'googleads.g.doubleclick.net',
              'securepubads.g.doubleclick.net',
            ].includes(url.hostname),
        },
      ]
    : []),
];

const withPwaConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching: runtimeCachingOverrides,
  },
});

// Turbopack warns when `webpack` is configured but `turbo` is not.
// next-pwa injects a webpack function even when disabled in development,
// so we only apply the plugin outside development.
export default process.env.NODE_ENV === 'development'
  ? nextConfig
  : withPwaConfig(nextConfig);
