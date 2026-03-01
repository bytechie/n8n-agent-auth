/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker builds
  output: 'standalone',

  // Optimize for production
  reactStrictMode: true,

  // Disable powered by header for security
  poweredByHeader: false,

  // Configure headers for security
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },

  // Environment variables exposed to the browser (none for this security-focused gateway)
  env: {
    // No public env vars - all sensitive data stays server-side
  },
};

module.exports = nextConfig;
