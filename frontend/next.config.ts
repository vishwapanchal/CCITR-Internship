import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

// APEX-X uses a single .env file at the repo root, shared by both the
// FastAPI backend and this Next.js frontend, instead of separate
// backend/.env + frontend/.env.local files. Next.js only auto-loads env
// files from its own directory, so we parse the root .env here and merge
// it into process.env before the config (and its NEXT_PUBLIC_* inlining)
// is resolved. Real environment variables (e.g. set by the host/CI) always
// take precedence over the file.
function loadRootEnv() {
  const rootEnvPath = path.resolve(__dirname, "..", ".env");
  if (!fs.existsSync(rootEnvPath)) return;

  const contents = fs.readFileSync(rootEnvPath, "utf-8");
  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadRootEnv();

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
