'use client'

import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, telos, base, bsc, arbitrum, polygon, avalanche, optimism, scroll, mantle, linea, sei, kava, metis, aurora } from 'wagmi/chains'
import { http } from 'wagmi'
import type { Chain } from 'wagmi/chains'

// Override Telos RPC — default mainnet.telos.net/evm blocks browser requests
const telosWithRpc = {
  ...telos,
  rpcUrls: {
    default: { http: ['https://rpc.telos.net/evm'] },
    public: { http: ['https://rpc.telos.net/evm'] },
  },
} as const

// Kaia chain definition (not in wagmi/chains by default)
const kaia = {
  id: 8217,
  name: 'Kaia',
  nativeCurrency: { name: 'Kaia', symbol: 'KAIA', decimals: 18 },
  rpcUrls: { default: { http: ['https://public-en.node.kaia.io'] } },
  blockExplorers: { default: { name: 'KaiaScan', url: 'https://kaiascan.io' } },
} as const satisfies Chain

export const config = getDefaultConfig({
  appName: 'Telos Bridge',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'e77cdab1b5834264860090a1d10b82b4',
  chains: [telosWithRpc, mainnet, base, bsc, arbitrum, polygon, avalanche, optimism, scroll, mantle, linea, sei, kava, kaia, metis, aurora],
  transports: {
    [telos.id]: http('https://rpc.telos.net/evm'),
  },
  ssr: true,
})
