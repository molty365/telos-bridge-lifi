// Telos Wrapped Assets Bridge via LayerZero V1
// Contract: 0x9c5ebCbE531aA81bD82013aBF97401f5C6111d76 (same on all chains)
// Uses bridge() function, not sendFrom()

import { parseUnits, formatUnits, type Address, type Hex } from 'viem'
import { LZ_V1_CHAIN_IDS } from './oft'

export const WRAPPED_BRIDGE_ADDRESS = '0x9c5ebCbE531aA81bD82013aBF97401f5C6111d76' as Address

// Wrapped token addresses on Telos
export const TELOS_WRAPPED_TOKENS: Record<string, { address: Address; decimals: number; name: string }> = {
  USDC: { address: '0x8D97Cea50351Fb4329d591682b148D43a0C3611b', decimals: 6, name: 'USD Coin' },
  USDT: { address: '0x975Ed13fa16857E83e7C493C7741D556eaaD4A3f', decimals: 6, name: 'Tether USD' },
  'BTC.b': { address: '0x7627b27594bc71e6Ab0fCE755aE8931EB1E12DAC', decimals: 8, name: 'Bitcoin' },
  ETH: { address: '0xA0fB8cd450c8Fd3a11901876cD5f17eB47C6bc50', decimals: 18, name: 'Ethereum' },
  BNB: { address: '0x26Ed0F16e777C94A6FE798F9E20298034930Bae8', decimals: 18, name: 'BNB' },
}

// Remote token addresses by [token][lzChainId]
// Zero address = not supported on that chain
export const REMOTE_TOKENS: Record<string, Record<number, Address>> = {
  USDC: {
    101: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // ETH
    102: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // BSC
    109: '0x452B50B5E5A039084fb33d20ba0213D4f7E84124', // Polygon
    110: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum
  },
  USDT: {
    101: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // ETH
    109: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // Polygon
  },
  'BTC.b': {
    106: '0x152b9d0FdC40C096757F570A51E494bd4b943E50', // Avalanche
  },
  ETH: {
    101: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // ETH (WETH)
    109: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', // Polygon
    110: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // Arbitrum
  },
  BNB: {
    102: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // BSC (WBNB)
  },
}

const BRIDGE_ABI = [
  {
    name: 'bridge',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: '_token', type: 'address' },
      { name: '_dstChainId', type: 'uint16' },
      { name: '_amount', type: 'uint256' },
      { name: '_to', type: 'address' },
      { name: '_unwrapETH', type: 'bool' },
      { name: '_callParams', type: 'tuple', components: [
        { name: 'refundAddress', type: 'address' },
        { name: 'zroPaymentAddress', type: 'address' },
      ]},
      { name: '_adapterParams', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'estimateBridgeFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '_dstChainId', type: 'uint16' },
      { name: '_useZro', type: 'bool' },
      { name: '_adapterParams', type: 'bytes' },
    ],
    outputs: [
      { name: 'nativeFee', type: 'uint256' },
      { name: 'zroFee', type: 'uint256' },
    ],
  },
] as const

const ERC20_APPROVE_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

const DEFAULT_ADAPTER_PARAMS = '0x00010000000000000000000000000000000000000000000000000000000000030d40' as Hex

/**
 * Check if a token can be bridged to a specific chain via the wrapped assets bridge
 */
export function isWrappedBridgeRoute(token: string, fromChain: number, toChain: number): boolean {
  // Currently only works FROM Telos
  if (fromChain !== 40) return false
  const dstLzId = LZ_V1_CHAIN_IDS[toChain]
  if (!dstLzId) return false
  return !!(REMOTE_TOKENS[token]?.[dstLzId])
}

/**
 * Get supported destination chains for a token
 */
export function getWrappedBridgeChains(token: string): number[] {
  const remote = REMOTE_TOKENS[token]
  if (!remote) return []
  const lzToChain = Object.fromEntries(Object.entries(LZ_V1_CHAIN_IDS).map(([k, v]) => [v, Number(k)]))
  return Object.keys(remote).map(Number).map(lzId => lzToChain[lzId]).filter(Boolean)
}

/**
 * Get tokens available for bridging from Telos to a specific chain
 */
export function getAvailableTokens(toChain: number): string[] {
  const dstLzId = LZ_V1_CHAIN_IDS[toChain]
  if (!dstLzId) return []
  return Object.keys(REMOTE_TOKENS).filter(token => !!REMOTE_TOKENS[token][dstLzId])
}

export interface WrappedBridgeQuote {
  nativeFee: bigint
  nativeFeeFormatted: string
  amount: bigint
  token: string
  feeEstimated: boolean
}

