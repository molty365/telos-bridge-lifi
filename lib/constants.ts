const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export const TOKEN_ICONS: Record<string, string> = {
  TLOS: `${BASE_PATH}/tokens/TLOS.svg`,
  USDC: `${BASE_PATH}/tokens/USDC.png`,
  USDT: `${BASE_PATH}/tokens/USDT.png`,
  ETH: `${BASE_PATH}/tokens/ETH.png`,
  WBTC: `${BASE_PATH}/tokens/WBTC.png`,
  MST: `${BASE_PATH}/tokens/MST.svg`,
}
