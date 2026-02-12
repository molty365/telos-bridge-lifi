// Direct TLOS OFT bridging via LayerZero V1
// Uses the official Telos Bridge OFT contracts (telosnetwork/telos-bridge)

import { parseEther, formatEther, type Address, type Hex } from 'viem'

// TLOS OFT contract addresses (from telosnetwork/telos-bridge CONTRACTS.md + on-chain verification)
export const TLOS_OFT_ADDRESSES: Record<number, Address> = {
  40: '0x7b5250ad9ae6445e75e01cd4bb070aecbf8db92e',     // Telos EVM (OFT Adapter)
  1: '0x5Aa352551d39F5ce592260e0D26818e7d780867f',      // Ethereum
  56: '0x5e3a61B39FfffA983b1E7133e408545A21Ca1C3E',     // BSC
  43114: '0x276B2D865Cc809DDFbC780A03fC81537a499a8e5',  // Avalanche  
  137: '0x1cF0636abbc569fB413A20bd7964712e6b4d1161',    // Polygon
  42161: '0x5e3a61B39FfffA983b1E7133e408545A21Ca1C3E',  // Arbitrum
}

// LayerZero V1 chain IDs
export const LZ_V1_CHAIN_IDS: Record<number, number> = {
  40: 199,      // Telos
  1: 101,       // Ethereum
  56: 102,      // BSC
  43114: 106,   // Avalanche
  137: 109,     // Polygon
  42161: 110,   // Arbitrum
}

// Verified OFT peer connections (checked on-chain from Telos OFT adapter)
const OFT_PEERS: Array<[number, number]> = [
  [40, 1],       // Telos ↔ ETH
  [40, 56],      // Telos ↔ BSC
  [40, 43114],   // Telos ↔ Avalanche
  [40, 137],     // Telos ↔ Polygon
  [40, 42161],   // Telos ↔ Arbitrum
  // Cross-chain peers between non-Telos chains also exist
  [1, 56], [1, 43114], [1, 137], [1, 42161],
  [56, 43114], [56, 137], [56, 42161],
  [43114, 137], [43114, 42161],
  [137, 42161],
]

function hasPeer(fromChain: number, toChain: number): boolean {
  return OFT_PEERS.some(([a, b]) =>
    (a === fromChain && b === toChain) || (b === fromChain && a === toChain)
  )
}

// LZ V1 OFT ABI
const OFT_V1_ABI = [
  {
    name: 'estimateSendFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '_dstChainId', type: 'uint16' },
      { name: '_toAddress', type: 'bytes' },
      { name: '_amount', type: 'uint256' },
      { name: '_useZro', type: 'bool' },
      { name: '_adapterParams', type: 'bytes' },
    ],
    outputs: [
      { name: 'nativeFee', type: 'uint256' },
      { name: 'zroFee', type: 'uint256' },
    ],
  },
  {
    name: 'sendFrom',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: '_from', type: 'address' },
      { name: '_dstChainId', type: 'uint16' },
      { name: '_toAddress', type: 'bytes32' },
      { name: '_amount', type: 'uint256' },
      { name: '_minAmount', type: 'uint256' },
      { name: '_callParams', type: 'tuple', components: [
        { name: 'refundAddress', type: 'address' },
        { name: 'zroPaymentAddress', type: 'address' },
        { name: 'adapterParams', type: 'bytes' },
      ]},
    ],
    outputs: [],
  },
] as const

// Default adapter params: version 1, 200000 gas
const DEFAULT_ADAPTER_PARAMS = '0x00010000000000000000000000000000000000000000000000000000000000030d40' as Hex

// Convert address to bytes32 (left-padded with zeros)
function addressToBytes32(addr: Address): Hex {
  return ('0x' + addr.slice(2).toLowerCase().padStart(64, '0')) as Hex
}

