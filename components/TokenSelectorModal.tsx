'use client'

import { useState } from 'react'

interface TokenSelectorModalProps {
  selectedToken: string
  tokens: string[]
  onTokenChange: (token: string) => void
}

const TOKEN_LOGOS: Record<string, string> = {
  TLOS: '/telos-bridge-lifi/tokens/TLOS.svg',
  USDC: '/telos-bridge-lifi/tokens/USDC.png',
  USDT: '/telos-bridge-lifi/tokens/USDT.png',
  ETH: '/telos-bridge-lifi/tokens/ETH.png',
  WBTC: '/telos-bridge-lifi/tokens/WBTC.png',
  MST: '/telos-bridge-lifi/tokens/MST.svg',
}

const TOKEN_INFO: Record<string, { name: string; description: string; category: string }> = {
  TLOS: { name: 'Telos', description: 'Native token of Telos EVM', category: 'Native' },
  USDC: { name: 'USD Coin', description: 'Stablecoin by Centre', category: 'Stablecoin' },
  USDT: { name: 'Tether USD', description: 'Stablecoin by Tether', category: 'Stablecoin' },
  ETH: { name: 'Ethereum', description: 'Native Ethereum token', category: 'Native' },
  WBTC: { name: 'Wrapped Bitcoin', description: 'Bitcoin on Ethereum', category: 'Wrapped' },
  MST: { name: 'Monster Token', description: 'Gaming token on Telos', category: 'Gaming' },
}

const TOKEN_COLORS: Record<string, string> = {
  TLOS: '#00F2FE',
  USDC: '#2775CA',
  USDT: '#26A17B', 
  ETH: '#627EEA',
  WBTC: '#F7931A',
  MST: '#8B5CF6',
}

export function TokenSelectorModal({ selectedToken, tokens, onTokenChange }: TokenSelectorModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const filteredTokens = tokens.filter(token => {
    const info = TOKEN_INFO[token]
    const searchLower = searchQuery.toLowerCase()
    return token.toLowerCase().includes(searchLower) ||
           info?.name.toLowerCase().includes(searchLower) ||
           info?.description.toLowerCase().includes(searchLower)
  })

  // Group tokens by category
  const groupedTokens = filteredTokens.reduce((acc, token) => {
    const category = TOKEN_INFO[token]?.category || 'Other'
    if (!acc[category]) acc[category] = []
    acc[category].push(token)
    return acc
  }, {} as Record<string, string[]>)

  const handleTokenSelect = (token: string) => {
    onTokenChange(token)
    setIsOpen(false)
    setSearchQuery('')
  }

  if (tokens.length === 1) {
    // Single token, no modal needed
    return (
      <div className="flex items-center gap-2.5 bg-gradient-to-br from-[#252535] to-[#1e1e2e] border border-gray-700/50 rounded-xl px-4 py-3">
        {TOKEN_LOGOS[selectedToken] && (
          <img 
            src={TOKEN_LOGOS[selectedToken]} 
            alt={selectedToken} 
            className="w-6 h-6 rounded-full" 
          />
        )}
        <span className="text-base font-semibold text-white">{selectedToken}</span>
      </div>
    )
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2.5 bg-gradient-to-br from-[#252535] to-[#1e1e2e] border border-gray-700/50 rounded-xl px-4 py-3 hover:border-gray-600/70 transition-all duration-200 group"
      >
        {TOKEN_LOGOS[selectedToken] && (
          <img 
            src={TOKEN_LOGOS[selectedToken]} 
            alt={selectedToken} 
            className="w-6 h-6 rounded-full group-hover:scale-110 transition-transform duration-200" 
          />
        )}
        
        <span className="text-base font-semibold text-white group-hover:text-gray-200 transition-colors">
          {selectedToken}
        </span>
        
        <svg 
          className="w-3.5 h-3.5 text-gray-500 group-hover:text-gray-400 transition-all duration-200 group-hover:rotate-180" 
          viewBox="0 0 12 12" 
          fill="none"
        >
          <path 
            d="M3 5l3 3 3-3" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#12121a] border-0 sm:border border-gray-800/50 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 w-full sm:max-w-md max-h-[85vh] sm:max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Select Token</h3>
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
            <div className="relative mb-6">
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
                placeholder="Search tokens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1a1a28] border border-gray-700/50 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-telos-cyan/50 focus:border-telos-cyan/50 outline-none transition-all"
              />
            </div>

            {/* Token List */}
            <div className="flex-1 overflow-auto">
              {filteredTokens.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                      <circle cx="11" cy="11" r="8"/>
                      <path d="m21 21-4.35-4.35"/>
                    </svg>
                  </div>
                  <p className="text-gray-500">No tokens found</p>
                  <p className="text-sm text-gray-600">Try adjusting your search</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedTokens).map(([category, categoryTokens]) => (
                    <div key={category}>
                      <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3 px-2">{category}</h4>
                      <div className="space-y-2">
                        {categoryTokens.map(token => {
                          const isSelected = token === selectedToken
                          const info = TOKEN_INFO[token]
                          const brandColor = TOKEN_COLORS[token] || '#666'
                          
                          return (
                            <button
                              key={token}
                              onClick={() => handleTokenSelect(token)}
                              className={`w-full p-3 rounded-xl border transition-all duration-200 text-left group ${
                                isSelected 
                                  ? 'bg-telos-cyan/10 border-telos-cyan/50 ring-2 ring-telos-cyan/30' 
                                  : 'bg-[#1a1a28] border-gray-700/30 hover:border-gray-600/50 hover:bg-[#1e1e30]'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200"
                                  style={{ background: `${brandColor}15` }}
                                >
                                  {TOKEN_LOGOS[token] && (
                                    <img 
                                      src={TOKEN_LOGOS[token]} 
                                      alt={token}
                                      className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" 
                                    />
                                  )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className={`font-semibold transition-colors ${
                                          isSelected ? 'text-telos-cyan' : 'text-white group-hover:text-gray-200'
                                        }`}>
                                          {token}
                                        </span>
                                        {isSelected && (
                                          <svg className="w-4 h-4 text-telos-cyan" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                          </svg>
                                        )}
                                      </div>
                                      {info && (
                                        <>
                                          <p className="text-sm text-gray-400">{info.name}</p>
                                          <p className="text-xs text-gray-600 truncate">{info.description}</p>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-gray-700/50">
              <p className="text-xs text-gray-500 text-center">
                {filteredTokens.length} token{filteredTokens.length !== 1 ? 's' : ''} available on this route
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}