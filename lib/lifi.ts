import { createConfig, getChains, getTokens, getQuote } from '@lifi/sdk'

// Initialize LiFi SDK
createConfig({ integrator: 'telos-bridge' })

let availableChainIds: number[] = []
let tokensByChain: Record<number, any[]> = {}
let inited = false

export async function initLiFi() {
  if (inited) return
  try {
    const chains = await getChains()
    availableChainIds = chains.map(c => c.id)
    const resp = await getTokens({ chains: availableChainIds.slice(0, 20) })
    tokensByChain = (resp as any).tokens || resp
    inited = true
  } catch (e) {
    console.error('LiFi init failed:', e)
  }
}

export function isChainAvailable(chainId: number): boolean {
  return availableChainIds.includes(chainId)
}

export async function findToken(chainId: number, symbol: string) {
  if (!inited) await initLiFi()
  const list = tokensByChain[chainId] || []
  return list.find((t: any) => t.symbol.toUpperCase() === symbol.toUpperCase()) ||
    (symbol === 'ETH' ? list.find((t: any) => t.symbol === 'WETH') : null)
}

export async function fetchQuote(params: {
  fromChainId: number; toChainId: number
  fromTokenSymbol: string; toTokenSymbol: string
  amount: string; slippage: number; fromAddress?: string
}) {
  if (!inited) await initLiFi()

  const fromToken = await findToken(params.fromChainId, params.fromTokenSymbol)
  const toToken = await findToken(params.toChainId, params.toTokenSymbol)
  if (!fromToken) throw new Error(`${params.fromTokenSymbol} not found on chain ${params.fromChainId}`)
  if (!toToken) throw new Error(`${params.toTokenSymbol} not found on chain ${params.toChainId}`)

  const decimals = fromToken.decimals
  const fromAmount = BigInt(Math.floor(parseFloat(params.amount) * 10 ** decimals)).toString()

  const quote = await getQuote({
    fromChain: params.fromChainId,
    toChain: params.toChainId,
    fromToken: fromToken.address,
    toToken: toToken.address,
    fromAmount,
    fromAddress: params.fromAddress || '0x0000000000000000000000000000000000000001',
    slippage: params.slippage / 100,
  })

  return {
    tool: quote.toolDetails?.name || quote.tool || 'Unknown',
    fromAmount: quote.action.fromAmount,
    toAmount: quote.estimate.toAmount,
    toAmountMin: quote.estimate.toAmountMin,
    executionDuration: quote.estimate.executionDuration,
    gasCosts: quote.estimate.gasCosts || [],
    fromToken,
    toToken,
    raw: quote,
  }
}

export { availableChainIds }
