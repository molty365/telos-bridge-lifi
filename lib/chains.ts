export interface ChainInfo {
  id: number
  name: string
  icon: string
  nativeCurrency: string
}

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

// Chains with Stargate/LayerZero routes to Telos
export const SUPPORTED_CHAINS: ChainInfo[] = [
  { id: 40, name: 'Telos', icon: `${BASE_PATH}/chains/telos.svg`, nativeCurrency: 'TLOS' },
  { id: 1, name: 'Ethereum', icon: `${BASE_PATH}/chains/ethereum.png`, nativeCurrency: 'ETH' },
  { id: 8453, name: 'Base', icon: `${BASE_PATH}/chains/base.png`, nativeCurrency: 'ETH' },
  { id: 56, name: 'BSC', icon: `${BASE_PATH}/chains/bsc.png`, nativeCurrency: 'BNB' },
  { id: 42161, name: 'Arbitrum', icon: `${BASE_PATH}/chains/arbitrum.png`, nativeCurrency: 'ETH' },
  { id: 137, name: 'Polygon', icon: `${BASE_PATH}/chains/polygon.png`, nativeCurrency: 'MATIC' },
  { id: 43114, name: 'Avalanche', icon: `${BASE_PATH}/chains/avalanche.png`, nativeCurrency: 'AVAX' },
  { id: 10, name: 'OP Mainnet', icon: `${BASE_PATH}/chains/optimism.png`, nativeCurrency: 'ETH' },
  { id: 534352, name: 'Scroll', icon: `${BASE_PATH}/chains/scroll.png`, nativeCurrency: 'ETH' },
  { id: 5000, name: 'Mantle', icon: `${BASE_PATH}/chains/mantle.png`, nativeCurrency: 'MNT' },
  { id: 59144, name: 'Linea', icon: `${BASE_PATH}/chains/linea.png`, nativeCurrency: 'ETH' },
  { id: 1329, name: 'Sei', icon: `${BASE_PATH}/chains/sei.png`, nativeCurrency: 'SEI' },
  { id: 2222, name: 'Kava', icon: `${BASE_PATH}/chains/kava.png`, nativeCurrency: 'KAVA' },
  { id: 8217, name: 'Kaia', icon: `${BASE_PATH}/chains/kaia.png`, nativeCurrency: 'KAIA' },
  { id: 1088, name: 'Metis', icon: `${BASE_PATH}/chains/metis.png`, nativeCurrency: 'METIS' },
  { id: 1313161554, name: 'Aurora', icon: `${BASE_PATH}/chains/aurora.png`, nativeCurrency: 'ETH' },
  { id: 100, name: 'Gnosis', icon: `${BASE_PATH}/chains/gnosis.svg`, nativeCurrency: 'XDAI' },
  { id: 1116, name: 'Core', icon: `${BASE_PATH}/chains/core.svg`, nativeCurrency: 'CORE' },
  { id: 167000, name: 'Taiko', icon: `${BASE_PATH}/chains/taiko.svg`, nativeCurrency: 'ETH' },
  { id: 169, name: 'Manta Pacific', icon: `${BASE_PATH}/chains/manta.svg`, nativeCurrency: 'ETH' },
  { id: 30, name: 'Rootstock', icon: `${BASE_PATH}/chains/rootstock.svg`, nativeCurrency: 'RBTC' },
  { id: 8822, name: 'IOTA EVM', icon: `${BASE_PATH}/chains/iota.png`, nativeCurrency: 'IOTA' },
  { id: 14, name: 'Flare', icon: `${BASE_PATH}/chains/flare.png`, nativeCurrency: 'FLR' },
  { id: 80084, name: 'Berachain', icon: `${BASE_PATH}/chains/berachain.png`, nativeCurrency: 'BERA' },
  { id: 666666666, name: 'Degen Chain', icon: `${BASE_PATH}/chains/degen.png`, nativeCurrency: 'DEGEN' },
  { id: 1514, name: 'Story Protocol', icon: `${BASE_PATH}/chains/story.png`, nativeCurrency: 'IP' },
  { id: 1890, name: 'Lightlink', icon: `${BASE_PATH}/chains/lightlink.png`, nativeCurrency: 'ETH' },
  { id: 33139, name: 'ApeChain', icon: `${BASE_PATH}/chains/apechain.png`, nativeCurrency: 'APE' },
  { id: 146, name: 'Sonic', icon: `${BASE_PATH}/chains/sonic.png`, nativeCurrency: 'S' },
  { id: 1625, name: 'Gravity', icon: `${BASE_PATH}/chains/gravity.png`, nativeCurrency: 'G' },
  { id: 747, name: 'Flow EVM', icon: `${BASE_PATH}/chains/flow.png`, nativeCurrency: 'FLOW' },
  { id: 50, name: 'XDC Network', icon: `${BASE_PATH}/chains/xdc.png`, nativeCurrency: 'XDC' },
  { id: 1480, name: 'Vana', icon: `${BASE_PATH}/chains/vana.png`, nativeCurrency: 'VANA' },
]

export const CHAIN_MAP = new Map(SUPPORTED_CHAINS.map(c => [c.id, c]))
