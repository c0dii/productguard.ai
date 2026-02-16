import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['halputuievkcapwlatgp.supabase.co'],
  },
  // Configure for Stripe webhook raw body handling
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Webpack optimizations
  webpack: (config, { isServer }) => {
    // Optimize bundle size
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Reduce bundle size by using lighter alternatives
        '@supabase/ssr': '@supabase/ssr',
      };
    }

    // Improve build performance
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
    };

    return config;
  },
  // Improve incremental builds
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;
