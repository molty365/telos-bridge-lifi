export interface ChainInfo {
  id: number
  name: string
  icon: string
  nativeCurrency: string
  rpcUrl: string
}

export const SUPPORTED_CHAINS: ChainInfo[] = [
  { id: 1, name: 'Ethereum', icon: '⟠', nativeCurrency: 'ETH', rpcUrl: 'https://eth.llamarpc.com' },
  { id: 40, name: 'Telos', icon: '🟣', nativeCurrency: 'TLOS', rpcUrl: 'https://rpc.telos.net/evm' },
  { id: 8453, name: 'Base', icon: '🔵', nativeCurrency: 'ETH', rpcUrl: 'https://mainnet.base.org' },
  { id: 56, name: 'BNB Chain', icon: '🟡', nativeCurrency: 'BNB', rpcUrl: 'https://bsc-dataseed.binance.org' },
  { id: 42161, name: 'Arbitrum', icon: '🔷', nativeCurrency: 'ETH', rpcUrl: 'https://arb1.arbitrum.io/rpc' },
  { id: 137, name: 'Polygon', icon: '🟪', nativeCurrency: 'MATIC', rpcUrl: 'https://polygon-rpc.com' },
  { id: 43114, name: 'Avalanche', icon: '🔺', nativeCurrency: 'AVAX', rpcUrl: 'https://api.avax.network/ext/bc/C/rpc' },
  { id: 10, name: 'Optimism', icon: '🔴', nativeCurrency: 'ETH', rpcUrl: 'https://mainnet.optimism.io' },
]

export const TOKENS = ['USDC', 'USDT', 'ETH', 'WBTC', 'TLOS']
