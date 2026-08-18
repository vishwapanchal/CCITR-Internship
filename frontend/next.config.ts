import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "export", // Disabled for local dev because middleware is used
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
