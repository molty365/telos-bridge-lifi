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
  534352: 30214, // Scroll
  5000: 30181,  // Mantle
  59144: 30183, // Linea
  1329: 30280,  // Sei
  2222: 30177,  // Kava
  8217: 30150,  // Kaia
  1088: 30151,  // Metis
  1313161554: 30211, // Aurora
}

// OFT V2 token configs on Telos
export interface OftV2Token {
  symbol: string
  name: string
  address: Address          // OFT contract on Telos
  underlyingAddress?: Address // underlying token if adapter pattern
  decimals: number
  sharedDecimals: number
  isStargate?: boolean            // Stargate Hydra OFT (uses same send() interface)
  peers: Record<number, Address>  // chainId → OFT/Pool address on that chain
}

export const OFT_V2_TOKENS: Record<string, OftV2Token> = {
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x2086f755A6d9254045C257ea3d382ef854849B0f',  // Stargate Hydra OFT on Telos
    underlyingAddress: '0xF1815bd50389c46847f0Bda824eC8da914045D14', // Bridged USDC (Stargate)
    decimals: 6,
    sharedDecimals: 6,
    isStargate: true,
    peers: {
      1: '0xc026395860Db2d07ee33e05fE50ed7bD583189C7',     // ETH StargatePoolUSDC
      56: '0x962Bd449E630b0d928f308Ce63f1A21F02576057',    // BSC StargatePoolUSDC
      43114: '0x5634c4a5FEd09819E3c46D86A965Dd9447d86e47', // AVAX StargatePoolUSDC
      137: '0x9Aa02D4Fae7F58b8E8f34c66E756cC734DAc7fe4',   // Polygon StargatePoolUSDC
      42161: '0xe8CDF27AcD73a434D661C84887215F7598e7d0d3', // Arb StargatePoolUSDC
      10: '0xcE8CcA271Ebc0533920C83d39F417ED6A0abB7D0',    // OP StargatePoolUSDC
      8453: '0x27a16dc786820B16E5c9028b75B99F6f604b5d26',  // Base StargatePoolUSDC
      534352: '0x3Fc69CC4A842838bCDC9499178740226062b14E4', // Scroll
      5000: '0xAc290Ad4e0c891FDc295ca4F0a6214cf6dC6acDC',   // Mantle
      1313161554: '0x81F6138153d473E8c5EcebD3DC8Cd4903506B075', // Aurora
      1329: '0x45d417612e177672958dC0537C45a8f8d754Ac2E',   // Sei
    },
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0x3a1293Bdb83bBbDd5Ebf4fAc96605aD2021BbC0f',  // Stargate Hydra OFT on Telos
    underlyingAddress: '0x674843C06FF83502ddb4D37c2E09C01cdA38cbc8', // USDT on Telos
    decimals: 6,
    sharedDecimals: 6,
    isStargate: true,
    peers: {
      1: '0x933597a323Eb81cAe705C5bC29985172fd5A3973',     // ETH StargatePoolUSDT
      56: '0x138EB30f73BC423c6455C53df6D89CB01d9eBc63',    // BSC StargatePoolUSDT
      43114: '0x12dC9256Acc9895B076f6638D628382881e62CeE', // AVAX StargatePoolUSDT
      137: '0xd47b03ee6d86Cf251ee7860FB2ACf9f91B9fD4d7',   // Polygon StargatePoolUSDT
      42161: '0xcE8CcA271Ebc0533920C83d39F417ED6A0abB7D0', // Arb StargatePoolUSDT
      10: '0x19cFCE47eD54a88614648DC3f19A5980097007dD',    // OP StargatePoolUSDT
      5000: '0xB715B85682B731dB9D5063187C450095c91C57FC',   // Mantle
      2222: '0x41A5b0470D96656Fb3e8f68A218b39AdBca3420b',   // Kava
      1088: '0x4dCBFC0249e8d5032F89D6461218a9D2eFff5125',   // Metis
      1329: '0x0dB9afb4C33be43a0a0e396Fd1383B4ea97aB10a',   // Sei
    },
  },
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
  ETH: {
    symbol: 'ETH',
    name: 'Ether',
    address: '0xA272fFe20cFfe769CdFc4b63088DCD2C82a2D8F9',  // StargateOFTETH on Telos
    underlyingAddress: '0xBAb93B7ad7fE8692A878B95a8e689423437cc500',
    decimals: 18,
    sharedDecimals: 6,
    isStargate: true,
    peers: {
      1: '0x77b2043768d28E9C9aB44E1aBfC95944bcE57931',     // ETH StargatePoolNative
      8453: '0xdc181Bd607330aeeBEF6ea62e03e5e1Fb4B6F7C7',  // Base StargatePoolNative
      42161: '0xA45B5130f36CDcA45667738e2a258AB09f4A5f7F', // Arb StargatePoolNative
      10: '0xe8CDF27AcD73a434D661C84887215F7598e7d0d3',    // OP StargatePoolNative
      59144: '0x81F6138153d473E8c5EcebD3DC8Cd4903506B075', // Linea StargatePoolNative
      5000: '0x4c1d3Fc3fC3c177c3b633427c2F769276c547463',   // Mantle StargatePoolETH
      534352: '0xC2b638Cb5042c1B3c5d5C969361fB50569840583', // Scroll StargatePoolNative
    },
  },
}

