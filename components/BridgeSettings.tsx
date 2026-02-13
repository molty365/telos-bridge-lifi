'use client'

interface BridgeSettingsProps {
  slippage: number
  onSlippageChange: (slippage: number) => void
  estimatedGas?: string
  gasPrice?: string
  showGasOptimization?: boolean
}

export function BridgeSettings({ 
  slippage, 
  onSlippageChange, 
  estimatedGas,
  gasPrice,
  showGasOptimization = false
}: BridgeSettingsProps) {
  const slippagePresets = [0.5, 1, 2, 3]
  
  return (
    <div className="bg-gradient-to-br from-[#0e0e18] to-[#1a1a28] rounded-xl p-4 space-y-4 border border-gray-800/50">
      {/* Slippage tolerance */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Slippage tolerance</p>
            <p className="text-[10px] text-gray-600">Maximum price movement before reverting</p>
          </div>
          <span className="text-xs text-telos-cyan bg-telos-cyan/10 px-2 py-1 rounded">{slippage}%</span>
        </div>
        
        <div className="flex gap-2">
          {slippagePresets.map(preset => (
            <button 
              key={preset}
              onClick={() => onSlippageChange(preset)}
              className={`flex-1 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                slippage === preset
                  ? 'bg-telos-cyan/15 text-telos-cyan border border-telos-cyan/30'
                  : 'text-gray-500 border border-gray-700/50 hover:text-gray-300 hover:border-gray-600/50'
              }`}
            >
              {preset}%
            </button>
          ))}
          
          <div className="relative">
            <input
              type="number"
              value={slippagePresets.includes(slippage) ? '' : slippage}
              onChange={e => e.target.value && onSlippageChange(parseFloat(e.target.value))}
              placeholder="Custom"
              className="w-20 px-3 py-2.5 bg-transparent border border-gray-700/50 rounded-lg text-xs text-white placeholder-gray-600 focus:border-telos-cyan/50 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Gas optimization (if available) */}
      {showGasOptimization && (
        <>
          <div className="border-t border-white/[0.03] pt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Gas optimization</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-[10px] text-emerald-400">LIVE</span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <button className="p-3 rounded-lg border border-gray-700/50 hover:border-telos-cyan/30 transition-all duration-200 text-left">
                <div className="text-xs text-gray-400 mb-1">Standard</div>
                <div className="text-xs text-white font-medium">{gasPrice || '~2'} gwei</div>
              </button>
              <button className="p-3 rounded-lg border border-telos-cyan/30 bg-telos-cyan/5 text-left">
                <div className="text-xs text-telos-cyan mb-1">⚡ Fast</div>
                <div className="text-xs text-white font-medium">{gasPrice ? `~${(parseFloat(gasPrice) * 1.2).toFixed(1)}` : '~2.4'} gwei</div>
              </button>
              <button className="p-3 rounded-lg border border-gray-700/50 hover:border-orange-400/30 transition-all duration-200 text-left">
                <div className="text-xs text-gray-400 mb-1">Instant</div>
                <div className="text-xs text-white font-medium">{gasPrice ? `~${(parseFloat(gasPrice) * 1.5).toFixed(1)}` : '~3'} gwei</div>
              </button>
            </div>
          </div>

          {/* MEV protection */}
          <div className="border-t border-white/[0.03] pt-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">MEV protection</p>
                <p className="text-[10px] text-gray-600">Protect against front-running</p>
              </div>
              <button className="relative inline-flex h-5 w-9 items-center rounded-full bg-telos-cyan/20 transition-colors focus:outline-none">
                <span className="inline-block h-3.5 w-3.5 translate-x-0.5 rounded-full bg-telos-cyan transition-transform" />
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* Estimated total */}
      {estimatedGas && (
        <div className="border-t border-white/[0.03] pt-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Estimated total cost</span>
            <span className="text-xs text-white font-medium font-mono">{estimatedGas}</span>
          </div>
        </div>
      )}
    </div>
  )
}