import type { Address } from 'viem'

// Well-known token addresses per chain for balance lookups
// These are the actual ERC-20 addresses users hold, NOT Stargate pool addresses
export const WELL_KNOWN_TOKENS: Record<string, Record<number, Address>> = {
  // TLOS is native on Telos (chain 40) — no entry needed there
  // On other chains, TLOS is an OFT ERC-20
  TLOS: {
    1: '0x193f4A4a6ea24102F49b931DEeeb931f6E32405d',    // Ethereum
    56: '0x193f4A4a6ea24102F49b931DEeeb931f6E32405d',   // BSC
    43114: '0xed667dC80a45b77305Cc395DB56D997597Dc6DdD', // Avalanche
    137: '0x193f4A4a6ea24102F49b931DEeeb931f6E32405d',  // Polygon
    42161: '0x193f4A4a6ea24102F49b931DEeeb931f6E32405d', // Arbitrum
    8453: '0x7252c865c05378Ffc15120F428dd65804dD0Ce63',  // Base
  },
  WBTC: {
    40: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c',  // Telos
    1: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c',   // Ethereum
    56: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c',  // BSC
    43114: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c', // Avalanche
    8453: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c', // Base
    10: '0xc3f854b2970f8727d28527ece33176fac67fef48',   // OP Mainnet
  },
  USDC: {
    40: '0xF1815bd50389c46847f0Bda824eC8da914045D14',  // Telos (Bridged USDC Stargate)
    1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',   // Ethereum
    8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base
    56: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',   // BSC
    42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum
    137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',  // Polygon
    43114: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // Avalanche
    10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',   // Optimism
    534352: '0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4', // Scroll
    5000: '0x09Bc4E0D10e68e1007BbBb0E87b9700b46dF7C5B',  // Mantle (USDC.e)
    1313161554: '0xB12BFcA5A55806AaF64E99521918A4bf0fC40802', // Aurora
    1329: '0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1',  // Sei
    100: '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83',   // Gnosis
    1116: '0xa4151B2B3e269645b82EA1D8C1A7327044F0D4B6', // Core
    59144: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff', // Linea
    167000: '0x07d83526730c7438048D55A4fc0b850e2aaB6f0b', // Taiko
    169: '0xb73603C5d87fA094B7314C74ACE2e64D165016fb',  // Manta
    30: '0x1bda44fda023f2af8280a16fd1b01d1a493ba6c4',    // Rootstock
  },
  USDT: {
    40: '0x674843C06FF83502ddb4D37c2E09C01cdA38cbc8',  // Telos
    1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',   // Ethereum
    56: '0x55d398326f99059fF775485246999027B3197955',   // BSC
    42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // Arbitrum
    137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',  // Polygon
    43114: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', // Avalanche
    10: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',   // Optimism
    5000: '0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE',  // Mantle
    2222: '0x919C1c267ABEC00BA1a97a2Cf5d68f87D39e2FE3', // Kava
    1088: '0xbB06DCA3AE6887fAbF931640f67cab3e3a16F4dC', // Metis
    1329: '0xB75D0B03c06A926e488e2659DF1A861F860bD3d1',  // Sei
    100: '0x4ECaBa5870353805a9F068101A40E0f32ed605C6',   // Gnosis
    1116: '0x81bCEa03678D1CEF4830942227720D542Aa15817', // Core
    167000: '0x2DEF195713CF4a606B49D07E520e22C17899a736', // Taiko
    30: '0xef213441a85DF4d7acBdAe0Cf78004E1e486BB96',    // Rootstock
  },
  // ETH on chains where it's NOT the native currency
  ETH: {
    40: '0xBAb93B7ad7fE8692A878B95a8e689423437cc500',  // Telos WETH
    5000: '0xdEAddEaDdeadDEadDEADDEaddEADDEAddead1111', // Mantle WETH
    100: '0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1',  // Gnosis WETH
    30: '0x542fDA317318eBF1d3DEAf76E0b632741A7e677d',   // Rootstock rETH
  },
  MST: {
    40: '0x568524DA340579887db50Ecf602Cd1BA8451b243',   // Telos
    1: '0x0F579B2Fc0ea6449680f0941eB70c117285C9a75',    // Ethereum
    8453: '0x88558259ceda5d8e681fedb55c50070fbd3da8f9', // Base
  },
}

/**
 * Get the ERC-20 token address for balance lookup on a given chain.
 * Returns undefined if the token is the chain's native currency (use native balance).
 */
export function getTokenAddress(token: string, chainId: number, chainNativeCurrency: string): Address | undefined {
  // If token matches chain's native currency, no ERC-20 address needed
  if (token === chainNativeCurrency) return undefined

  // Look up in well-known tokens first
  const wellKnown = WELL_KNOWN_TOKENS[token]?.[chainId]
  if (wellKnown) return wellKnown

  return undefined
}
