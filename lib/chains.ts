export interface ChainInfo {
  id: number
  name: string
  icon: string
  nativeCurrency: string
}

// Only chains with TLOS OFT contracts
export const SUPPORTED_CHAINS: ChainInfo[] = [
  { id: 40, name: 'Telos', icon: '/telos-bridge-lifi/chains/telos.svg', nativeCurrency: 'TLOS' },
  { id: 1, name: 'Ethereum', icon: '/telos-bridge-lifi/chains/ethereum.png', nativeCurrency: 'ETH' },
  { id: 8453, name: 'Base', icon: '/telos-bridge-lifi/chains/base.png', nativeCurrency: 'ETH' },
  { id: 56, name: 'BSC', icon: '/telos-bridge-lifi/chains/bsc.png', nativeCurrency: 'BNB' },
  { id: 42161, name: 'Arbitrum', icon: '/telos-bridge-lifi/chains/arbitrum.png', nativeCurrency: 'ETH' },
  { id: 137, name: 'Polygon', icon: '/telos-bridge-lifi/chains/polygon.png', nativeCurrency: 'MATIC' },
  { id: 43114, name: 'Avalanche', icon: '/telos-bridge-lifi/chains/avalanche.png', nativeCurrency: 'AVAX' },
  { id: 10, name: 'OP Mainnet', icon: '/telos-bridge-lifi/chains/optimism.png', nativeCurrency: 'ETH' },
]

export const CHAIN_MAP = new Map(SUPPORTED_CHAINS.map(c => [c.id, c]))
