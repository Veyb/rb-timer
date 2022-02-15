/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  styledComponents: true,
  env: {
    API_URL: process.env.API_URL,
    IMAGE_URL: process.env.IMAGE_URL,
  },
  images: {
    domains: [process.env.IMAGE_DOMAIN],
  },
};

module.exports = nextConfig;
