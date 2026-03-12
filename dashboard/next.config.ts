import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    // Proxy /uploads/* to the Express server so generated HTML files
    // (served from Next.js public/) can load images and allergen icons.
    const apiHost = process.env.NEXT_PUBLIC_API_URL
      ? new URL(process.env.NEXT_PUBLIC_API_URL).origin
      : 'http://localhost:5000';
    return [
      {
        source: '/uploads/:path*',
        destination: `${apiHost}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
