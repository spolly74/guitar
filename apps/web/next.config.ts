import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Externalize jsdom and its dependencies for serverless compatibility
  serverExternalPackages: ["jsdom", "parse5", "@mozilla/readability"],
};

export default nextConfig;
