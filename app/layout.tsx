import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'

export const metadata: Metadata = {
  title: 'Telos Bridge — Cross-Chain Bridging',
  description: 'Bridge tokens between Telos and supported EVM networks with LayerZero and Stargate.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Telos Bridge',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a0f]">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
