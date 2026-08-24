/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  devIndicators: false,
  compress: true,
  poweredByHeader: false,
  compiler: {
    removeConsole: {
      exclude: ['error'],
    },
  },
  experimental: {
    optimizePackageImports: ['apexcharts', 'react-apexcharts'],
  },
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  async redirects() {
    return [{ source: '/favicon.ico', destination: '/logo.png', permanent: true }];
  },
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();