export async function quoteWrappedBridge(
  publicClient: any,
  toChain: number,
): Promise<WrappedBridgeQuote & { nativeFee: bigint }> {
  const dstLzId = LZ_V1_CHAIN_IDS[toChain]
  if (!dstLzId) throw new Error('Unsupported destination chain')

  let nativeFee: bigint
  let feeEstimated = false

  try {
    const result = await publicClient.readContract({
      address: WRAPPED_BRIDGE_ADDRESS,
      abi: BRIDGE_ABI,
      functionName: 'estimateBridgeFee',
      args: [dstLzId, false, DEFAULT_ADAPTER_PARAMS],
    }) as [bigint, bigint]
    nativeFee = result[0]
  } catch {
    // Fallback fees
    const fallbacks: Record<number, bigint> = {
      184: 10n * 10n ** 18n,   // Base ~10 TLOS
      110: 49n * 10n ** 18n,   // Arbitrum
      102: 49n * 10n ** 18n,   // BSC
      109: 49n * 10n ** 18n,   // Polygon
      106: 48n * 10n ** 18n,   // Avalanche
      101: 227n * 10n ** 18n,  // ETH
    }
    nativeFee = fallbacks[dstLzId] || 50n * 10n ** 18n
    feeEstimated = true
  }

  return {
    nativeFee,
    nativeFeeFormatted: formatUnits(nativeFee, 18),
    amount: 0n,
    token: '',
    feeEstimated,
  }
}

export async function executeWrappedBridge(
  walletClient: any,
  publicClient: any,
  token: string,
  toChain: number,
  amount: string,
  fromAddress: Address,
  toAddress: Address,
  onStatus: (msg: string) => void,
): Promise<{ txHash: Hex }> {
  const tokenInfo = TELOS_WRAPPED_TOKENS[token]
  if (!tokenInfo) throw new Error(`Unknown token: ${token}`)

  const dstLzId = LZ_V1_CHAIN_IDS[toChain]
  if (!dstLzId) throw new Error('Unsupported destination chain')
  if (!REMOTE_TOKENS[token]?.[dstLzId]) throw new Error(`${token} not bridgeable to this chain`)

  const amountParsed = parseUnits(amount, tokenInfo.decimals)

  // Get fee
  onStatus('Getting bridge fee...')
  let nativeFee: bigint
  try {
    const result = await publicClient.readContract({
      address: WRAPPED_BRIDGE_ADDRESS,
      abi: BRIDGE_ABI,
      functionName: 'estimateBridgeFee',
      args: [dstLzId, false, DEFAULT_ADAPTER_PARAMS],
    }) as [bigint, bigint]
    nativeFee = result[0]
  } catch {
    const fallbacks: Record<number, bigint> = {
      184: 10n * 10n ** 18n, 110: 49n * 10n ** 18n, 102: 49n * 10n ** 18n,
      109: 49n * 10n ** 18n, 106: 48n * 10n ** 18n, 101: 227n * 10n ** 18n,
    }
    nativeFee = fallbacks[dstLzId] || 50n * 10n ** 18n
    onStatus('Using estimated fee (excess refunded)...')
  }

  const feeWithBuffer = nativeFee + nativeFee / 10n

  // Check and set allowance
  onStatus('Checking token approval...')
  const allowance = await publicClient.readContract({
    address: tokenInfo.address,
    abi: ERC20_APPROVE_ABI,
    functionName: 'allowance',
    args: [fromAddress, WRAPPED_BRIDGE_ADDRESS],
  }) as bigint

  if (allowance < amountParsed) {
    onStatus('Approve token spend...')
    const approveTx = await walletClient.writeContract({
      address: tokenInfo.address,
      abi: ERC20_APPROVE_ABI,
      functionName: 'approve',
      args: [WRAPPED_BRIDGE_ADDRESS, amountParsed],
      chain: undefined,
      account: fromAddress,
    })
    await publicClient.waitForTransactionReceipt({ hash: approveTx })
    onStatus('Approved! Sending bridge transaction...')
  }

  // Execute bridge
  onStatus('Confirm bridge in wallet...')
  const txHash = await walletClient.writeContract({
    address: WRAPPED_BRIDGE_ADDRESS,
    abi: BRIDGE_ABI,
    functionName: 'bridge',
    args: [
      tokenInfo.address,
      dstLzId,
      amountParsed,
      toAddress,
      false, // unwrapETH
      {
        refundAddress: fromAddress,
        zroPaymentAddress: '0x0000000000000000000000000000000000000000' as Address,
      },
      DEFAULT_ADAPTER_PARAMS,
    ],
    value: feeWithBuffer,
    gas: 500000n,
    chain: undefined,
    account: fromAddress,
  })

  onStatus('Transaction submitted, waiting for confirmation...')
  await publicClient.waitForTransactionReceipt({ hash: txHash })
  onStatus('✅ Bridged! Track at layerzeroscan.com/tx/' + txHash)

  return { txHash }
}
