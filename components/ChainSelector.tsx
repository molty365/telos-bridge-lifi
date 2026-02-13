'use client'

interface Chain {
  id: number
  name: string
  icon?: string
}

interface ChainSelectorProps {
  label: string
  selectedChainId: number
  chains: Chain[]
  onChainChange: (chainId: number) => void
  color?: string
}

const CHAIN_COLORS: Record<number, string> = {
  1: '#627EEA', 40: '#00F2FE', 8453: '#0052FF', 56: '#F0B90B',
  42161: '#28A0F0', 137: '#8247E5', 43114: '#E84142', 10: '#FF0420',
}

export function ChainSelector({ 
  label, 
  selectedChainId, 
  chains, 
  onChainChange,
  color 
}: ChainSelectorProps) {
  const chainColor = color || CHAIN_COLORS[selectedChainId] || '#666'
  const chainIcon = chains.find(c => c.id === selectedChainId)?.icon

  return (
    <div className="flex-1 min-w-0 bg-[#1a1a28] rounded-xl p-3 sm:p-4 hover:bg-[#1e1e30] hover:ring-1 hover:ring-gray-600/20 transition-all duration-200 group cursor-pointer">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 group-hover:text-gray-400 transition-colors">
        {label}
      </p>
      
      <div className="flex items-center gap-2 sm:gap-3">
        <div 
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg overflow-hidden flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200"
          style={{ background: `${chainColor}25` }}
        >
          {chainIcon && (
            <img 
              src={chainIcon} 
              alt="" 
              className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform duration-200" 
            />
          )}
        </div>
        
        <select 
          value={selectedChainId} 
          onChange={e => onChainChange(Number(e.target.value))}
          className="bg-transparent text-white font-semibold text-sm sm:text-base outline-none cursor-pointer flex-1 min-w-0 truncate group-hover:text-gray-200"
        >
          {chains.map(chain => (
            <option key={chain.id} value={chain.id}>
              {chain.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}