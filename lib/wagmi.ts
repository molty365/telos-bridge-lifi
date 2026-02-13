'use client'

import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, telos, base, bsc, arbitrum, polygon, avalanche, optimism, scroll, mantle, linea, sei, kava, metis, aurora, gnosis } from 'wagmi/chains'
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

// Custom chain definitions (not in wagmi/chains by default)
const kaia = {
  id: 8217,
  name: 'Kaia',
  nativeCurrency: { name: 'Kaia', symbol: 'KAIA', decimals: 18 },
  rpcUrls: { default: { http: ['https://public-en.node.kaia.io'] } },
  blockExplorers: { default: { name: 'KaiaScan', url: 'https://kaiascan.io' } },
} as const satisfies Chain

const core = {
  id: 1116,
  name: 'Core',
  nativeCurrency: { name: 'Core', symbol: 'CORE', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.coredao.org'] } },
  blockExplorers: { default: { name: 'CoreScan', url: 'https://scan.coredao.org' } },
} as const satisfies Chain

const taiko = {
  id: 167000,
  name: 'Taiko',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mainnet.taiko.xyz'] } },
  blockExplorers: { default: { name: 'TaikoScan', url: 'https://taikoscan.io' } },
} as const satisfies Chain

const manta = {
  id: 169,
  name: 'Manta Pacific',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://pacific-rpc.manta.network/http'] } },
  blockExplorers: { default: { name: 'Manta Explorer', url: 'https://pacific-explorer.manta.network' } },
} as const satisfies Chain

const rootstock = {
  id: 30,
  name: 'Rootstock',
  nativeCurrency: { name: 'Smart Bitcoin', symbol: 'RBTC', decimals: 18 },
  rpcUrls: { default: { http: ['https://public-node.rsk.co'] } },
  blockExplorers: { default: { name: 'RSK Explorer', url: 'https://explorer.rsk.co' } },
} as const satisfies Chain

export const config = getDefaultConfig({
  appName: 'Telos Bridge',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'e77cdab1b5834264860090a1d10b82b4',
  chains: [telosWithRpc, mainnet, base, bsc, arbitrum, polygon, avalanche, optimism, scroll, mantle, linea, sei, kava, kaia, metis, aurora, gnosis, core, taiko, manta, rootstock],
  transports: {
    [telos.id]: http('https://rpc.telos.net/evm'),
  },
  ssr: true,
})
