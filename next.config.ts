import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "127.0.0.1", port: "54321", pathname: "/storage/**" },
      { protocol: "http", hostname: "localhost", port: "54321", pathname: "/storage/**" },
    ],
  },
  agentRules: false,
};

export default withNextIntl(nextConfig);
