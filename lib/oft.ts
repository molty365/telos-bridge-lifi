// Direct TLOS OFT bridging via LayerZero
// Used when bridging TLOS↔TLOS cross-chain (bypasses LiFi)

import { encodePacked, parseEther, formatEther, type Address, encodeFunctionData, type Hex } from 'viem'

// TLOS OFT contract addresses per chain (from Telos docs)
export const TLOS_OFT_ADDRESSES: Record<number, Address> = {
  40: '0xD102cE6A4dB07D247fcc28F366A623Df0938CA9E',    // Telos EVM (WTLOS - OFT Adapter)
  1: '0x193f4A4a6ea24102F49b931DEeeb931f6E32405d',     // Ethereum
  8453: '0x7252c865c05378Ffc15120F428dd65804dD0CE63',   // Base
  56: '0x193f4A4a6ea24102F49b931DEeeb931f6E32405d',     // BSC
  43114: '0xed667dC80a45b77305Cc395DB56D997597Dc6DdD',  // Avalanche
  137: '0x193f4A4a6ea24102F49b931DEeeb931f6E32405d',    // Polygon
  42161: '0x193f4A4a6ea24102F49b931DEeeb931f6E32405d',  // Arbitrum
}

// LayerZero V2 Endpoint IDs (EIDs) — 30000 + index for mainnets
export const LZ_EIDS: Record<number, number> = {
  1: 30101,      // Ethereum
  56: 30102,     // BSC
  43114: 30106,  // Avalanche
  137: 30109,    // Polygon
  42161: 30110,  // Arbitrum
  10: 30111,     // Optimism
  8453: 30184,   // Base
  40: 30120,     // Telos
}

// Chain names for display
export const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum', 56: 'BSC', 43114: 'Avalanche', 137: 'Polygon',
  42161: 'Arbitrum', 10: 'Optimism', 8453: 'Base', 40: 'Telos',
}

