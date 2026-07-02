import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No static export — everything is server-rendered or client-rendered
  images: {
    unoptimized: true,
  },
  // Read env from root .env
  env: {
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  },
};

export default nextConfig;
