// Static fallback list — overridden at runtime by LiFi's actual chain/token list
export const PRIORITY_CHAINS = [40, 1, 8453, 56, 42161, 137, 43114, 10] // Telos first

export interface ChainInfo {
  id: number
  name: string
  icon: string
  nativeCurrency: string
}

// Will be populated dynamically from LiFi
export let dynamicChains: ChainInfo[] = []
export let dynamicTokensByChain: Record<number, Array<{ symbol: string; address: string; decimals: number; logoURI?: string; name?: string }>> = {}

export function setDynamicChains(chains: ChainInfo[]) {
  // Sort: priority chains first, then alphabetical
  const priority = new Map(PRIORITY_CHAINS.map((id, i) => [id, i]))
  dynamicChains = chains.sort((a, b) => {
    const pa = priority.get(a.id) ?? 999
    const pb = priority.get(b.id) ?? 999
    if (pa !== pb) return pa - pb
    return a.name.localeCompare(b.name)
  })
}

export function setDynamicTokens(tokens: Record<number, any[]>) {
  dynamicTokensByChain = tokens
}
