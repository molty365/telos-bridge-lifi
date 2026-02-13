'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount, useBalance, useSwitchChain, useWalletClient, usePublicClient } from 'wagmi'
import { SUPPORTED_CHAINS, CHAIN_MAP } from '@/lib/chains'
import { isTlosOftRoute, quoteOftSend, executeOftSend, isMstOftRoute, quoteMstSend, executeMstSend, getMstSupportedChains, TLOS_OFT_ADDRESSES, MST_OFT_ADDRESSES, type OftQuoteResult } from '@/lib/oft'
import { isOftV2Route, getAvailableOftV2Tokens, quoteOftV2Send, executeOftV2Send, OFT_V2_TOKENS, type OftV2QuoteResult } from '@/lib/oft-v2'
import { AmountInput } from './AmountInput'
import { ChainSelectorModal } from './ChainSelectorModal'
import { TokenSelectorModal } from './TokenSelectorModal'
import { LoadingSpinner, SkeletonLoader } from './LoadingSpinner'
import { QuoteDisplay } from './QuoteDisplay'
import { BridgeSettings } from './BridgeSettings'
import { ErrorDisplay, createError, type ErrorInfo } from './ErrorDisplay'

// Token logos for the "You receive" section
const TOKEN_LOGOS: Record<string, string> = {
  TLOS: '/telos-bridge-lifi/tokens/TLOS.svg',
  USDC: '/telos-bridge-lifi/tokens/USDC.png',
  USDT: '/telos-bridge-lifi/tokens/USDT.png',
  ETH: '/telos-bridge-lifi/tokens/ETH.png',
  WBTC: '/telos-bridge-lifi/tokens/WBTC.png',
  MST: '/telos-bridge-lifi/tokens/MST.svg',
}

