import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'

export const metadata: Metadata = {
  title: 'Telos Bridge — Cross-Chain Bridging',
  description: 'Bridge tokens to and from Telos EVM powered by LiFi',
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
