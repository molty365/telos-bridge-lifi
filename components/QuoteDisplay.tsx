'use client'

import { LoadingSpinner } from './LoadingSpinner'
import { useCountUp } from '@/hooks/useCountUp'
import { useAnimation } from './AnimationProvider'
import { useEffect, useState } from 'react'

interface QuoteDisplayProps {
  quoting: boolean
  amount: string
  token: string
  toChainName: string
  amountReceived?: string
  isStargate?: boolean
  nativeFee?: string
  feeCurrency?: string
  estimatedTime?: string
}

export function QuoteDisplay({ 
  quoting, 
  amount, 
  token, 
  toChainName,
  amountReceived,
  isStargate,
  nativeFee,
  feeCurrency,
  estimatedTime = "~2 min"
}: QuoteDisplayProps) {
  const { reduceMotion } = useAnimation()
  const [isVisible, setIsVisible] = useState(false)
  
  const displayAmount = amountReceived || amount
  const numericAmount = parseFloat(displayAmount) || 0
  
  const { formattedValue } = useCountUp({
    end: numericAmount,
    duration: reduceMotion ? 0 : 1000,
    decimals: token === 'USDC' || token === 'USDT' ? 2 : 4,
    preserveValue: false
  })

  const TOKEN_LOGOS: Record<string, string> = {
    TLOS: '/telos-bridge-lifi/tokens/TLOS.svg',
    USDC: '/telos-bridge-lifi/tokens/USDC.png',
    USDT: '/telos-bridge-lifi/tokens/USDT.png',
    ETH: '/telos-bridge-lifi/tokens/ETH.png',
    WBTC: '/telos-bridge-lifi/tokens/WBTC.png',
    MST: '/telos-bridge-lifi/tokens/MST.svg',
  }

  useEffect(() => {
    setIsVisible(true)
  }, [])

  if (quoting) {
    return (
      <div className={`bg-gradient-to-br from-telos-cyan/[0.02] via-[#1a1a28] to-emerald-500/[0.01] rounded-xl p-5 border border-telos-cyan/10 space-y-4 transition-all duration-500 ${reduceMotion ? '' : 'animate-in slide-in-from-bottom-3 fade-in'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LoadingSpinner size="sm" />
            <span className="text-sm text-gray-400">Finding best route...</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <div className="w-2 h-2 bg-telos-cyan rounded-full animate-pulse" />
            <span>Live pricing</span>
          </div>
        </div>
        
        {/* Animated skeleton */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-8 bg-gradient-to-r from-gray-700/50 via-gray-600/50 to-gray-700/50 rounded w-32 animate-pulse" />
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-gray-700/50 rounded-full animate-pulse" />
              <div className="h-4 w-20 bg-gray-700/50 rounded animate-pulse" />
            </div>
          </div>
          <div className="flex justify-between text-xs">
            <div className="h-3 w-16 bg-gray-700/50 rounded animate-pulse" />
            <div className="h-3 w-24 bg-gray-700/50 rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-gradient-to-br from-telos-cyan/[0.02] via-[#1a1a28] to-emerald-500/[0.01] rounded-xl p-5 border border-telos-cyan/10 space-y-4 group hover:border-telos-cyan/20 transition-all duration-500 hover:shadow-lg hover:shadow-telos-cyan/10 ${
      reduceMotion ? '' : 'animate-in slide-in-from-bottom-3 fade-in duration-700'
    } ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 uppercase tracking-wider">You receive</span>
          <div className={`flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full ${
            reduceMotion ? '' : 'animate-in zoom-in-75 delay-300 duration-300'
          }`}>
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
            Optimal route
          </div>
        </div>
        <div className="text-xs text-gray-500">{estimatedTime}</div>
      </div>

      {/* Amount with smooth counting animation */}
      <div className="flex items-center justify-between">
        <span className={`text-2xl sm:text-3xl font-light text-telos-cyan tabular-nums group-hover:scale-105 transition-all duration-300 ${
          reduceMotion ? '' : 'animate-in zoom-in-95 delay-200 duration-500'
        }`}>
          {reduceMotion ? (amountReceived || amount) : formattedValue}
        </span>
        <div className={`flex items-center gap-2 text-sm text-gray-400 font-medium ${
          reduceMotion ? '' : 'animate-in slide-in-from-right-2 delay-400 duration-400'
        }`}>
          {TOKEN_LOGOS[token] && <img src={TOKEN_LOGOS[token]} alt="" className="w-5 h-5 rounded-full" />}
          {token} on {toChainName}
        </div>
      </div>

      {/* Route details */}
      <div className={`space-y-2 pt-2 border-t border-white/[0.03] ${
        reduceMotion ? '' : 'animate-in fade-in-50 delay-500 duration-400'
      }`}>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500">Route</span>
          <div className="flex items-center gap-1.5">
            <span className="text-telos-cyan font-medium">
              ⚡ {isStargate ? 'Stargate (V2)' : 'LayerZero OFT'}
            </span>
            {isStargate && <span className="text-emerald-400 text-[10px] bg-emerald-400/10 px-1.5 py-0.5 rounded">FASTEST</span>}
          </div>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Rate</span>
          <span className="text-gray-300">{isStargate ? '~1:1 (minimal slippage)' : '1:1 — no slippage'}</span>
        </div>
        {nativeFee && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Network fee</span>
            <span className="text-gray-300 font-mono">{nativeFee} {feeCurrency}</span>
          </div>
        )}
      </div>
      
      {/* Confidence indicator */}
      <div className={`flex items-center gap-2 pt-1 ${
        reduceMotion ? '' : 'animate-in slide-in-from-bottom-1 delay-700 duration-500'
      }`}>
        <div className="flex-1 bg-gray-800/50 rounded-full h-1.5 overflow-hidden">
          <div className={`h-full bg-gradient-to-r from-telos-cyan to-emerald-400 rounded-full ${
            reduceMotion ? '' : 'animate-pulse'
          }`} style={{width: '85%'}} />
        </div>
        <span className="text-xs text-gray-500">85% savings vs alternatives</span>
      </div>
    </div>
  )
}