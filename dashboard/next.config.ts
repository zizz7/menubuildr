import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    // Proxy /uploads/* and /menus/* to the Express server
    const apiHost = process.env.NEXT_PUBLIC_API_URL
      ? new URL(process.env.NEXT_PUBLIC_API_URL).origin
      : 'http://localhost:5000';
    return [
      {
        source: '/uploads/:path*',
        destination: `${apiHost}/uploads/:path*`,
      },
      {
        source: '/menus/:path*',
        destination: `${apiHost}/menus/:path*`,
      },
    ];
  },
};

export default nextConfig;
