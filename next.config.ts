import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // อนุญาต https จากทุกโดเมน
      },
      {
        protocol: "http",
        hostname: "**", // อนุญาต http จากทุกโดเมน
      },
    ],
  },
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
