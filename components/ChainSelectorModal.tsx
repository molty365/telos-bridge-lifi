'use client'

import { useState } from 'react'
import { MobileModal, MobileInput, MobileButton } from './MobileOptimizations'

interface Chain {
  id: number
  name: string
  icon?: string
}

interface ChainSelectorModalProps {
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

export function ChainSelectorModal({ 
  label, 
  selectedChainId, 
  chains, 
  onChainChange,
  color 
}: ChainSelectorModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const chainColor = color || CHAIN_COLORS[selectedChainId] || '#666'
  const selectedChain = chains.find(c => c.id === selectedChainId)
  
  const filteredChains = chains.filter(chain =>
    chain.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleChainSelect = (chainId: number) => {
    onChainChange(chainId)
    setIsOpen(false)
    setSearchQuery('')
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex-1 min-w-0 bg-[#1a1a28] rounded-xl p-3 sm:p-4 hover:bg-[#1e1e30] hover:ring-1 hover:ring-gray-600/20 transition-all duration-200 group text-left"
      >
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 group-hover:text-gray-400 transition-colors">
          {label}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div 
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg overflow-hidden flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200"
              style={{ background: `${chainColor}25` }}
            >
              {selectedChain?.icon && (
                <img 
                  src={selectedChain.icon} 
                  alt="" 
                  className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform duration-200" 
                />
              )}
            </div>
            
            <span className="text-white font-semibold text-sm sm:text-base truncate group-hover:text-gray-200 transition-colors">
              {selectedChain?.name}
            </span>
          </div>
          
          {/* Chevron */}
          <svg 
            className="w-4 h-4 text-gray-500 group-hover:text-gray-400 transition-all duration-200 group-hover:translate-x-0.5"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#12121a] border-0 sm:border border-gray-800/50 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 w-full sm:max-w-md max-h-[85vh] sm:max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Select {label}</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-800/50 hover:bg-gray-700/50 flex items-center justify-center text-gray-400 hover:text-white transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4 sm:mb-6">
              <svg 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search chains..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1a1a28] border border-gray-700/50 rounded-xl pl-10 pr-4 py-3.5 sm:py-3 text-base sm:text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-telos-cyan/50 focus:border-telos-cyan/50 outline-none transition-all"
              />
            </div>

            {/* Chain Grid */}
            <div className="flex-1 overflow-auto">
              {filteredChains.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                      <circle cx="11" cy="11" r="8"/>
                      <path d="m21 21-4.35-4.35"/>
                    </svg>
                  </div>
                  <p className="text-gray-500">No chains found</p>
                  <p className="text-sm text-gray-600">Try adjusting your search</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:gap-3">
                  {filteredChains.map(chain => {
                    const isSelected = chain.id === selectedChainId
                    const chainBrandColor = CHAIN_COLORS[chain.id] || '#666'
                    
                    return (
                      <button
                        key={chain.id}
                        onClick={() => handleChainSelect(chain.id)}
                        className={`p-4 sm:p-4 rounded-xl border transition-all duration-200 text-left group active:scale-98 ${
                          isSelected 
                            ? 'bg-telos-cyan/10 border-telos-cyan/50 ring-2 ring-telos-cyan/30' 
                            : 'bg-[#1a1a28] border-gray-700/30 hover:border-gray-600/50 hover:bg-[#1e1e30] active:bg-[#1e1e30]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200"
                            style={{ background: `${chainBrandColor}20` }}
                          >
                            {chain.icon && (
                              <img 
                                src={chain.icon} 
                                alt={chain.name}
                                className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" 
                              />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className={`font-semibold transition-colors ${
                                isSelected ? 'text-telos-cyan' : 'text-white group-hover:text-gray-200'
                              }`}>
                                {chain.name}
                              </span>
                              {isSelected && (
                                <svg className="w-5 h-5 text-telos-cyan" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 truncate">
                              Chain ID: {chain.id}
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-gray-700/50">
              <p className="text-xs text-gray-500 text-center">
                {filteredChains.length} chain{filteredChains.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}