import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',  // Generate static files in 'out' directory
  trailingSlash: true,  // Better compatibility with Firebase Hosting
  images: {
    unoptimized: true,  // Required for static export
  },
};

export default nextConfig;
