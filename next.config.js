/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  // basePath removed for custom domain (bridge.telos.net)
}
module.exports = nextConfig