// OFT Standard ABI (LayerZero V2)
const OFT_ABI = [
  {
    name: 'quoteSend',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      {
        name: '_sendParam',
        type: 'tuple',
        components: [
          { name: 'dstEid', type: 'uint32' },
          { name: 'to', type: 'bytes32' },
          { name: 'amountLD', type: 'uint256' },
          { name: 'minAmountLD', type: 'uint256' },
          { name: 'extraOptions', type: 'bytes' },
          { name: 'composeMsg', type: 'bytes' },
          { name: 'oftCmd', type: 'bytes' },
        ],
      },
      { name: '_payInLzToken', type: 'bool' },
    ],
    outputs: [
      {
        name: 'msgFee',
        type: 'tuple',
        components: [
          { name: 'nativeFee', type: 'uint256' },
          { name: 'lzTokenFee', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'send',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: '_sendParam',
        type: 'tuple',
        components: [
          { name: 'dstEid', type: 'uint32' },
          { name: 'to', type: 'bytes32' },
          { name: 'amountLD', type: 'uint256' },
          { name: 'minAmountLD', type: 'uint256' },
          { name: 'extraOptions', type: 'bytes' },
          { name: 'composeMsg', type: 'bytes' },
          { name: 'oftCmd', type: 'bytes' },
        ],
      },
      {
        name: '_fee',
        type: 'tuple',
        components: [
          { name: 'nativeFee', type: 'uint256' },
          { name: 'lzTokenFee', type: 'uint256' },
        ],
      },
      { name: '_refundAddress', type: 'address' },
    ],
    outputs: [
      {
        name: 'msgReceipt',
        type: 'tuple',
        components: [
          { name: 'guid', type: 'bytes32' },
          { name: 'nonce', type: 'uint64' },
          {
            name: 'fee',
            type: 'tuple',
            components: [
              { name: 'nativeFee', type: 'uint256' },
              { name: 'lzTokenFee', type: 'uint256' },
            ],
          },
        ],
      },
      {
        name: 'oftReceipt',
        type: 'tuple',
        components: [
          { name: 'amountSentLD', type: 'uint256' },
          { name: 'amountReceivedLD', type: 'uint256' },
        ],
      },
    ],
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

// LayerZero V2 extra options encoding for gas
// Type 3 (lzReceive) with 200000 gas limit
function buildExtraOptions(gasLimit: bigint = 200000n): Hex {
  // Options type 3: executorLzReceiveOption
  // Format: 0x0003 + 0x01 + len(16) + workerID(0x01) + optionType(0x01) + gas(uint128) + value(uint128)
  const TYPE_3 = '0003'
  const WORKER_ID = '01' // executor
  const OPTION_TYPE = '01' // lzReceive
  const gas = gasLimit.toString(16).padStart(32, '0')
  const value = '00000000000000000000000000000000' // 0 msg.value on destination
  const optionData = WORKER_ID + OPTION_TYPE + gas + value
  const optionLen = (optionData.length / 2).toString(16).padStart(4, '0')
  return `0x${TYPE_3}${optionLen}${optionData}` as Hex
}

// Convert address to bytes32 (left-padded)
function addressToBytes32(address: Address): Hex {
  return ('0x' + address.slice(2).toLowerCase().padStart(64, '0')) as Hex
}

export function isTlosOftRoute(fromChain: number, toChain: number, fromToken: string, toToken: string): boolean {
  return (
    fromToken.toUpperCase() === 'TLOS' &&
    toToken.toUpperCase() === 'TLOS' &&
    !!TLOS_OFT_ADDRESSES[fromChain] &&
    !!TLOS_OFT_ADDRESSES[toChain] &&
    !!LZ_EIDS[fromChain] &&
    !!LZ_EIDS[toChain]
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
  estimatedTime: number // seconds
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
  const dstEid = LZ_EIDS[toChain]
  if (!oftAddress || !dstEid) throw new Error('Unsupported chain for TLOS OFT')

  const amountLD = parseEther(amount)
  const minAmountLD = amountLD - (amountLD * BigInt(Math.floor(slippage * 100))) / 10000n
  const extraOptions = buildExtraOptions()

  const sendParam = {
    dstEid,
    to: addressToBytes32(toAddress),
    amountLD,
    minAmountLD,
    extraOptions,
    composeMsg: '0x' as Hex,
    oftCmd: '0x' as Hex,
  }

  const result = await publicClient.readContract({
    address: oftAddress,
    abi: OFT_ABI,
    functionName: 'quoteSend',
    args: [sendParam, false],
  })

  const nativeFee = (result as any).nativeFee

  return {
    nativeFee,
    nativeFeeFormatted: formatEther(nativeFee),
    amountLD,
    minAmountLD,
    route: 'LayerZero OFT',
    estimatedTime: 60, // ~1 min for LayerZero
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
  const dstEid = LZ_EIDS[toChain]
  if (!oftAddress || !dstEid) throw new Error('Unsupported chain for TLOS OFT')

  const amountLD = parseEther(amount)
  const minAmountLD = amountLD - (amountLD * BigInt(Math.floor(slippage * 100))) / 10000n
  const extraOptions = buildExtraOptions()

  const sendParam = {
    dstEid,
    to: addressToBytes32(toAddress),
    amountLD,
    minAmountLD,
    extraOptions,
    composeMsg: '0x' as Hex,
    oftCmd: '0x' as Hex,
  }

  // Check if we need approval (for OFT Adapter on Telos, user needs to approve WTLOS)
  // On other chains, the OFT contract IS the token, so no separate approval needed
  // But if the fromChain is Telos (40), the OFT adapter needs approval of WTLOS
  if (fromChain === 40) {
    onStatus('Checking WTLOS approval...')
    const allowance = await publicClient.readContract({
      address: oftAddress,
      abi: OFT_ABI,
      functionName: 'allowance',
      args: [fromAddress, oftAddress],
    })
    if ((allowance as bigint) < amountLD) {
      onStatus('Approving WTLOS...')
      const approveTx = await walletClient.writeContract({
        address: oftAddress,
        abi: OFT_ABI,
        functionName: 'approve',
        args: [oftAddress, amountLD],
        chain: undefined,
        account: fromAddress,
      })
      await publicClient.waitForTransactionReceipt({ hash: approveTx })
    }
  }

  // Get quote for native fee
  onStatus('Getting LayerZero fee quote...')
  const quoteResult = await publicClient.readContract({
    address: oftAddress,
    abi: OFT_ABI,
    functionName: 'quoteSend',
    args: [sendParam, false],
  })

  const nativeFee = (quoteResult as any).nativeFee
  // Add 10% buffer to native fee
  const feeWithBuffer = nativeFee + nativeFee / 10n

  const fee = { nativeFee: feeWithBuffer, lzTokenFee: 0n }

  // Execute send
  onStatus('Confirm in wallet...')
  const txHash = await walletClient.writeContract({
    address: oftAddress,
    abi: OFT_ABI,
    functionName: 'send',
    args: [sendParam, fee, fromAddress],
    value: feeWithBuffer,
    chain: undefined,
    account: fromAddress,
  })

  onStatus('Transaction submitted, waiting for confirmation...')
  await publicClient.waitForTransactionReceipt({ hash: txHash })

  onStatus(`✅ TLOS bridged via LayerZero! Track at layerzeroscan.com`)

  return { txHash }
}
