'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'

export function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
      <div className="flex items-center gap-3">
        <img src="/telos-bridge-lifi/telos-logo.png" alt="Telos" className="w-8 h-8 rounded-full" />
        <h1 className="text-xl font-bold bg-gradient-to-r from-telos-cyan to-telos-blue bg-clip-text text-transparent">
          Telos Bridge
        </h1>
        <span className="text-xs px-2 py-0.5 rounded bg-telos-cyan/10 text-telos-cyan border border-telos-cyan/20">
          powered by LiFi
        </span>
      </div>
      <ConnectButton />
    </header>
  )
}