// Stargate quoteOFT ABI
const STARGATE_QUOTE_OFT_ABI = [
  {
    name: 'quoteOFT',
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
    ],
    outputs: [
      { name: 'oftLimit', type: 'tuple', components: [
        { name: 'minAmountLD', type: 'uint256' },
        { name: 'maxAmountLD', type: 'uint256' },
      ]},
      { name: 'oftFeeDetails', type: 'tuple[]', components: [
        { name: 'feeAmountLD', type: 'int256' },
        { name: 'description', type: 'string' },
      ]},
      { name: 'oftReceipt', type: 'tuple', components: [
        { name: 'amountSentLD', type: 'uint256' },
        { name: 'amountReceivedLD', type: 'uint256' },
      ]},
    ],
  },
] as const

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
  // Bridging FROM Telos: destination must be a peer
  if (fromChain === 40) return !!config.peers[toChain] && !!LZ_V2_EIDS[toChain]
  // Bridging TO Telos: source must be a peer
  if (toChain === 40) return !!config.peers[fromChain] && !!LZ_V2_EIDS[fromChain]
  return false
}

export function getOftV2Chains(token: string): number[] {
  const config = OFT_V2_TOKENS[token]
  if (!config) return []
  return Object.keys(config.peers).map(Number)
}

// Get the contract address to call on a given source chain
export function getOftV2SourceAddress(token: string, fromChain: number): Address {
  const config = OFT_V2_TOKENS[token]
  if (!config) throw new Error(`Unknown OFT V2 token: ${token}`)
  if (fromChain === 40) return config.address  // Telos contract
  return config.peers[fromChain]               // Remote chain contract (Stargate pool or OFT)
}

