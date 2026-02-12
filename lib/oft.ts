// Direct TLOS OFT bridging via LayerZero V1
// NativeOFT pattern: msg.value = amount + LZ fee (no ERC20 approval needed)
// Tested: 1 TLOS Telos→Base successful (tx 0x7da5920b...)

import { parseEther, formatEther, type Address, type Hex } from 'viem'

// TLOS OFT contract addresses (official from Telos Foundation)
export const TLOS_OFT_ADDRESSES: Record<number, Address> = {
  40: '0x02Ea28694Ae65358Be92bAFeF5Cb8C211f33Db1A',     // Telos EVM (NativeOFT Adapter)
  1: '0x193f4A4a6ea24102F49b931DEeeb931f6E32405d',      // Ethereum
  56: '0x193f4A4a6ea24102F49b931DEeeb931f6E32405d',     // BSC
  43114: '0xed667dC80a45b77305Cc395DB56D997597Dc6DdD',  // Avalanche
  137: '0x193f4A4a6ea24102F49b931DEeeb931f6E32405d',    // Polygon
  42161: '0x193f4A4a6ea24102F49b931DEeeb931f6E32405d',  // Arbitrum
  8453: '0x7252c865c05378Ffc15120F428dd65804dD0Ce63',   // Base
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

// OFTv1 ABI — NOTE: sendFrom has NO _minAmount parameter (that's OFTv2)
// Selector: 0x695ef6bf = sendFrom(address,uint16,bytes32,uint256,(address,address,bytes))
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

// Fallback LZ fees by destination (tested values + buffer)
// Real: Base ~11 TLOS, ETH ~208 TLOS. Add 50% buffer, excess refunded.
const FALLBACK_FEES: Record<number, bigint> = {
  184: parseEther('20'),   // Base
  110: parseEther('20'),   // Arbitrum
  10:  parseEther('20'),   // Optimism
  102: parseEther('30'),   // BSC
  109: parseEther('30'),   // Polygon
  106: parseEther('30'),   // Avalanche
  101: parseEther('300'),  // Ethereum (expensive)
}
const DEFAULT_FALLBACK_FEE = parseEther('50')

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
  route: string
  estimatedTime: number
  feeEstimated: boolean
}

export async function quoteOftSend(
  publicClient: any,
  fromChain: number,
  toChain: number,
  amount: string,
  toAddress: Address,
): Promise<OftQuoteResult> {
  const oftAddress = TLOS_OFT_ADDRESSES[fromChain]
  const dstChainId = LZ_V1_CHAIN_IDS[toChain]
  if (!oftAddress || !dstChainId) throw new Error('Unsupported chain for TLOS OFT')

  const amountLD = parseEther(amount)
  const toBytes32 = addressToBytes32(toAddress)

  let nativeFee: bigint
  let feeEstimated = false

  try {
    const result = await publicClient.readContract({
      address: oftAddress,
      abi: OFT_V1_ABI,
      functionName: 'estimateSendFee',
      args: [dstChainId, toBytes32, amountLD, false, DEFAULT_ADAPTER_PARAMS],
    }) as [bigint, bigint]
    nativeFee = result[0]
  } catch {
    // estimateSendFee reverts on Telos RPC (oracle issue) but actual sends work
    nativeFee = FALLBACK_FEES[dstChainId] || DEFAULT_FALLBACK_FEE
    feeEstimated = true
  }

  return {
    nativeFee,
    nativeFeeFormatted: formatEther(nativeFee),
    amountLD,
    route: 'LayerZero OFT (1:1, no slippage)' + (feeEstimated ? ' · estimated fee — excess refunded' : ''),
    estimatedTime: 120,
    feeEstimated,
  }
}

// MST OFT contract addresses (ERC20 OFT, not NativeOFT)
export const MST_OFT_ADDRESSES: Record<number, Address> = {
  40: '0x568524DA340579887db50Ecf602Cd1BA8451b243',     // Telos
  1: '0x0F579B2Fc0ea6449680f0941eB70c117285C9a75',      // Ethereum
  8453: '0x88558259ceda5d8e681fedb55c50070fbd3da8f9',   // Base
}

