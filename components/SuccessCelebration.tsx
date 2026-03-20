'use client'

import { useEffect } from 'react'
import { useAnimation } from './AnimationProvider'

interface SuccessCelebrationProps {
  isVisible: boolean
  onComplete?: () => void
}

export function SuccessCelebration({ isVisible, onComplete }: SuccessCelebrationProps) {
  const { reduceMotion } = useAnimation()

  useEffect(() => {
    if (isVisible) {
      const timeout = setTimeout(() => {
        onComplete?.()
      }, 2500)
      return () => clearTimeout(timeout)
    }
  }, [isVisible, onComplete])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      <div className={`bg-[#12121a]/90 backdrop-blur-xl border border-emerald-400/25 rounded-2xl px-8 py-5 shadow-2xl shadow-emerald-500/10 ${
        reduceMotion ? '' : 'animate-in zoom-in-95 fade-in duration-400'
      }`}>
        <div className="flex items-center gap-4">
          {/* Clean checkmark circle */}
          <div className="w-10 h-10 rounded-full bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <div className="text-white font-semibold text-base">Bridge complete</div>
            <div className="text-gray-400 text-sm mt-0.5">Funds arriving in your wallet shortly</div>
          </div>
        </div>
      </div>
    </div>
  )
}
