const path = require('node:path')

/** @type {import('next').NextConfig} */
const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim()
const normalizedBasePath = !rawBasePath || rawBasePath === '/'
  ? ''
  : rawBasePath.startsWith('/')
    ? rawBasePath.replace(/\/$/, '')
    : `/${rawBasePath.replace(/\/$/, '')}`
const basePath = rawBasePath === undefined ? '/telos-bridge-v3' : normalizedBasePath

const nextConfig = {
  output: 'export',
  outputFileTracingRoot: __dirname,
  reactStrictMode: true,
  poweredByHeader: false,
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': path.resolve(__dirname, 'lib/shims/async-storage.js'),
      'pino-pretty': path.resolve(__dirname, 'lib/shims/pino-pretty.js'),
    }
    return config
  },
}
module.exports = nextConfig