const ERC20_ABI = [
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
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

export function isMstOftRoute(fromChain: number, toChain: number, fromToken: string, toToken: string): boolean {
  return (
    fromToken.toUpperCase() === 'MST' &&
    toToken.toUpperCase() === 'MST' &&
    !!MST_OFT_ADDRESSES[fromChain] &&
    !!MST_OFT_ADDRESSES[toChain] &&
    !!LZ_V1_CHAIN_IDS[fromChain] &&
    !!LZ_V1_CHAIN_IDS[toChain] &&
    fromChain !== toChain
  )
}

export function getMstSupportedChains(): number[] {
  return Object.keys(MST_OFT_ADDRESSES).map(Number)
}

export async function quoteMstSend(
  publicClient: any,
  fromChain: number,
  toChain: number,
  amount: string,
  toAddress: Address,
): Promise<OftQuoteResult> {
  const oftAddress = MST_OFT_ADDRESSES[fromChain]
  const dstChainId = LZ_V1_CHAIN_IDS[toChain]
  if (!oftAddress || !dstChainId) throw new Error('Unsupported chain for MST OFT')

  const amountLD = parseEther(amount)
  const toBytes32 = addressToBytes32(toAddress)

  let nativeFee: bigint
  let feeEstimated = false

  try {
    const result = await publicClient.readContract({
      address: oftAddress,
      abi: OFT_V1_ABI,
      functionName: 'estimateSendFee',
      args: [dstChainId, toBytes32, amountLD, false, DEFAULT_ADAPTER_PARAMS],
    }) as [bigint, bigint]
    nativeFee = result[0]
  } catch {
    nativeFee = FALLBACK_FEES[dstChainId] || DEFAULT_FALLBACK_FEE
    feeEstimated = true
  }

  return {
    nativeFee,
    nativeFeeFormatted: formatEther(nativeFee),
    amountLD,
    route: 'LayerZero OFT V1 (1:1, no slippage)' + (feeEstimated ? ' · estimated fee — excess refunded' : ''),
    estimatedTime: 120,
    feeEstimated,
  }
}

export async function executeMstSend(
  walletClient: any,
  publicClient: any,
  fromChain: number,
  toChain: number,
  amount: string,
  fromAddress: Address,
  toAddress: Address,
  onStatus: (msg: string) => void,
): Promise<{ txHash: Hex }> {
  const oftAddress = MST_OFT_ADDRESSES[fromChain]
  const dstChainId = LZ_V1_CHAIN_IDS[toChain]
  if (!oftAddress || !dstChainId) throw new Error('Unsupported chain for MST OFT')

  const amountLD = parseEther(amount)
  const toBytes32 = addressToBytes32(toAddress)

  // Check ERC20 allowance and approve if needed
  onStatus('Checking MST allowance...')
  const currentAllowance = await publicClient.readContract({
    address: oftAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [fromAddress, oftAddress],
  }) as bigint

  if (currentAllowance < amountLD) {
    onStatus('Approving MST spend — confirm in wallet...')
    const approveTx = await walletClient.writeContract({
      address: oftAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [oftAddress, amountLD],
      chain: undefined,
      account: fromAddress,
    })
    await publicClient.waitForTransactionReceipt({ hash: approveTx })
    onStatus('Approved ✓')
  }

  onStatus('Getting LayerZero fee quote...')
  let nativeFee: bigint
  try {
    const result = await publicClient.readContract({
      address: oftAddress,
      abi: OFT_V1_ABI,
      functionName: 'estimateSendFee',
      args: [dstChainId, toBytes32, amountLD, false, DEFAULT_ADAPTER_PARAMS],
    }) as [bigint, bigint]
    nativeFee = result[0]
  } catch {
    nativeFee = FALLBACK_FEES[dstChainId] || DEFAULT_FALLBACK_FEE
    onStatus('Using estimated fee (excess will be refunded)...')
  }

  const feeWithBuffer = nativeFee + nativeFee / 10n

  // ERC20 OFT: msg.value = ONLY LZ fee (not amount + fee)
  onStatus('Confirm bridge in wallet...')
  const txHash = await walletClient.writeContract({
    address: oftAddress,
    abi: OFT_V1_ABI,
    functionName: 'sendFrom',
    args: [
      fromAddress,
      dstChainId,
      toBytes32,
      amountLD,
      {
        refundAddress: fromAddress,
        zroPaymentAddress: '0x0000000000000000000000000000000000000000' as Address,
        adapterParams: DEFAULT_ADAPTER_PARAMS,
      },
    ],
    value: feeWithBuffer,
    gas: 500000n,
    chain: undefined,
    account: fromAddress,
  })

  onStatus('Transaction submitted, waiting for confirmation...')
  await publicClient.waitForTransactionReceipt({ hash: txHash })
  onStatus('✅ MST bridged via LayerZero! Track at layerzeroscan.com/tx/' + txHash)

  return { txHash }
}

export async function executeOftSend(
  walletClient: any,
  publicClient: any,
  fromChain: number,
  toChain: number,
  amount: string,
  fromAddress: Address,
  toAddress: Address,
  _slippage: number = 0.5,
  onStatus: (msg: string) => void,
): Promise<{ txHash: Hex }> {
  const oftAddress = TLOS_OFT_ADDRESSES[fromChain]
  const dstChainId = LZ_V1_CHAIN_IDS[toChain]
  if (!oftAddress || !dstChainId) throw new Error('Unsupported chain for TLOS OFT')

  const amountLD = parseEther(amount)
  const toBytes32 = addressToBytes32(toAddress)

  onStatus('Getting LayerZero fee quote...')
  let nativeFee: bigint
  try {
    const result = await publicClient.readContract({
      address: oftAddress,
      abi: OFT_V1_ABI,
      functionName: 'estimateSendFee',
      args: [dstChainId, toBytes32, amountLD, false, DEFAULT_ADAPTER_PARAMS],
    }) as [bigint, bigint]
    nativeFee = result[0]
  } catch {
    nativeFee = FALLBACK_FEES[dstChainId] || DEFAULT_FALLBACK_FEE
    onStatus('Using estimated fee (excess will be refunded)...')
  }

  // Add 10% buffer to fee; LayerZero refunds any excess
  const feeWithBuffer = nativeFee + nativeFee / 10n

  // NativeOFT: msg.value = TLOS amount + LZ fee (no ERC20 approval needed)
  const totalValue = amountLD + feeWithBuffer

  onStatus('Confirm in wallet...')
  const txHash = await walletClient.writeContract({
    address: oftAddress,
    abi: OFT_V1_ABI,
    functionName: 'sendFrom',
    args: [
      fromAddress,
      dstChainId,
      toBytes32,
      amountLD,
      {
        refundAddress: fromAddress,
        zroPaymentAddress: '0x0000000000000000000000000000000000000000' as Address,
        adapterParams: DEFAULT_ADAPTER_PARAMS,
      },
    ],
    value: totalValue,
    gas: 500000n,
    chain: undefined,
    account: fromAddress,
  })

  onStatus('Transaction submitted, waiting for confirmation...')
  await publicClient.waitForTransactionReceipt({ hash: txHash })
  onStatus('✅ TLOS bridged via LayerZero! Track at layerzeroscan.com/tx/' + txHash)

  return { txHash }
}
