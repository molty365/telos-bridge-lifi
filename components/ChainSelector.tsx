'use client'

import { useState, useRef, useEffect } from 'react'

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
  534352: '#FFEEDA', 5000: '#000', 59144: '#61DFFF', 1329: '#9B1C2E',
  2222: '#FF564F', 8217: '#BFF009', 1088: '#00DACC', 1313161554: '#78D64B',
  100: '#04795B', 1116: '#FF9211', 167000: '#E81899', 169: '#1D8AED', 30: '#FF9931',
}

export function ChainSelector({ 
  label, 
  selectedChainId, 
  chains, 
  onChainChange,
  color 
}: ChainSelectorProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const chainColor = color || CHAIN_COLORS[selectedChainId] || '#666'
  const selected = chains.find(c => c.id === selectedChainId)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="flex-1 min-w-0 relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full bg-[#1a1a28] rounded-xl p-3 sm:p-4 hover:bg-[#1e1e30] hover:ring-1 hover:ring-gray-600/20 transition-all duration-200 group text-left"
      >
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 group-hover:text-gray-400 transition-colors">
          {label}
        </p>
        <div className="flex items-center gap-2 sm:gap-3">
          <div 
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg overflow-hidden flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200"
            style={{ background: `${chainColor}25` }}
          >
            {selected?.icon && (
              <img src={selected.icon} alt="" className="w-5 h-5 sm:w-6 sm:h-6" />
            )}
          </div>
          <span className="text-white font-semibold text-sm sm:text-base truncate flex-1">{selected?.name || 'Select'}</span>
          <svg className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none">
            <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#14141e] border border-gray-700/40 rounded-xl p-3 z-50 shadow-2xl shadow-black/60 animate-in fade-in slide-in-from-top-2 duration-150 min-w-[200px]">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 px-1">Select {label.toLowerCase()} chain</p>
          <div className="grid grid-cols-3 gap-1.5 max-h-[280px] overflow-y-auto">
            {chains.map(chain => {
              const cc = CHAIN_COLORS[chain.id] || '#666'
              const isSelected = chain.id === selectedChainId
              return (
                <button
                  key={chain.id}
                  onClick={() => { onChainChange(chain.id); setOpen(false) }}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg transition-all duration-150 ${
                    isSelected 
                      ? 'bg-telos-cyan/10 ring-1 ring-telos-cyan/30' 
                      : 'hover:bg-white/[0.04] hover:ring-1 hover:ring-gray-600/20'
                  }`}
                >
                  <div 
                    className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center"
                    style={{ background: `${cc}20` }}
                  >
                    {chain.icon && <img src={chain.icon} alt="" className="w-5 h-5" />}
                  </div>
                  <span className={`text-[10px] leading-tight text-center truncate w-full ${isSelected ? 'text-telos-cyan font-medium' : 'text-gray-400'}`}>
                    {chain.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
