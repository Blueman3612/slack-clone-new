/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'avatars.githubusercontent.com',
      'lh3.googleusercontent.com',
      // Add other domains where your user avatars might come from
    ],
  },
}

module.exports = nextConfig
