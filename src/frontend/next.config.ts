import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/generate-graph',
        destination: 'http://localhost:8000/api/generate-graph',
      },
      {
        source: '/api/stream-generate-graph',
        destination: 'http://localhost:8000/api/stream-generate-graph',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Connection',
            value: 'keep-alive',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
