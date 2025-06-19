/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['ae01.alicdn.com', 'sc04.alicdn.com', 'image.dhgate.com'],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  },
}

module.exports = nextConfig 