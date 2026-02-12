// Direct TLOS OFT bridging via LayerZero V1
// Two OFT deployments exist — we use the newer one that includes Base

import { parseEther, formatEther, type Address, type Hex } from 'viem'

// TLOS OFT contract addresses (newer deployment, verified on-chain)
// Telos adapter 0x02ea... peers with all chains below
export const TLOS_OFT_ADDRESSES: Record<number, Address> = {
  40: '0x02ea28694ae65358be92bafef5cb8c211f33db1a',     // Telos EVM (OFT Adapter)
  1: '0x193f4A4a6ea24102F49b931DEeeb931f6E32405d',     // Ethereum
  56: '0x193f4A4a6ea24102F49b931DEeeb931f6E32405d',     // BSC
  43114: '0xed667dC80a45b77305Cc395DB56D997597Dc6DdD',  // Avalanche
  137: '0x193f4A4a6ea24102F49b931DEeeb931f6E32405d',    // Polygon
  42161: '0x193f4A4a6ea24102F49b931DEeeb931f6E32405d',  // Arbitrum
  8453: '0x7252c865c05378Ffc15120F428dd65804dD0CE63',   // Base
}

// LayerZero V1 chain IDs
export const LZ_V1_CHAIN_IDS: Record<number, number> = {
  40: 199,      // Telos
  1: 101,       // Ethereum
  56: 102,      // BSC
  43114: 106,   // Avalanche
  137: 109,     // Polygon
  42161: 110,   // Arbitrum
  8453: 184,    // Base
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
    fromChain !== toChain
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

  onStatus('Getting LayerZero fee quote...')
  const [nativeFee] = await publicClient.readContract({
    address: oftAddress,
    abi: OFT_V1_ABI,
    functionName: 'estimateSendFee',
    args: [dstChainId, toBytes32, amountLD, false, DEFAULT_ADAPTER_PARAMS],
  }) as [bigint, bigint]

  const feeWithBuffer = nativeFee + nativeFee / 10n

  const callParams = {
    refundAddress: fromAddress,
    zroPaymentAddress: '0x0000000000000000000000000000000000000000' as Address,
    adapterParams: DEFAULT_ADAPTER_PARAMS,
  }

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
