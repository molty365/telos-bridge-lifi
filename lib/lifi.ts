import { createConfig, getChains, getTokens, getQuote, getConnections } from '@lifi/sdk'
import { setDynamicChains, setDynamicTokens, type ChainInfo } from './chains'

createConfig({ integrator: 'telos-bridge' })

let inited = false
let chainMap: Record<number, any> = {}

export async function initLiFi() {
  if (inited) return
  try {
    const chains = await getChains()
    chainMap = {}
    const infos: ChainInfo[] = chains.map(c => {
      chainMap[c.id] = c
      return {
        id: c.id,
        name: c.name,
        icon: (c as any).logoURI || '',
        nativeCurrency: c.nativeToken?.symbol || 'ETH',
      }
    })
    setDynamicChains(infos)

    const resp: any = await getTokens({ chains: chains.map(c => c.id).slice(0, 50) })
    const tokens = resp.tokens || resp
    setDynamicTokens(tokens)
    inited = true
  } catch (e) {
    console.error('LiFi init failed:', e)
  }
}

export function isChainAvailable(chainId: number): boolean {
  return !!chainMap[chainId]
}

export async function getTokensForChain(chainId: number): Promise<string[]> {
  if (!inited) await initLiFi()
  const { dynamicTokensByChain } = await import('./chains')
  const list = dynamicTokensByChain[chainId] || []
  // Deduplicate by symbol, prioritize well-known tokens
  const seen = new Set<string>()
  const result: string[] = []
  const priority = ['USDC', 'USDT', 'ETH', 'WETH', 'WBTC', 'TLOS', 'BNB', 'MATIC', 'AVAX']
  for (const sym of priority) {
    if (list.some(t => t.symbol.toUpperCase() === sym)) {
      result.push(sym)
      seen.add(sym)
    }
  }
  for (const t of list) {
    const s = t.symbol.toUpperCase()
    if (!seen.has(s) && result.length < 30) {
      result.push(t.symbol)
      seen.add(s)
    }
  }
  return result
}

export async function fetchQuote(params: {
  fromChainId: number; toChainId: number
  fromTokenSymbol: string; toTokenSymbol: string
  amount: string; slippage: number; fromAddress?: string
}) {
  if (!inited) await initLiFi()
  const { dynamicTokensByChain } = await import('./chains')

  const findToken = (chainId: number, symbol: string) => {
    const list = dynamicTokensByChain[chainId] || []
    return list.find(t => t.symbol.toUpperCase() === symbol.toUpperCase()) ||
      (symbol === 'ETH' ? list.find(t => t.symbol === 'WETH') : null)
  }

  const fromToken = findToken(params.fromChainId, params.fromTokenSymbol)
  const toToken = findToken(params.toChainId, params.toTokenSymbol)
  if (!fromToken) throw new Error(`${params.fromTokenSymbol} not found on chain ${params.fromChainId}`)
  if (!toToken) throw new Error(`${params.toTokenSymbol} not found on chain ${params.toChainId}`)

  const fromAmount = BigInt(Math.floor(parseFloat(params.amount) * 10 ** fromToken.decimals)).toString()

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
    tool: (quote as any).toolDetails?.name || quote.tool || 'Unknown',
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
