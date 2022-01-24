module.exports = ({ env }) => ({
  auth: {
    secret: env("ADMIN_JWT_SECRET", "1f0d0ff6adaf3e0b55e0935dee91c644"),
  },
});
