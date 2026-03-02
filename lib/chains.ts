export interface ChainInfo {
  id: number
  name: string
  icon: string
  nativeCurrency: string
}

// Chains with Stargate/LayerZero routes to Telos
export const SUPPORTED_CHAINS: ChainInfo[] = [
  { id: 40, name: 'Telos', icon: '/chains/telos.svg', nativeCurrency: 'TLOS' },
  { id: 1, name: 'Ethereum', icon: '/chains/ethereum.png', nativeCurrency: 'ETH' },
  { id: 8453, name: 'Base', icon: '/chains/base.png', nativeCurrency: 'ETH' },
  { id: 56, name: 'BSC', icon: '/chains/bsc.png', nativeCurrency: 'BNB' },
  { id: 42161, name: 'Arbitrum', icon: '/chains/arbitrum.png', nativeCurrency: 'ETH' },
  { id: 137, name: 'Polygon', icon: '/chains/polygon.png', nativeCurrency: 'MATIC' },
  { id: 43114, name: 'Avalanche', icon: '/chains/avalanche.png', nativeCurrency: 'AVAX' },
  { id: 10, name: 'OP Mainnet', icon: '/chains/optimism.png', nativeCurrency: 'ETH' },
  { id: 534352, name: 'Scroll', icon: '/chains/scroll.png', nativeCurrency: 'ETH' },
  { id: 5000, name: 'Mantle', icon: '/chains/mantle.png', nativeCurrency: 'MNT' },
  { id: 59144, name: 'Linea', icon: '/chains/linea.png', nativeCurrency: 'ETH' },
  { id: 1329, name: 'Sei', icon: '/chains/sei.png', nativeCurrency: 'SEI' },
  { id: 2222, name: 'Kava', icon: '/chains/kava.png', nativeCurrency: 'KAVA' },
  { id: 8217, name: 'Kaia', icon: '/chains/kaia.png', nativeCurrency: 'KAIA' },
  { id: 1088, name: 'Metis', icon: '/chains/metis.png', nativeCurrency: 'METIS' },
  { id: 1313161554, name: 'Aurora', icon: '/chains/aurora.png', nativeCurrency: 'ETH' },
  { id: 100, name: 'Gnosis', icon: '/chains/gnosis.svg', nativeCurrency: 'XDAI' },
  { id: 1116, name: 'Core', icon: '/chains/core.svg', nativeCurrency: 'CORE' },
  { id: 167000, name: 'Taiko', icon: '/chains/taiko.svg', nativeCurrency: 'ETH' },
  { id: 169, name: 'Manta Pacific', icon: '/chains/manta.svg', nativeCurrency: 'ETH' },
  { id: 30, name: 'Rootstock', icon: '/chains/rootstock.svg', nativeCurrency: 'RBTC' },
  { id: 8822, name: 'IOTA EVM', icon: '/chains/iota.png', nativeCurrency: 'IOTA' },
  { id: 14, name: 'Flare', icon: '/chains/flare.png', nativeCurrency: 'FLR' },
  { id: 80084, name: 'Berachain', icon: '/chains/berachain.png', nativeCurrency: 'BERA' },
  { id: 666666666, name: 'Degen Chain', icon: '/chains/degen.png', nativeCurrency: 'DEGEN' },
  { id: 1514, name: 'Story Protocol', icon: '/chains/story.png', nativeCurrency: 'IP' },
  { id: 1890, name: 'Lightlink', icon: '/chains/lightlink.png', nativeCurrency: 'ETH' },
  { id: 33139, name: 'ApeChain', icon: '/chains/apechain.png', nativeCurrency: 'APE' },
  { id: 146, name: 'Sonic', icon: '/chains/sonic.png', nativeCurrency: 'S' },
  { id: 1625, name: 'Gravity', icon: '/chains/gravity.png', nativeCurrency: 'G' },
  { id: 747, name: 'Flow EVM', icon: '/chains/flow.png', nativeCurrency: 'FLOW' },
  { id: 50, name: 'XDC Network', icon: '/chains/xdc.png', nativeCurrency: 'XDC' },
  { id: 1480, name: 'Vana', icon: '/chains/vana.png', nativeCurrency: 'VANA' },
]

export const CHAIN_MAP = new Map(SUPPORTED_CHAINS.map(c => [c.id, c]))