export function BridgeForm() {
  const { address, chainId: walletChainId } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const { data: walletClient } = useWalletClient()
  const [fromChain, setFromChain] = useState(40)
  const [toChain, setToChain] = useState(8453)
  const [token, setToken] = useState('TLOS')
  const [amount, setAmount] = useState('')
  const [slippage, setSlippage] = useState(0.5)
  const [showSettings, setShowSettings] = useState(false)

  const [quoting, setQuoting] = useState(false)
  const [oftQuote, setOftQuote] = useState<OftQuoteResult | null>(null)
  const [v2Quote, setV2Quote] = useState<OftV2QuoteResult | null>(null)
  const [error, setError] = useState<ErrorInfo | null>(null)
  const [bridging, setBridging] = useState(false)
  const [bridgeStatus, setBridgeStatus] = useState<string | null>(null)
  const publicClient = usePublicClient({ chainId: fromChain })
  const quoteTimeout = useRef<NodeJS.Timeout | null>(null)

  const { data: nativeBalance } = useBalance({ address, chainId: fromChain })

  const isOft = isTlosOftRoute(fromChain, toChain, token, token)
  const isMst = isMstOftRoute(fromChain, toChain, token, token)
  const isV2 = !isOft && !isMst && isOftV2Route(token, fromChain, toChain)
  const hasQuote = !!(oftQuote || v2Quote)
  const wrongNetwork = address && walletChainId !== fromChain
  const displayBalance = nativeBalance // TODO: add ERC20 balance for WBTC/WETH

  const chainName = (id: number) => CHAIN_MAP.get(id)?.name || `Chain ${id}`
  const chainIcon = (id: number) => CHAIN_MAP.get(id)?.icon

  // Check for insufficient balance
  const insufficientBalance = !!(address && displayBalance && amount && parseFloat(amount) > parseFloat(displayBalance.formatted))

  // Get chains that support the selected token
  const getChainsForToken = useCallback((tok: string) => {
    const chainIds = new Set<number>()
    // TLOS V1 OFT chains
    if (tok === 'TLOS') {
      Object.keys(TLOS_OFT_ADDRESSES).forEach(id => chainIds.add(Number(id)))
    }
    // MST V1 OFT chains
    else if (tok === 'MST') {
      Object.keys(MST_OFT_ADDRESSES).forEach(id => chainIds.add(Number(id)))
    }
    // V2 OFT tokens: Telos + peer chains
    else if (OFT_V2_TOKENS[tok]) {
      chainIds.add(40) // Telos always
      Object.keys(OFT_V2_TOKENS[tok].peers).forEach(id => chainIds.add(Number(id)))
    }
    return SUPPORTED_CHAINS.filter(c => chainIds.has(c.id))
  }, [])

  const filteredChains = getChainsForToken(token)

  // Build token list: TLOS (always) + V2 OFT tokens available for this route
  const availableTokens = useCallback(() => {
    const tokens = ['TLOS']
    const mstChains = getMstSupportedChains()
    if (mstChains.includes(fromChain) && mstChains.includes(toChain)) {
      tokens.push('MST')
    }
    const v2tokens = getAvailableOftV2Tokens(fromChain, toChain)
    tokens.push(...v2tokens)
    return tokens
  }, [fromChain, toChain])

  const tokenList = availableTokens()

  // Reset token if not available on new route
  useEffect(() => {
    if (!tokenList.includes(token)) setToken('TLOS')
  }, [tokenList, token])

  // Reset chains if not valid for selected token
  useEffect(() => {
    const validIds = filteredChains.map(c => c.id)
    if (!validIds.includes(fromChain)) {
      setFromChain(validIds[0] || 40)
    }
    if (!validIds.includes(toChain) || toChain === fromChain) {
      const other = validIds.find(id => id !== fromChain)
      if (other) setToChain(other)
    }
  }, [token, filteredChains])

  const clearQuotes = () => { setOftQuote(null); setV2Quote(null); setError(null); setBridgeStatus(null) }

  const doQuote = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0 || !publicClient) return
    setQuoting(true); setError(null); setOftQuote(null); setV2Quote(null)
    try {
      if (isOft) {
        const oq = await quoteOftSend(publicClient, fromChain, toChain, amount,
          address || '0x0000000000000000000000000000000000000001' as `0x${string}`)
        setOftQuote(oq)
      } else if (isMst) {
        const mq = await quoteMstSend(publicClient, fromChain, toChain, amount,
          address || '0x0000000000000000000000000000000000000001' as `0x${string}`)
        setOftQuote(mq)
      } else if (isV2) {
        const vq = await quoteOftV2Send(publicClient, token, fromChain, toChain, amount,
          address || '0x0000000000000000000000000000000000000001' as `0x${string}`)
        setV2Quote(vq)
      } else {
        setError(createError('unsupported_route', `${token} cannot be bridged on this route`, 
          `No available bridge routes found for ${token} from ${chainName(fromChain)} to ${chainName(toChain)}`))
      }
    } catch (e: any) {
      const message = e.message || 'Failed to get quote'
      setError(createError('quote_failed', 'Unable to get bridge quote', message))
    } finally { setQuoting(false) }
  }, [fromChain, toChain, token, amount, address, publicClient, isOft, isMst, isV2])

  // Auto-quote with debounce
  useEffect(() => {
    if (quoteTimeout.current) clearTimeout(quoteTimeout.current)
    setOftQuote(null); setV2Quote(null)
    if (!amount || parseFloat(amount) <= 0) return
    quoteTimeout.current = setTimeout(() => doQuote(), 800)
    return () => { if (quoteTimeout.current) clearTimeout(quoteTimeout.current) }
  }, [amount, fromChain, toChain, token])

  const handleBridge = useCallback(async () => {
    if (!address) {
      setError(createError('wallet_not_connected', 'Connect your wallet first', 
        'A wallet connection is required to bridge tokens'))
      return
    }
    if (!hasQuote || !walletClient || !publicClient) {
      setError(createError('quote_failed', 'Get a quote first', 
        'A bridge quote is required before executing the transaction'))
      return
    }
    if (displayBalance && parseFloat(amount) > parseFloat(displayBalance.formatted)) {
      setError(createError('insufficient_balance', `Insufficient ${token} balance`, 
        `You need at least ${amount} ${token} but only have ${displayBalance.formatted} ${token}`))
      return
    }
    setBridging(true); setError(null); setBridgeStatus('Preparing…')
    try {
      if (walletChainId !== fromChain) {
        setBridgeStatus('Switching network…')
        await switchChainAsync({ chainId: fromChain })
      }
      if (oftQuote && isMst) {
        await executeMstSend(walletClient, publicClient, fromChain, toChain, amount,
          address, address, (s: string) => setBridgeStatus(s))
        setOftQuote(null)
      } else if (oftQuote) {
        await executeOftSend(walletClient, publicClient, fromChain, toChain, amount,
          address, address, slippage, (s: string) => setBridgeStatus(s))
        setOftQuote(null)
      } else if (v2Quote) {
        await executeOftV2Send(walletClient, publicClient, token, fromChain, toChain, amount,
          address, address, (s: string) => setBridgeStatus(s))
        setV2Quote(null)
      }
      setBridgeStatus('✅ Bridge complete! Funds arriving shortly.')
      setAmount('')
    } catch (e: any) {
      const msg = e.message || 'Bridge failed'
      if (msg.includes('rejected') || msg.includes('denied') || msg.includes('cancelled')) {
        setError(createError('transaction_rejected', 'Transaction rejected', 
          'You declined the transaction in your wallet'))
      } else if (msg.includes('network') || msg.includes('RPC')) {
        setError(createError('rpc_error', 'Network error', msg))
      } else {
        setError(createError('bridge_failed', 'Bridge transaction failed', msg))
      }
      setBridgeStatus(null)
    } finally { setBridging(false) }
  }, [oftQuote, v2Quote, address, walletClient, publicClient, walletChainId, fromChain, toChain, switchChainAsync, amount, slippage, displayBalance, token, isMst])

  const swap = () => {
    const fc = fromChain
    setFromChain(toChain); setToChain(fc)
    clearQuotes()
  }

  // Error recovery handlers
  const handleRetry = () => {
    setError(null)
    if (hasQuote) {
      handleBridge()
    } else {
      doQuote()
    }
  }

  const handleDismissError = () => setError(null)

  const handleConnectWallet = () => {
    setError(null)
    // The connect wallet button in the UI will handle the actual connection
  }

  const handleSwitchNetwork = async (chainId: number) => {
    try {
      setError(null)
      await switchChainAsync({ chainId })
    } catch (e: any) {
      setError(createError('network_mismatch', 'Failed to switch network', e.message))
    }
  }

  const handleMax = () => { if (displayBalance) setAmount(displayBalance.formatted) }
  const handleHalf = () => { if (displayBalance) setAmount((parseFloat(displayBalance.formatted) / 2).toString()) }

  const handleFromChain = (id: number) => {
    if (id === toChain) setToChain(fromChain)
    setFromChain(id); clearQuotes()
  }
  const handleToChain = (id: number) => {
    if (id === fromChain) setFromChain(toChain)
    setToChain(id); clearQuotes()
  }

  // Fee display now handled in QuoteDisplay component

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Toolbar icons above the bridge frame */}
      <div className="flex justify-end gap-3 sm:gap-3 pr-1">
        <button className="w-11 h-11 sm:w-9 sm:h-9 rounded-full bg-[#1a1a28]/80 border border-gray-800/50 flex items-center justify-center text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-all active:scale-95" title="Transaction History">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </button>
        <button onClick={() => setShowSettings(!showSettings)} className="w-11 h-11 sm:w-9 sm:h-9 rounded-full bg-[#1a1a28]/80 border border-gray-800/50 flex items-center justify-center text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-all active:scale-95" title="Settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>

      <div className="bg-gradient-to-br from-gray-800/30 via-gray-700/10 to-gray-800/30 p-[1px] rounded-2xl">
        <div className="bg-[#12121a]/80 backdrop-blur-xl rounded-2xl p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-5 shadow-2xl shadow-black/40">

        {/* Chain selector row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-3">
          <ChainSelectorModal
            label="From"
            selectedChainId={fromChain}
            chains={filteredChains}
            onChainChange={handleFromChain}
          />

          <button 
            onClick={swap}
            className="w-12 h-12 sm:w-10 sm:h-10 rounded-full bg-[#1a1a28] border border-gray-700/50 flex items-center justify-center hover:border-telos-cyan/50 hover:bg-telos-cyan/5 hover:rotate-180 duration-300 text-gray-400 hover:text-telos-cyan shrink-0 group active:scale-95 self-center sm:self-auto touch-manipulation"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="group-hover:scale-110 transition-transform">
              <path d="M10 2L13 5L10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 5H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M6 14L3 11L6 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13 11H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          <ChainSelectorModal
            label="To"
            selectedChainId={toChain}
            chains={filteredChains}
            onChainChange={handleToChain}
          />
        </div>

        {/* Subtle separator */}
        <div className="border-t border-white/[0.03]"></div>

        {/* Amount input */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <AmountInput
            amount={amount}
            onAmountChange={setAmount}
            token={token}
            balance={displayBalance}
            insufficientBalance={insufficientBalance}
            onMax={handleMax}
            onHalf={handleHalf}
            onQuarter={() => { if (displayBalance) setAmount((parseFloat(displayBalance.formatted) / 4).toString()) }}
          />
          
          <TokenSelectorModal 
            selectedToken={token}
            tokens={tokenList}
            onTokenChange={(newToken) => { setToken(newToken); clearQuotes() }}
          />
        </div>

        {/* Quote display */}
        {(hasQuote || quoting) && (
          <QuoteDisplay
            quoting={quoting}
            amount={amount}
            token={token}
            toChainName={chainName(toChain)}
            amountReceived={v2Quote ? v2Quote.amountReceivedFormatted : amount}
            isStargate={OFT_V2_TOKENS[token]?.isStargate}
            nativeFee={oftQuote 
              ? `~${parseFloat(oftQuote.nativeFeeFormatted).toFixed(0)}` 
              : v2Quote 
                ? `~${parseFloat(v2Quote.nativeFeeFormatted).toFixed(4)}`
                : undefined
            }
            feeCurrency={CHAIN_MAP.get(fromChain)?.nativeCurrency || 'TLOS'}
            estimatedTime="~2 min"
          />
        )}

        {/* Enhanced settings panel */}
        {showSettings && (
          <BridgeSettings
            slippage={slippage}
            onSlippageChange={setSlippage}
            estimatedGas={oftQuote 
              ? `${oftQuote.nativeFeeFormatted} ${CHAIN_MAP.get(fromChain)?.nativeCurrency || 'TLOS'}` 
              : v2Quote 
                ? `${v2Quote.nativeFeeFormatted} ${CHAIN_MAP.get(fromChain)?.nativeCurrency || 'TLOS'}`
                : undefined
            }
            showGasOptimization={fromChain === 1 || fromChain === 137} // Only show on high-gas chains
          />
        )}

        {/* Route details now included in QuoteDisplay component */}

        {/* Enhanced Error Display */}
        <ErrorDisplay
          error={error}
          onRetry={handleRetry}
          onDismiss={handleDismissError}
          onConnectWallet={handleConnectWallet}
          onSwitchNetwork={handleSwitchNetwork}
          chainName={chainName}
        />

        {/* Status */}
        {bridgeStatus && (
          <div className="bg-telos-cyan/5 border border-telos-cyan/15 rounded-xl px-4 py-3 text-sm text-center text-telos-cyan">{bridgeStatus}</div>
        )}

        {/* Network warning */}
        {wrongNetwork && !bridging && !bridgeStatus && (
          <div className="flex items-center gap-2 bg-yellow-500/[0.05] border border-yellow-500/10 rounded-xl px-3.5 py-2.5 text-xs text-yellow-500/80">
            <span>⚠</span><span>Will switch to {chainName(fromChain)} on bridge</span>
          </div>
        )}

        {/* From non-Telos notice */}
        {fromChain !== 40 && tokenList.length === 1 && (
          <div className="flex items-center gap-2 bg-telos-cyan/[0.04] border border-telos-cyan/10 rounded-xl px-3.5 py-2.5 text-xs text-telos-cyan/70">
            <span>ℹ</span><span>Only TLOS bridging available on this route</span>
          </div>
        )}

        {/* CTA */}
        {!address ? (
          <div className="w-full py-5 rounded-xl font-semibold text-center text-gray-500 bg-[#1a1a28] border border-gray-800/50 text-lg">
            Connect wallet to bridge
          </div>
        ) : (
          <button onClick={hasQuote ? handleBridge : doQuote}
            disabled={!amount || parseFloat(amount) <= 0 || quoting || bridging || fromChain === toChain || (!isOft && !isMst && !isV2) || insufficientBalance}
            className="w-full py-4 sm:py-5 rounded-2xl font-semibold text-base sm:text-lg bg-gradient-to-r from-telos-cyan via-telos-blue to-telos-purple text-white disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 hover:shadow-xl hover:shadow-telos-cyan/20 active:scale-98 transition-all duration-200 shadow-lg shadow-telos-cyan/10 relative overflow-hidden group touch-manipulation">
            <span className="relative z-10 flex items-center justify-center gap-2">
              {(quoting || bridging) && <LoadingSpinner size="sm" className="text-white" />}
              {insufficientBalance ? 'Insufficient balance' : 
               quoting ? 'Getting quote...' : 
               bridging ? 'Bridging...' : 
               hasQuote ? `⚡ Bridge ${token}` : 'Get Quote'}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-telos-cyan/20 via-white/10 to-telos-cyan/20 opacity-0 group-hover:opacity-100 group-hover:animate-pulse transition-opacity duration-200"></div>
          </button>
        )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 text-xs text-telos-cyan/70 bg-telos-cyan/5 border border-telos-cyan/10 rounded-full px-3 py-1.5">
          ⚡ LayerZero + Stargate — cross-chain bridging, excess fees refunded
        </span>
      </div>
    </div>
  )
}
