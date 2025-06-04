/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/generate-graph',
        destination: 'http://localhost:8000/api/generate-graph',
      },
    ];
  },
};

module.exports = nextConfig;