export function getAvailableOftV2Tokens(fromChain: number, toChain: number): string[] {
  return Object.keys(OFT_V2_TOKENS).filter(sym => isOftV2Route(sym, fromChain, toChain))
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
  fromChain: number,
  toChain: number,
  amount: string,
  toAddress: Address,
): Promise<OftV2QuoteResult> {
  const config = OFT_V2_TOKENS[token]
  if (!config) throw new Error(`Unknown OFT V2 token: ${token}`)
  const dstEid = LZ_V2_EIDS[toChain]
  if (!dstEid) throw new Error('Unsupported destination chain')

  const sourceAddress = getOftV2SourceAddress(token, fromChain)
  const amountLD = parseUnits(amount, config.decimals)
  const toBytes32 = addressToBytes32(toAddress)

  const sendParam = {
    dstEid,
    to: toBytes32,
    amountLD,
    minAmountLD: amountLD * 90n / 100n, // 10% slippage for quote
    extraOptions: '0x' as Hex,
    composeMsg: '0x' as Hex,
    oftCmd: '0x' as Hex, // taxi mode (empty = taxi)
  }

  try {
    // For Stargate tokens, use quoteOFT first to get accurate received amount
    let amountReceived = amountLD
    if (config.isStargate) {
      try {
        const oftQuote = await publicClient.readContract({
          address: sourceAddress,
          abi: STARGATE_QUOTE_OFT_ABI,
          functionName: 'quoteOFT',
          args: [sendParam],
        }) as any
        amountReceived = oftQuote[2]?.amountReceivedLD || oftQuote.oftReceipt?.amountReceivedLD || amountLD
        // Update minAmountLD based on actual received amount
        sendParam.minAmountLD = amountReceived * 99n / 100n
      } catch { /* fall through to quoteSend */ }
    }

    const result = await publicClient.readContract({
      address: sourceAddress,
      abi: OFT_V2_ABI,
      functionName: 'quoteSend',
      args: [sendParam, false],
    }) as any

    const nativeFee = result[0].nativeFee || result.msgFee?.nativeFee
    if (!config.isStargate) {
      amountReceived = result[1]?.amountReceivedLD || result.oftReceipt?.amountReceivedLD || amountLD
    }

    return {
      nativeFee,
      nativeFeeFormatted: formatUnits(nativeFee, 18),
      amountReceived,
      amountReceivedFormatted: formatUnits(amountReceived, config.decimals),
      feeEstimated: false,
    }
  } catch (e) {
    // Fallback fees — use source chain native currency amount
    const fallback = toChain === 1 || fromChain === 1 ? 300n : 20n
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
  fromChain: number,
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

  const sourceAddress = getOftV2SourceAddress(token, fromChain)
  const amountLD = parseUnits(amount, config.decimals)
  const toBytes32 = addressToBytes32(toAddress)

  // Get fee quote
  onStatus('Getting fee quote...')
  const quote = await quoteOftV2Send(publicClient, token, fromChain, toChain, amount, toAddress)
  const feeWithBuffer = quote.nativeFee + quote.nativeFee / 10n

  // For Stargate, use quoteOFT minAmountLD; for regular OFTs, 1% slippage
  const minAmountLD = config.isStargate
    ? quote.amountReceived * 99n / 100n
    : amountLD * 99n / 100n

  // Check and set ERC20 approval — approve the source contract to spend tokens
  // For Stargate pools on remote chains, the pool contract IS the token (or needs approval on underlying)
  const tokenToApprove = fromChain === 40
    ? (config.underlyingAddress || config.address)  // On Telos, approve underlying token
    : sourceAddress  // On remote chains, the Stargate pool handles its own token
  
  // For Stargate pools on remote chains, we need to approve the pool to spend the underlying token
  // The pool's token() returns the underlying ERC20 address
  let spender = sourceAddress
  if (fromChain !== 40 && config.isStargate) {
    // For remote Stargate pools, approve the pool to spend the underlying token
    try {
      const underlyingToken = await publicClient.readContract({
        address: sourceAddress,
        abi: [{ name: 'token', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] }],
        functionName: 'token',
      }) as Address
      onStatus('Checking token approval...')
      const allowance = await publicClient.readContract({
        address: underlyingToken,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [fromAddress, sourceAddress],
      }) as bigint
      if (allowance < amountLD) {
        onStatus(`Approve ${config.symbol} spend...`)
        const approveTx = await walletClient.writeContract({
          address: underlyingToken,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [sourceAddress, amountLD],
          chain: undefined,
          account: fromAddress,
        })
        await publicClient.waitForTransactionReceipt({ hash: approveTx })
        onStatus('Approved! Sending bridge...')
      }
    } catch {
      // If token() fails, skip approval (might be native or OFT pattern)
    }
  } else {
    onStatus('Checking token approval...')
    const allowance = await publicClient.readContract({
      address: tokenToApprove,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [fromAddress, sourceAddress],
    }) as bigint
    if (allowance < amountLD) {
      onStatus(`Approve ${config.symbol} spend...`)
      const approveTx = await walletClient.writeContract({
        address: tokenToApprove,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [sourceAddress, amountLD],
        chain: undefined,
        account: fromAddress,
      })
      await publicClient.waitForTransactionReceipt({ hash: approveTx })
      onStatus('Approved! Sending bridge...')
    }
  }

  // Execute send
  onStatus('Confirm bridge in wallet...')
  const txHash = await walletClient.writeContract({
    address: sourceAddress,
    abi: OFT_V2_ABI,
    functionName: 'send',
    args: [
      {
        dstEid,
        to: toBytes32,
        amountLD,
        minAmountLD,
        extraOptions: '0x' as Hex,
        composeMsg: '0x' as Hex,
        oftCmd: '0x' as Hex, // empty = taxi mode (immediate for Stargate)
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
