// LayerZero V2 OFT bridging for WBTC and WETH
// Uses LZ V2 endpoint: 0x1a44076050125825900e736c501f859c50fE728c
// OFT V2 functions: send(), quoteSend(), quoteOFT()

import { parseUnits, formatUnits, type Address, type Hex, encodeFunctionData, decodeFunctionResult } from 'viem'

// LZ V2 Endpoint IDs
export const LZ_V2_EIDS: Record<number, number> = {
  40: 30199,    // Telos
  1: 30101,     // Ethereum
  56: 30102,    // BSC
  43114: 30106, // Avalanche
  8453: 30184,  // Base
  10: 30111,    // OP Mainnet
  42161: 30110, // Arbitrum
  137: 30109,   // Polygon
}

// OFT V2 token configs on Telos
export interface OftV2Token {
  symbol: string
  name: string
  address: Address          // OFT contract on Telos
  underlyingAddress?: Address // underlying token if adapter pattern
  decimals: number
  sharedDecimals: number
  peers: Record<number, Address>  // chainId → OFT address on that chain
}

export const OFT_V2_TOKENS: Record<string, OftV2Token> = {
  WBTC: {
    symbol: 'WBTC',
    name: 'Wrapped BTC',
    address: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c',
    decimals: 8,
    sharedDecimals: 8,
    peers: {
      1: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c',     // ETH
      56: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c',    // BSC
      43114: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c', // AVAX
      8453: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c',  // Base
      10: '0xc3f854b2970f8727d28527ece33176fac67fef48',     // OP Mainnet
    },
  },
  WETH: {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: '0xA272fFe20cFfe769CdFc4b63088DCD2C82a2D8F9',
    underlyingAddress: '0xBAb93B7ad7fE8692A878B95a8e689423437cc500',
    decimals: 18,
    sharedDecimals: 6,
    peers: {
      1: '0xA272fFe20cFfe769CdFc4b63088DCD2C82a2D8F9',     // ETH (same pattern)
      56: '0xA272fFe20cFfe769CdFc4b63088DCD2C82a2D8F9',    // BSC
      43114: '0xA272fFe20cFfe769CdFc4b63088DCD2C82a2D8F9', // AVAX
      8453: '0xA272fFe20cFfe769CdFc4b63088DCD2C82a2D8F9',  // Base
      42161: '0xA272fFe20cFfe769CdFc4b63088DCD2C82a2D8F9', // Arb
      10: '0xA272fFe20cFfe769CdFc4b63088DCD2C82a2D8F9',    // OP
      137: '0xA272fFe20cFfe769CdFc4b63088DCD2C82a2D8F9',   // Polygon
    },
  },
}

// LZ V2 OFT ABI
const OFT_V2_ABI = [
  {
    name: 'quoteSend',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      {
        name: '_sendParam', type: 'tuple',
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
        name: 'msgFee', type: 'tuple',
        components: [
          { name: 'nativeFee', type: 'uint256' },
          { name: 'lzTokenFee', type: 'uint256' },
        ],
      },
      {
        name: 'oftReceipt', type: 'tuple',
        components: [
          { name: 'amountSentLD', type: 'uint256' },
          { name: 'amountReceivedLD', type: 'uint256' },
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
        name: '_sendParam', type: 'tuple',
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
        name: '_fee', type: 'tuple',
        components: [
          { name: 'nativeFee', type: 'uint256' },
          { name: 'lzTokenFee', type: 'uint256' },
        ],
      },
      { name: '_refundAddress', type: 'address' },
    ],
    outputs: [
      {
        name: 'msgReceipt', type: 'tuple',
        components: [
          { name: 'guid', type: 'bytes32' },
          { name: 'nonce', type: 'uint64' },
          { name: 'fee', type: 'tuple', components: [
            { name: 'nativeFee', type: 'uint256' },
            { name: 'lzTokenFee', type: 'uint256' },
          ]},
        ],
      },
      {
        name: 'oftReceipt', type: 'tuple',
        components: [
          { name: 'amountSentLD', type: 'uint256' },
          { name: 'amountReceivedLD', type: 'uint256' },
        ],
      },
    ],
  },
] as const

const ERC20_ABI = [
  { name: 'approve', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }] },
] as const

function addressToBytes32(addr: Address): Hex {
  return ('0x' + addr.slice(2).toLowerCase().padStart(64, '0')) as Hex
}

export function isOftV2Route(token: string, fromChain: number, toChain: number): boolean {
  const config = OFT_V2_TOKENS[token]
  if (!config) return false
  if (fromChain !== 40) return false  // Currently only bridging FROM Telos
  return !!config.peers[toChain] && !!LZ_V2_EIDS[toChain]
}

export function getOftV2Chains(token: string): number[] {
  const config = OFT_V2_TOKENS[token]
  if (!config) return []
  return Object.keys(config.peers).map(Number)
}

