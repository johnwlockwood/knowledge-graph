import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/generate-graph',
        destination: 'http://localhost:8000/api/generate-graph',
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
        ],
      },
    ];
  },
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        timeout: 60000, // Set timeout to 60 seconds
      },
    },
  },
};

export default nextConfig;
