'use client'

import { useAnimation } from './AnimationProvider'

export type TransactionStep = 'idle' | 'submitted' | 'confirming' | 'bridging' | 'completed'

interface TransactionStepperProps {
  currentStep: TransactionStep
  txHash?: string
  fromChainId?: number
  toChainId?: number
  estimatedTime?: string
}

interface StepConfig {
  id: TransactionStep
  label: string
  description: string
  icon: string
}

const STEPS: StepConfig[] = [
  {
    id: 'submitted',
    label: 'Submitted',
    description: 'Transaction sent to network',
    icon: '📝'
  },
  {
    id: 'confirming',
    label: 'Confirming',
    description: 'Waiting for block confirmations',
    icon: '⏳'
  },
  {
    id: 'bridging',
    label: 'Bridging',
    description: 'Cross-chain message relaying',
    icon: '🌉'
  },
  {
    id: 'completed',
    label: 'Complete',
    description: 'Funds received successfully',
    icon: '✅'
  }
]

export function TransactionStepper({
  currentStep,
  txHash,
  fromChainId,
  toChainId,
  estimatedTime = '~2 min'
}: TransactionStepperProps) {
  const { reduceMotion } = useAnimation()

  if (currentStep === 'idle') {
    return null
  }

  const currentStepIndex = STEPS.findIndex(step => step.id === currentStep)
  const isCompleted = currentStep === 'completed'

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStepIndex) return 'completed'
    if (stepIndex === currentStepIndex) return 'current'
    return 'pending'
  }

  return (
    <div className={`bg-gradient-to-br from-purple-500/[0.03] via-[#1a1a28] to-telos-cyan/[0.02] rounded-xl p-5 border border-purple-500/10 space-y-4 ${
      reduceMotion ? '' : 'animate-in slide-in-from-bottom-3 fade-in duration-600'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
          <span className="text-sm text-gray-400">Transaction Progress</span>
        </div>
        <div className="text-xs text-gray-500">{estimatedTime} remaining</div>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="absolute top-5 left-6 right-6 h-0.5 bg-gray-800">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-telos-cyan transition-all duration-1000 ease-out"
            style={{ 
              width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` 
            }}
          />
        </div>

        {/* Steps */}
        <div className="flex justify-between">
          {STEPS.map((step, index) => {
            const status = getStepStatus(index)
            const isCurrent = status === 'current'
            const isCompleted = status === 'completed'

            return (
              <div key={step.id} className="flex flex-col items-center space-y-2">
                {/* Step Icon */}
                <div className={`relative w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm transition-all duration-500 ${
                  isCompleted 
                    ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400' 
                    : isCurrent 
                      ? 'border-telos-cyan bg-telos-cyan/10 text-telos-cyan animate-pulse' 
                      : 'border-gray-600 bg-gray-800/50 text-gray-500'
                } ${!reduceMotion && isCurrent ? 'animate-pulse' : ''}`}>
                  {step.icon}
                  
                  {/* Animated ring for current step */}
                  {isCurrent && !reduceMotion && (
                    <div className="absolute inset-0 rounded-full border-2 border-telos-cyan animate-ping opacity-30" />
                  )}
                </div>

                {/* Step Label */}
                <div className="text-center">
                  <div className={`text-xs font-medium transition-colors duration-300 ${
                    isCompleted 
                      ? 'text-emerald-400' 
                      : isCurrent 
                        ? 'text-telos-cyan' 
                        : 'text-gray-500'
                  }`}>
                    {step.label}
                  </div>
                  <div className="text-[10px] text-gray-600 max-w-20 leading-tight">
                    {step.description}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Transaction Hash */}
      {txHash && (
        <div className={`pt-2 border-t border-white/[0.03] ${
          reduceMotion ? '' : 'animate-in fade-in delay-300 duration-400'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Transaction</span>
            <a 
              href={getExplorerUrl(fromChainId, txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-telos-cyan hover:text-telos-cyan/80 font-mono transition-colors"
            >
              {txHash.slice(0, 6)}...{txHash.slice(-4)} ↗
            </a>
          </div>
        </div>
      )}

      {/* Success State */}
      {isCompleted && (
        <div className={`bg-emerald-400/5 border border-emerald-400/10 rounded-lg p-3 text-center ${
          reduceMotion ? '' : 'animate-in zoom-in-95 fade-in delay-500 duration-500'
        }`}>
          <div className="text-emerald-400 text-sm font-medium">
            🎉 Bridge completed successfully!
          </div>
          <div className="text-emerald-400/70 text-xs mt-1">
            Funds should appear in your wallet shortly
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to get block explorer URL
function getExplorerUrl(chainId: number | undefined, txHash: string): string {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io',
    40: 'https://teloscan.io',
    8453: 'https://basescan.org',
    137: 'https://polygonscan.com',
    42161: 'https://arbiscan.io',
    10: 'https://optimistic.etherscan.io',
    43114: 'https://snowtrace.io',
  }

  const baseUrl = explorers[chainId || 40] || 'https://teloscan.io'
  return `${baseUrl}/tx/${txHash}`
}