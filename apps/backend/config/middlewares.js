module.exports = ({ env }) => [
  "strapi::errors",
  "strapi::security",
  {
    name: "strapi::cors",
    config: {
      // Comma-separated list, e.g. "https://example.com,https://www.example.com".
      origin: env.array("CORS_ORIGINS", ["http://localhost:3000"]),
    },
  },
  "strapi::poweredBy",
  "strapi::logger",
  "strapi::query",
  "strapi::body",
  "strapi::session",
  "strapi::favicon",
  "strapi::public",
];
