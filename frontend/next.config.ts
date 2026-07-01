import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import path from "path";

const projectDir = process.cwd();
loadEnvConfig(path.join(projectDir, ".."));

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
