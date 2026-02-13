'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'

export function Header() {
  return (
    <header className="relative z-10 flex items-center justify-between px-3 sm:px-6 py-3 sm:py-5 max-w-3xl mx-auto w-full border-b border-white/[0.04] backdrop-blur-sm">
      <div className="flex items-center gap-2 sm:gap-3">
        <img src="/telos-bridge-lifi/telos-logo.svg" alt="Telos" className="w-7 h-7 sm:w-9 sm:h-9" />
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Telos <span className="bg-gradient-to-r from-telos-cyan to-telos-blue bg-clip-text text-transparent">Bridge</span>
          </h1>
          <p className="text-[9px] sm:text-[10px] text-gray-500 -mt-0.5 hidden sm:block">LayerZero OFT</p>
        </div>
      </div>
      <div className="scale-90 sm:scale-100 origin-right">
        <ConnectButton />
      </div>
    </header>
  )
}
