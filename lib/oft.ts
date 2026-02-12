// Direct TLOS OFT bridging via LayerZero V1
// Used when bridging TLOS↔TLOS between non-Telos chains that have OFT peers
// NOTE: Telos EVM (chain 40) is NOT in the OFT mesh — needs native bridge/Stargate

import { parseEther, formatEther, type Address, type Hex } from 'viem'

// TLOS OFT contract addresses per chain
export const TLOS_OFT_ADDRESSES: Record<number, Address> = {
  1: '0x193f4A4a6ea24102F49b931DEeeb931f6E32405d',     // Ethereum
  8453: '0x7252c865c05378Ffc15120F428dd65804dD0CE63',   // Base
  56: '0x193f4A4a6ea24102F49b931DEeeb931f6E32405d',     // BSC
  43114: '0xed667dC80a45b77305Cc395DB56D997597Dc6DdD',  // Avalanche
  137: '0x193f4A4a6ea24102F49b931DEeeb931f6E32405d',    // Polygon
  42161: '0x193f4A4a6ea24102F49b931DEeeb931f6E32405d',  // Arbitrum
}

// LayerZero V1 chain IDs (different from EVM chain IDs!)
export const LZ_V1_CHAIN_IDS: Record<number, number> = {
  1: 101,       // Ethereum
  56: 102,      // BSC
  43114: 106,   // Avalanche
  137: 109,     // Polygon
  42161: 110,   // Arbitrum
  10: 111,      // Optimism
  8453: 184,    // Base
}

// Known OFT peer connections (verified on-chain)
// Only these pairs can bridge TLOS via OFT
const OFT_PEERS: Array<[number, number]> = [
  [1, 8453],      // ETH ↔ Base
  [8453, 43114],  // Base ↔ Avalanche
  // Add more as verified
]

function hasPeer(fromChain: number, toChain: number): boolean {
  return OFT_PEERS.some(([a, b]) =>
    (a === fromChain && b === toChain) || (b === fromChain && a === toChain)
  )
}

// LZ V1 OFT ABI (estimateSendFee + sendFrom)
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
      { name: '_toAddress', type: 'bytes' },
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

export function isTlosOftRoute(fromChain: number, toChain: number, fromToken: string, toToken: string): boolean {
  return (
    fromToken.toUpperCase() === 'TLOS' &&
    toToken.toUpperCase() === 'TLOS' &&
    fromChain !== 40 && toChain !== 40 &&  // Telos EVM not in OFT mesh
    !!TLOS_OFT_ADDRESSES[fromChain] &&
    !!TLOS_OFT_ADDRESSES[toChain] &&
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

// Default adapter params for LZ V1: version 1, 200000 gas
const DEFAULT_ADAPTER_PARAMS = '0x00010000000000000000000000000000000000000000000000000000000000030d40' as Hex

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
  if (!hasPeer(fromChain, toChain)) throw new Error(`No OFT peer between these chains`)

  const amountLD = parseEther(amount)
  const minAmountLD = amountLD - (amountLD * BigInt(Math.floor(slippage * 100))) / 10000n

  const [nativeFee] = await publicClient.readContract({
    address: oftAddress,
    abi: OFT_V1_ABI,
    functionName: 'estimateSendFee',
    args: [dstChainId, toAddress as Hex, amountLD, false, DEFAULT_ADAPTER_PARAMS],
  }) as [bigint, bigint]

  return {
    nativeFee,
    nativeFeeFormatted: formatEther(nativeFee),
    amountLD,
    minAmountLD,
    route: 'LayerZero OFT (V1)',
    estimatedTime: 120, // ~2 min for LZ V1
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

  // Get fee quote
  onStatus('Getting LayerZero fee quote...')
  const [nativeFee] = await publicClient.readContract({
    address: oftAddress,
    abi: OFT_V1_ABI,
    functionName: 'estimateSendFee',
    args: [dstChainId, toAddress as Hex, amountLD, false, DEFAULT_ADAPTER_PARAMS],
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
    args: [fromAddress, dstChainId, toAddress as Hex, amountLD, minAmountLD, callParams],
    value: feeWithBuffer,
    chain: undefined,
    account: fromAddress,
  })

  onStatus('Transaction submitted, waiting for confirmation...')
  await publicClient.waitForTransactionReceipt({ hash: txHash })
  onStatus('✅ TLOS bridged via LayerZero! Track at layerzeroscan.com')

  return { txHash }
}
