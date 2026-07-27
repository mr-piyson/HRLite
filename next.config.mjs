/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["172.18.12.27"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