export function isTlosOftRoute(fromChain: number, toChain: number, fromToken: string, toToken: string): boolean {
  return (
    fromToken.toUpperCase() === 'TLOS' &&
    toToken.toUpperCase() === 'TLOS' &&
    !!TLOS_OFT_ADDRESSES[fromChain] &&
    !!TLOS_OFT_ADDRESSES[toChain] &&
    !!LZ_V1_CHAIN_IDS[fromChain] &&
    !!LZ_V1_CHAIN_IDS[toChain] &&
    hasPeer(fromChain, toChain)
  )
}

export function getOftSupportedChains(): number[] {
  return Object.keys(TLOS_OFT_ADDRESSES).map(Number)
}

export interface OftQuoteResult {
  nativeFee: bigint
  nativeFeeFormatted: string
  amountLD: bigint
  minAmountLD: bigint
  route: string
  estimatedTime: number
}

export async function quoteOftSend(
  publicClient: any,
  fromChain: number,
  toChain: number,
  amount: string,
  toAddress: Address,
  slippage: number = 0.5,
): Promise<OftQuoteResult> {
  const oftAddress = TLOS_OFT_ADDRESSES[fromChain]
  const dstChainId = LZ_V1_CHAIN_IDS[toChain]
  if (!oftAddress || !dstChainId) throw new Error('Unsupported chain for TLOS OFT')
  if (!hasPeer(fromChain, toChain)) throw new Error('No OFT peer between these chains')

  const amountLD = parseEther(amount)
  const minAmountLD = amountLD - (amountLD * BigInt(Math.floor(slippage * 100))) / 10000n

  const toBytes32 = addressToBytes32(toAddress)

  const [nativeFee] = await publicClient.readContract({
    address: oftAddress,
    abi: OFT_V1_ABI,
    functionName: 'estimateSendFee',
    args: [dstChainId, toBytes32, amountLD, false, DEFAULT_ADAPTER_PARAMS],
  }) as [bigint, bigint]

  return {
    nativeFee,
    nativeFeeFormatted: formatEther(nativeFee),
    amountLD,
    minAmountLD,
    route: 'LayerZero OFT',
    estimatedTime: 120,
  }
}

export async function executeOftSend(
  walletClient: any,
  publicClient: any,
  fromChain: number,
  toChain: number,
  amount: string,
  fromAddress: Address,
  toAddress: Address,
  slippage: number = 0.5,
  onStatus: (msg: string) => void,
): Promise<{ txHash: Hex }> {
  const oftAddress = TLOS_OFT_ADDRESSES[fromChain]
  const dstChainId = LZ_V1_CHAIN_IDS[toChain]
  if (!oftAddress || !dstChainId) throw new Error('Unsupported chain for TLOS OFT')

  const amountLD = parseEther(amount)
  const minAmountLD = amountLD - (amountLD * BigInt(Math.floor(slippage * 100))) / 10000n
  const toBytes32 = addressToBytes32(toAddress)

  // Get fee quote
  onStatus('Getting LayerZero fee quote...')
  const [nativeFee] = await publicClient.readContract({
    address: oftAddress,
    abi: OFT_V1_ABI,
    functionName: 'estimateSendFee',
    args: [dstChainId, toBytes32, amountLD, false, DEFAULT_ADAPTER_PARAMS],
  }) as [bigint, bigint]

  // Add 10% buffer
  const feeWithBuffer = nativeFee + nativeFee / 10n

  const callParams = {
    refundAddress: fromAddress,
    zroPaymentAddress: '0x0000000000000000000000000000000000000000' as Address,
    adapterParams: DEFAULT_ADAPTER_PARAMS,
  }

  // Execute sendFrom
  onStatus('Confirm in wallet...')
  const txHash = await walletClient.writeContract({
    address: oftAddress,
    abi: OFT_V1_ABI,
    functionName: 'sendFrom',
    args: [fromAddress, dstChainId, toBytes32, amountLD, minAmountLD, callParams],
    value: feeWithBuffer,
    chain: undefined,
    account: fromAddress,
  })

  onStatus('Transaction submitted, waiting for confirmation...')
  await publicClient.waitForTransactionReceipt({ hash: txHash })
  onStatus('✅ TLOS bridged via LayerZero! Track at layerzeroscan.com')

  return { txHash }
}
