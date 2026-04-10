import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production'

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@node-rs/jieba"],
  turbopack: {
    root: __dirname,
  },
  compiler: {
    removeConsole: isProd,
  },
  cacheComponents: true
};

export default nextConfig;
