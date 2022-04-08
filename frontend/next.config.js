/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  styledComponents: true,
  env: {
    API_URL: process.env.API_URL,
    IMAGE_URL: process.env.IMAGE_URL,
    SOCKET_URL: process.env.SOCKET_URL,
  },
  images: {
    domains: [process.env.IMAGE_DOMAIN],
  },
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png)',
        locale: false,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, must-revalidate',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
