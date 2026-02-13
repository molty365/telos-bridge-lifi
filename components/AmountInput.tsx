'use client'

interface AmountInputProps {
  amount: string
  onAmountChange: (value: string) => void
  token: string
  balance: any
  insufficientBalance: boolean
  onMax: () => void
  onHalf: () => void
  onQuarter: () => void
}

export function AmountInput({ 
  amount, 
  onAmountChange, 
  token, 
  balance, 
  insufficientBalance, 
  onMax, 
  onHalf,
  onQuarter
}: AmountInputProps) {
  const quickAmounts = [
    { label: '25%', action: onQuarter },
    { label: '50%', action: onHalf },
    { label: 'MAX', action: onMax, highlight: true }
  ]

  return (
    <div className="bg-[#1a1a28] rounded-xl p-5 space-y-3 focus-within:ring-1 focus-within:ring-telos-cyan/30 transition-all duration-200 group">
      {/* Amount input */}
      <div className="flex items-center justify-between">
        <input 
          type="number" 
          inputMode="decimal" 
          placeholder="0.00" 
          value={amount}
          onChange={e => onAmountChange(e.target.value)}
          className={`flex-1 bg-transparent text-2xl sm:text-3xl font-light ${
            insufficientBalance ? 'text-red-400' : 'text-white'
          } outline-none placeholder-gray-500 min-w-0 tabular-nums transition-colors`}
        />
      </div>

      {/* Balance and quick amounts */}
      {balance && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 18v1c0 1.1-.9 2-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14c1.1 0 2 .9 2 2v1h-9a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h9z"/>
              <path d="M12 16h10V8H12v8zm2-4a2 2 0 1 1 4 0 2 2 0 0 1-4 0z"/>
            </svg>
            <span className={insufficientBalance ? 'text-red-400' : 'text-gray-500'}>
              {parseFloat(balance.formatted).toFixed(4)} {token} available
            </span>
          </div>
          
          <div className="flex gap-1.5">
            {quickAmounts.map(({ label, action, highlight }) => (
              <button 
                key={label}
                onClick={action} 
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all duration-200 ${
                  highlight
                    ? 'text-telos-cyan bg-telos-cyan/10 border border-telos-cyan/30 hover:bg-telos-cyan/15 hover:border-telos-cyan/50'
                    : 'text-gray-500 bg-white/[0.03] hover:text-gray-300 hover:bg-white/[0.08] border border-transparent hover:border-gray-600/30'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}