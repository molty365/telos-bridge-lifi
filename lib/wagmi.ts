'use client'

import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, telos, base, bsc, arbitrum, polygon, avalanche, optimism } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'Telos Bridge',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'e77cdab1b5834264860090a1d10b82b4',
  chains: [telos, mainnet, base, bsc, arbitrum, polygon, avalanche, optimism],
  ssr: true,
})
