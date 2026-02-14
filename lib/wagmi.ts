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

const iotaEvm = {
  id: 8822,
  name: 'IOTA EVM',
  nativeCurrency: { name: 'IOTA', symbol: 'IOTA', decimals: 18 },
  rpcUrls: { default: { http: ['https://json-rpc.evm.iotaledger.net'] } },
  blockExplorers: { default: { name: 'IOTA EVM Explorer', url: 'https://explorer.evm.iota.org' } },
} as const satisfies Chain

const flare = {
  id: 14,
  name: 'Flare',
  nativeCurrency: { name: 'Flare', symbol: 'FLR', decimals: 18 },
  rpcUrls: { default: { http: ['https://flare-api.flare.network/ext/bc/C/rpc'] } },
  blockExplorers: { default: { name: 'Flare Explorer', url: 'https://flare-explorer.flare.network' } },
} as const satisfies Chain

const berachain = {
  id: 80084,
  name: 'Berachain',
  nativeCurrency: { name: 'Bera', symbol: 'BERA', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.berachain.com'] } },
  blockExplorers: { default: { name: 'Beratrail', url: 'https://beratrail.io' } },
} as const satisfies Chain

const degenChain = {
  id: 666666666,
  name: 'Degen Chain',
  nativeCurrency: { name: 'Degen', symbol: 'DEGEN', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.degen.tips'] } },
  blockExplorers: { default: { name: 'Degen Explorer', url: 'https://explorer.degen.tips' } },
} as const satisfies Chain

const story = {
  id: 1514,
  name: 'Story Protocol',
  nativeCurrency: { name: 'IP', symbol: 'IP', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.story.foundation'] } },
  blockExplorers: { default: { name: 'Story Explorer', url: 'https://testnet.story.foundation' } },
} as const satisfies Chain

const lightlink = {
  id: 1890,
  name: 'Lightlink',
  nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://replicator.phoenix.lightlink.io/rpc/v1'] } },
  blockExplorers: { default: { name: 'Lightlink Explorer', url: 'https://phoenix.lightlink.io' } },
} as const satisfies Chain

const apechain = {
  id: 33139,
  name: 'ApeChain',
  nativeCurrency: { name: 'APE', symbol: 'APE', decimals: 18 },
  rpcUrls: { default: { http: ['https://apechain.calderachain.xyz/http'] } },
  blockExplorers: { default: { name: 'ApeChain Explorer', url: 'https://apechain.calderaexplorer.xyz' } },
} as const satisfies Chain

const sonic = {
  id: 146,
  name: 'Sonic',
  nativeCurrency: { name: 'Sonic', symbol: 'S', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.soniclabs.com'] } },
  blockExplorers: { default: { name: 'SonicScan', url: 'https://sonicscan.org' } },
} as const satisfies Chain

const gravity = {
  id: 1625,
  name: 'Gravity',
  nativeCurrency: { name: 'Gravity', symbol: 'G', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.gravity.xyz'] } },
  blockExplorers: { default: { name: 'Gravity Explorer', url: 'https://explorer.gravity.xyz' } },
} as const satisfies Chain

const flowEvm = {
  id: 747,
  name: 'Flow EVM',
  nativeCurrency: { name: 'Flow', symbol: 'FLOW', decimals: 18 },
  rpcUrls: { default: { http: ['https://mainnet.evm.nodes.onflow.org'] } },
  blockExplorers: { default: { name: 'Flow Diver', url: 'https://evm.flowdiver.io' } },
} as const satisfies Chain

const xdc = {
  id: 50,
  name: 'XDC Network',
  nativeCurrency: { name: 'XDC', symbol: 'XDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://erpc.xinfin.network'] } },
  blockExplorers: { default: { name: 'XDC Explorer', url: 'https://explorer.xinfin.network' } },
} as const satisfies Chain

const vana = {
  id: 1480,
  name: 'Vana',
  nativeCurrency: { name: 'Vana', symbol: 'VANA', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.vana.org'] } },
  blockExplorers: { default: { name: 'VanaScan', url: 'https://vanascan.io' } },
} as const satisfies Chain

export const config = getDefaultConfig({
  appName: 'Telos Bridge',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'e77cdab1b5834264860090a1d10b82b4',
  chains: [telosWithRpc, mainnet, base, bsc, arbitrum, polygon, avalanche, optimism, scroll, mantle, linea, sei, kava, kaia, metis, aurora, gnosis, core, taiko, manta, rootstock, iotaEvm, flare, berachain, degenChain, story, lightlink, apechain, sonic, gravity, flowEvm, xdc, vana],
  transports: {
    [telos.id]: http('https://rpc.telos.net/evm'),
  },
  ssr: true,
})
