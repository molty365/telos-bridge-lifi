'use client'

import React from 'react'
import { useAnimation } from './AnimationProvider'

export type TransactionStep = 'idle' | 'submitted' | 'confirming' | 'bridging' | 'completed'

interface TransactionStepperProps {
  currentStep: TransactionStep
  txHash?: string
  fromChainId?: number
  toChainId?: number
  estimatedTime?: string
}

// Clean modern SVG icons
const SubmittedIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
)

const ConfirmingIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
)

const BridgingIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/>
    <path d="M12 5l7 7-7 7"/>
  </svg>
)

const CompletedIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

interface StepConfig {
  id: TransactionStep
  label: string
  description: string
  Icon: () => React.ReactElement
}

const STEPS: StepConfig[] = [
  {
    id: 'submitted',
    label: 'Submitted',
    description: 'Transaction sent to network',
    Icon: SubmittedIcon,
  },
  {
    id: 'confirming',
    label: 'Confirming',
    description: 'Waiting for block confirmations',
    Icon: ConfirmingIcon,
  },
  {
    id: 'bridging',
    label: 'Bridging',
    description: 'Cross-chain message relaying',
    Icon: BridgingIcon,
  },
  {
    id: 'completed',
    label: 'Complete',
    description: 'Funds received successfully',
    Icon: CompletedIcon,
  },
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
    if (isCompleted) return 'completed' // All steps green when bridge is done
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
        {!isCompleted && <div className="text-xs text-gray-500">{estimatedTime} remaining</div>}
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="absolute top-5 left-6 right-6 h-0.5 bg-gray-800">
          <div 
            className={`h-full transition-all duration-1000 ease-out ${
              isCompleted 
                ? 'bg-emerald-400' 
                : 'bg-gradient-to-r from-purple-500 to-telos-cyan'
            }`}
            style={{ 
              width: isCompleted ? '100%' : `${((currentStepIndex + 1) / STEPS.length) * 100}%` 
            }}
          />
        </div>

        {/* Steps */}
        <div className="flex justify-between">
          {STEPS.map((step, index) => {
            const status = getStepStatus(index)
            const isCurrent = status === 'current'
            const isCompleted = status === 'completed'
            const { Icon } = step

            return (
              <div key={step.id} className="flex flex-col items-center space-y-2">
                {/* Step Icon */}
                <div className={`relative w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                  isCompleted 
                    ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400' 
                    : isCurrent 
                      ? 'border-telos-cyan bg-telos-cyan/10 text-telos-cyan' 
                      : 'border-gray-700 bg-gray-800/50 text-gray-600'
                }`}>
                  <Icon />
                  
                  {/* Animated ring for current step */}
                  {isCurrent && !reduceMotion && (
                    <div className="absolute inset-0 rounded-full border border-telos-cyan/30" />
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

      {/* Transaction Links */}
      {txHash && (
        <div className={`pt-2 border-t border-white/[0.03] space-y-1.5 ${
          reduceMotion ? '' : 'animate-in fade-in delay-300 duration-400'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Source tx</span>
            <a 
              href={getExplorerUrl(fromChainId, txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-telos-cyan hover:text-telos-cyan/70 transition-colors"
            >
              tx link ↗
            </a>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">LayerZero</span>
            <a 
              href={`https://layerzeroscan.com/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              Track on LZScan ↗
            </a>
          </div>
        </div>
      )}

      {/* Success State */}
      {isCompleted && (
        <div className={`bg-emerald-400/5 border border-emerald-400/10 rounded-lg p-3 text-center ${
          reduceMotion ? '' : 'animate-in fade-in delay-300 duration-400'
        }`}>
          <div className="text-emerald-400 text-sm font-medium">
            Bridge completed
          </div>
          <div className="text-emerald-400/60 text-xs mt-0.5">
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