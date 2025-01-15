/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'avatars.githubusercontent.com',
      'lh3.googleusercontent.com',
      'uploadthing.com',
      'utfs.io'
    ],
  },
  // Recommended for production
  swcMinify: true,
  // Recommended for better production performance
  reactStrictMode: true,
  // Recommended for production builds
  poweredByHeader: false,
}

module.exports = nextConfig
