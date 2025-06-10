import type { NextConfig } from "next";

const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:8000';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/generate-graph',
        destination: `${apiBaseUrl}/api/generate-graph`,
      },
      {
        source: '/api/stream-generate-graph',
        destination: `${apiBaseUrl}/api/stream-generate-graph`,
      },
      {
        source: '/api/available-models',
        destination: `${apiBaseUrl}/api/available-models`,
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
