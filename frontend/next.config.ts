import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No static export — everything is server-rendered or client-rendered
  images: {
    unoptimized: true,
  },
  // Removed the env block to ensure OPENROUTER_API_KEY is read dynamically at runtime
  // by the server-side API route, rather than baked in at build time.
};

export default nextConfig;
