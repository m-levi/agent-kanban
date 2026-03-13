import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  transpilePackages: ["agents", "@cloudflare/ai-chat"],
  turbopack: {
    root: "..",
  },
};

export default nextConfig;
