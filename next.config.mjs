/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['apexcharts', 'react-apexcharts'],
  },
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;
