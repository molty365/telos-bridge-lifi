import { createConfig, getChains, getTokens, getQuote, getConnections } from '@lifi/sdk'
import { setDynamicChains, setDynamicTokens, type ChainInfo } from './chains'

createConfig({ integrator: 'telos-bridge' })

const TELOS_CHAIN_ID = 40
let inited = false
let chainMap: Record<number, any> = {}
let telosTokenSymbols: string[] = []
let connectedChainIds: number[] = []

export async function initLiFi() {
  if (inited) return
  try {
    const chains = await getChains()
    chainMap = {}
    chains.forEach(c => { chainMap[c.id] = c })

    // Get all tokens
    const resp: any = await getTokens({ chains: chains.map(c => c.id).slice(0, 50) })
    const allTokens = resp.tokens || resp
    setDynamicTokens(allTokens)

    // Get Telos tokens
    const telosTokens = allTokens[TELOS_CHAIN_ID] || []
    telosTokenSymbols = [...new Set(telosTokens.map((t: any) => t.symbol.toUpperCase() as string))] as string[]

    if (telosTokens.length > 0) {
      // Telos is available — find which chains can bridge these tokens
      try {
        const connections = await getConnections({ fromChain: TELOS_CHAIN_ID })
        const connChainSet = new Set<number>()
        connChainSet.add(TELOS_CHAIN_ID)
        if ((connections as any).connections) {
          for (const conn of Object.values((connections as any).connections) as any[]) {
            for (const c of conn) {
              if (c.toChainId) connChainSet.add(c.toChainId)
            }
          }
        }
        connectedChainIds = [...connChainSet]
      } catch {
        // Fallback: show all chains that have any of the same tokens
        connectedChainIds = chains
          .filter(c => {
            const ct = allTokens[c.id] || []
            return ct.some((t: any) => telosTokenSymbols.includes(t.symbol.toUpperCase()))
          })
          .map(c => c.id)
      }
    } else {
      // Telos not on LiFi yet — use Stargate token set as reference
      telosTokenSymbols = ['USDC', 'USDT', 'ETH', 'WETH', 'WBTC', 'TLOS']
      // Show chains that have these tokens
      connectedChainIds = chains
        .filter(c => {
          const ct = allTokens[c.id] || []
          return ct.some((t: any) => telosTokenSymbols.includes(t.symbol.toUpperCase()))
        })
        .map(c => c.id)
      // Ensure Telos is in the list
      if (!connectedChainIds.includes(TELOS_CHAIN_ID)) connectedChainIds.push(TELOS_CHAIN_ID)
    }

    // Build chain infos for only connected chains
    const infos: ChainInfo[] = connectedChainIds
      .map(id => chainMap[id])
      .filter(Boolean)
      .map(c => ({
        id: c.id,
        name: c.name,
        icon: (c as any).logoURI || '',
        nativeCurrency: c.nativeToken?.symbol || 'ETH',
      }))

    // Add Telos manually if not in LiFi
    if (!chainMap[TELOS_CHAIN_ID]) {
      infos.unshift({ id: 40, name: 'Telos', icon: '', nativeCurrency: 'TLOS' })
    }

    setDynamicChains(infos)
    inited = true
  } catch (e) {
    console.error('LiFi init failed:', e)
  }
}

export function isChainAvailable(chainId: number): boolean {
  return !!chainMap[chainId]
}

export function getTelosTokens(): string[] {
  return telosTokenSymbols
}

export async function getTokensForChain(chainId: number): Promise<string[]> {
  if (!inited) await initLiFi()
  const { dynamicTokensByChain } = await import('./chains')
  const list = dynamicTokensByChain[chainId] || []

  // Only show tokens that Telos also supports
  const telosSet = new Set(telosTokenSymbols.map(s => s.toUpperCase()))
  const result: string[] = []
  const seen = new Set<string>()
  const priority = ['USDC', 'USDT', 'ETH', 'WETH', 'WBTC', 'TLOS']

  for (const sym of priority) {
    if (telosSet.has(sym) && list.some((t: any) => t.symbol.toUpperCase() === sym) && !seen.has(sym)) {
      result.push(sym)
      seen.add(sym)
    }
  }
  for (const t of list) {
    const s = t.symbol.toUpperCase()
    if (telosSet.has(s) && !seen.has(s)) {
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
    return list.find((t: any) => t.symbol.toUpperCase() === symbol.toUpperCase()) ||
      (symbol === 'ETH' ? list.find((t: any) => t.symbol === 'WETH') : null)
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
