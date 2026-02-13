'use client'

interface TokenSelectorProps {
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

export function TokenSelector({ selectedToken, tokens, onTokenChange }: TokenSelectorProps) {
  return (
    <div className="flex items-center gap-2.5 bg-gradient-to-br from-[#252535] to-[#1e1e2e] border border-gray-700/50 rounded-xl px-4 py-3 ml-4 relative hover:border-gray-600/70 transition-all duration-200 group">
      {TOKEN_LOGOS[selectedToken] && (
        <img 
          src={TOKEN_LOGOS[selectedToken]} 
          alt={selectedToken} 
          className="w-6 h-6 rounded-full group-hover:scale-110 transition-transform duration-200" 
        />
      )}
      
      {tokens.length > 1 ? (
        <>
          <select 
            value={selectedToken} 
            onChange={e => onTokenChange(e.target.value)}
            className="bg-transparent text-base font-semibold outline-none cursor-pointer text-white appearance-none pr-5"
          >
            {tokens.map(token => (
              <option key={token} value={token}>
                {token}
              </option>
            ))}
          </select>
          <svg 
            className="w-3.5 h-3.5 text-gray-500 absolute right-3 group-hover:text-gray-400 transition-colors" 
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
        </>
      ) : (
        <span className="text-base font-semibold text-white">
          {selectedToken}
        </span>
      )}
    </div>
  )
}