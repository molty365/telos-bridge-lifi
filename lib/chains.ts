export interface ChainInfo {
  id: number
  name: string
  icon: string
  nativeCurrency: string
}

// Chains with Stargate/LayerZero routes to Telos
export const SUPPORTED_CHAINS: ChainInfo[] = [
  { id: 40, name: 'Telos', icon: '/telos-bridge-lifi/chains/telos.svg', nativeCurrency: 'TLOS' },
  { id: 1, name: 'Ethereum', icon: '/telos-bridge-lifi/chains/ethereum.png', nativeCurrency: 'ETH' },
  { id: 8453, name: 'Base', icon: '/telos-bridge-lifi/chains/base.png', nativeCurrency: 'ETH' },
  { id: 56, name: 'BSC', icon: '/telos-bridge-lifi/chains/bsc.png', nativeCurrency: 'BNB' },
  { id: 42161, name: 'Arbitrum', icon: '/telos-bridge-lifi/chains/arbitrum.png', nativeCurrency: 'ETH' },
  { id: 137, name: 'Polygon', icon: '/telos-bridge-lifi/chains/polygon.png', nativeCurrency: 'MATIC' },
  { id: 43114, name: 'Avalanche', icon: '/telos-bridge-lifi/chains/avalanche.png', nativeCurrency: 'AVAX' },
  { id: 10, name: 'OP Mainnet', icon: '/telos-bridge-lifi/chains/optimism.png', nativeCurrency: 'ETH' },
  { id: 534352, name: 'Scroll', icon: '/telos-bridge-lifi/chains/scroll.png', nativeCurrency: 'ETH' },
  { id: 5000, name: 'Mantle', icon: '/telos-bridge-lifi/chains/mantle.png', nativeCurrency: 'MNT' },
  { id: 59144, name: 'Linea', icon: '/telos-bridge-lifi/chains/linea.png', nativeCurrency: 'ETH' },
  { id: 1329, name: 'Sei', icon: '/telos-bridge-lifi/chains/sei.png', nativeCurrency: 'SEI' },
  { id: 2222, name: 'Kava', icon: '/telos-bridge-lifi/chains/kava.png', nativeCurrency: 'KAVA' },
  { id: 8217, name: 'Kaia', icon: '/telos-bridge-lifi/chains/kaia.png', nativeCurrency: 'KAIA' },
  { id: 1088, name: 'Metis', icon: '/telos-bridge-lifi/chains/metis.png', nativeCurrency: 'METIS' },
  { id: 1313161554, name: 'Aurora', icon: '/telos-bridge-lifi/chains/aurora.png', nativeCurrency: 'ETH' },
]

export const CHAIN_MAP = new Map(SUPPORTED_CHAINS.map(c => [c.id, c]))
