import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "data.digicraft.one",
        pathname: "/Logo/**",
      },
    ],
  },
};

export default nextConfig;