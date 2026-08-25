import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "172.27.96.1",
    "localhost",
    "127.0.0.1",
    "*.local",
  ],
};

export default nextConfig;
