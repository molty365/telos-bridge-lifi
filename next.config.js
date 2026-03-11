/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  // basePath used for molty365.github.io/telos-bridge-lifi/ 
  // Set NEXT_PUBLIC_BASE_PATH='' in the deploy workflow when bridge.telos.net DNS is live
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '',
}
module.exports = nextConfig
