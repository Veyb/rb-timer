/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict Mode is the App Router default and the framework strongly suggests
  // it; this used to switch it off. Verified against the whole e2e suite with
  // it on, twice, including the socket presence it double-invokes effects
  // around.
  reactStrictMode: true,
  compiler: {
    styledComponents: true,
  },
  images: {
    // Next.js 16 blocks optimizing images from loopback/private IPs by default (SSRF guard);
    // backend is self-hosted on localhost and remotePatterns already restricts the hostname.
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      { protocol: 'https', hostname: process.env.NEXT_PUBLIC_IMAGE_DOMAIN },
      { protocol: 'http', hostname: process.env.NEXT_PUBLIC_IMAGE_DOMAIN },
    ],
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
