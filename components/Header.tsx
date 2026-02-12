'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'

export function Header() {
  return (
    <header className="relative z-10 flex items-center justify-between px-5 sm:px-8 py-4 max-w-2xl mx-auto w-full">
      <div className="flex items-center gap-2.5">
        <img src="/telos-bridge-lifi/telos-logo.png" alt="Telos"
          className="w-8 h-8 drop-shadow-[0_0_8px_rgba(0,242,254,0.3)]" />
        <div className="leading-tight">
          <h1 className="text-base font-bold text-white tracking-tight">Telos Bridge</h1>
          <p className="text-[9px] text-gray-500 font-medium tracking-wide uppercase">Cross-chain · LiFi + LayerZero</p>
        </div>
      </div>
      <ConnectButton chainStatus="icon" showBalance={false} accountStatus="avatar" />
    </header>
  )
}
