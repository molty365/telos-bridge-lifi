'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { TOKEN_ICONS } from '@/lib/constants'

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export function Header() {
  return (
    <header className="relative z-10 flex items-center justify-between px-5 sm:px-6 py-3 sm:py-5 max-w-[560px] mx-auto w-full border-b border-white/[0.04] backdrop-blur-sm">
      <div className="flex items-center gap-2 sm:gap-3">
        <img src={`${BASE_PATH}/telos-logo.svg`} alt="Telos" className="w-7 h-7 sm:w-9 sm:h-9" />
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Telos <span className="bg-gradient-to-r from-telos-cyan to-telos-blue bg-clip-text text-transparent">Bridge</span>
          </h1>
          <p className="text-[9px] sm:text-[10px] text-gray-500 -mt-0.5 hidden sm:block">Cross-Chain Transfers</p>
        </div>
      </div>
      <div className="scale-90 sm:scale-100 origin-right">
        <ConnectButton.Custom>
          {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
            const connected = mounted && account && chain
            return (
              <div className="flex items-center gap-2">
                {connected ? (
                  <>
                    <button
                      onClick={openChainModal}
                      className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black border border-gray-800 hover:border-gray-600 text-sm text-white transition-all"
                    >
                      {chain.hasIcon && chain.iconUrl && (
                        <img src={chain.iconUrl} alt={chain.name} className="w-4 h-4 rounded-full" />
                      )}
                      <span>{chain.name}</span>
                    </button>
                    <button
                      onClick={openAccountModal}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black border border-gray-800 hover:border-gray-600 text-sm text-white transition-all"
                    >
                      <span>{account.displayBalance ?? ''}</span>
                      <span className="text-gray-400">{account.displayName}</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={openConnectModal}
                    className="px-4 py-2 rounded-xl bg-black border border-gray-700 hover:border-telos-cyan/50 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-telos-cyan/10"
                  >
                    Connect Wallet
                  </button>
                )}
              </div>
            )
          }}
        </ConnectButton.Custom>
      </div>
    </header>
  )
}
