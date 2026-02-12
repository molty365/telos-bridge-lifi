'use client'

import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, telos, base, bsc, arbitrum, polygon, avalanche, optimism } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'Telos Bridge',
  projectId: 'telos-bridge-lifi', // WalletConnect project ID placeholder
  chains: [mainnet, telos, base, bsc, arbitrum, polygon, avalanche, optimism],
  ssr: true,
})
