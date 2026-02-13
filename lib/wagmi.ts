'use client'

import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, telos, base, bsc, arbitrum, polygon, avalanche, optimism } from 'wagmi/chains'
import { http } from 'wagmi'
// Override Telos RPC — default mainnet.telos.net/evm blocks browser requests
const telosWithRpc = {
  ...telos,
  rpcUrls: {
    default: { http: ['https://rpc.telos.net/evm'] },
    public: { http: ['https://rpc.telos.net/evm'] },
  },
} as const

export const config = getDefaultConfig({
  appName: 'Telos Bridge',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'e77cdab1b5834264860090a1d10b82b4',
  chains: [telosWithRpc, mainnet, base, bsc, arbitrum, polygon, avalanche, optimism],
  transports: {
    [telos.id]: http('https://rpc.telos.net/evm'),
  },
  ssr: true,
})