export function getAvailableOftV2Tokens(toChain: number): string[] {
  return Object.keys(OFT_V2_TOKENS).filter(sym => {
    const config = OFT_V2_TOKENS[sym]
    return !!config.peers[toChain]
  })
}

export interface OftV2QuoteResult {
  nativeFee: bigint
  nativeFeeFormatted: string
  amountReceived: bigint
  amountReceivedFormatted: string
  feeEstimated: boolean
}

export async function quoteOftV2Send(
  publicClient: any,
  token: string,
  toChain: number,
  amount: string,
  toAddress: Address,
): Promise<OftV2QuoteResult> {
  const config = OFT_V2_TOKENS[token]
  if (!config) throw new Error(`Unknown OFT V2 token: ${token}`)
  const dstEid = LZ_V2_EIDS[toChain]
  if (!dstEid) throw new Error('Unsupported destination chain')

  const amountLD = parseUnits(amount, config.decimals)
  const toBytes32 = addressToBytes32(toAddress)

  try {
    const result = await publicClient.readContract({
      address: config.address,
      abi: OFT_V2_ABI,
      functionName: 'quoteSend',
      args: [
        {
          dstEid,
          to: toBytes32,
          amountLD,
          minAmountLD: amountLD * 99n / 100n, // 1% slippage for quote
          extraOptions: '0x' as Hex,
          composeMsg: '0x' as Hex,
          oftCmd: '0x' as Hex,
        },
        false,
      ],
    }) as any

    const nativeFee = result[0].nativeFee || result.msgFee?.nativeFee
    const amountReceived = result[1].amountReceivedLD || result.oftReceipt?.amountReceivedLD

    return {
      nativeFee,
      nativeFeeFormatted: formatUnits(nativeFee, 18),
      amountReceived: amountReceived || amountLD,
      amountReceivedFormatted: formatUnits(amountReceived || amountLD, config.decimals),
      feeEstimated: false,
    }
  } catch (e) {
    // Fallback fees
    const fallback = toChain === 1 ? 300n : 20n
    const nativeFee = fallback * 10n ** 18n
    return {
      nativeFee,
      nativeFeeFormatted: formatUnits(nativeFee, 18),
      amountReceived: amountLD,
      amountReceivedFormatted: amount,
      feeEstimated: true,
    }
  }
}

export async function executeOftV2Send(
  walletClient: any,
  publicClient: any,
  token: string,
  toChain: number,
  amount: string,
  fromAddress: Address,
  toAddress: Address,
  onStatus: (msg: string) => void,
): Promise<{ txHash: Hex }> {
  const config = OFT_V2_TOKENS[token]
  if (!config) throw new Error(`Unknown OFT V2 token: ${token}`)
  const dstEid = LZ_V2_EIDS[toChain]
  if (!dstEid) throw new Error('Unsupported destination chain')

  const amountLD = parseUnits(amount, config.decimals)
  const toBytes32 = addressToBytes32(toAddress)

  // Get fee quote
  onStatus('Getting fee quote...')
  const quote = await quoteOftV2Send(publicClient, token, toChain, amount, toAddress)
  const feeWithBuffer = quote.nativeFee + quote.nativeFee / 10n

  // Check and set ERC20 approval (WBTC/WETH need approval, unlike native TLOS)
  const tokenToApprove = config.underlyingAddress || config.address
  onStatus('Checking token approval...')

  const allowance = await publicClient.readContract({
    address: tokenToApprove,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [fromAddress, config.address],
  }) as bigint

  if (allowance < amountLD) {
    onStatus(`Approve ${config.symbol} spend...`)
    const approveTx = await walletClient.writeContract({
      address: tokenToApprove,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [config.address, amountLD],
      chain: undefined,
      account: fromAddress,
    })
    await publicClient.waitForTransactionReceipt({ hash: approveTx })
    onStatus('Approved! Sending bridge...')
  }

  // Execute send
  onStatus('Confirm bridge in wallet...')
  const txHash = await walletClient.writeContract({
    address: config.address,
    abi: OFT_V2_ABI,
    functionName: 'send',
    args: [
      {
        dstEid,
        to: toBytes32,
        amountLD,
        minAmountLD: amountLD * 99n / 100n,
        extraOptions: '0x' as Hex,
        composeMsg: '0x' as Hex,
        oftCmd: '0x' as Hex,
      },
      { nativeFee: feeWithBuffer, lzTokenFee: 0n },
      fromAddress,
    ],
    value: feeWithBuffer,
    gas: 500000n,
    chain: undefined,
    account: fromAddress,
  })

  onStatus('Transaction submitted, waiting for confirmation...')
  await publicClient.waitForTransactionReceipt({ hash: txHash })
  onStatus(`✅ ${config.symbol} bridged! Track at layerzeroscan.com/tx/${txHash}`)

  return { txHash }
}
