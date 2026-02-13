'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'

export function Header() {
  return (
    <header className="relative z-10 flex items-center justify-between px-6 py-5 max-w-3xl mx-auto w-full border-b border-white/[0.04] backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <img src="/telos-bridge-lifi/telos-logo.svg" alt="Telos" className="w-9 h-9" />
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Telos <span className="bg-gradient-to-r from-telos-cyan to-telos-blue bg-clip-text text-transparent">Bridge</span></h1>
          <p className="text-[10px] text-gray-500 -mt-0.5">LayerZero OFT</p>
        </div>
      </div>
      <ConnectButton />
    </header>
  )
}
