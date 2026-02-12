'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount, useBalance, useSwitchChain, useWalletClient, usePublicClient } from 'wagmi'
import { SUPPORTED_CHAINS, CHAIN_MAP } from '@/lib/chains'
import { isTlosOftRoute, quoteOftSend, executeOftSend, type OftQuoteResult } from '@/lib/oft'
import {
  isWrappedBridgeRoute, getAvailableTokens, TELOS_WRAPPED_TOKENS,
  quoteWrappedBridge, executeWrappedBridge, type WrappedBridgeQuote,
} from '@/lib/wrapped-bridge'

const CHAIN_COLORS: Record<number, string> = {
  1: '#627EEA', 40: '#00F2FE', 8453: '#0052FF', 56: '#F0B90B',
  42161: '#28A0F0', 137: '#8247E5', 43114: '#E84142',
}

const TOKEN_LOGOS: Record<string, string> = {
  TLOS: '/telos-bridge-lifi/tokens/TLOS.svg',
  USDC: '/telos-bridge-lifi/tokens/USDC.png',
  USDT: '/telos-bridge-lifi/tokens/USDT.png',
  ETH: '/telos-bridge-lifi/tokens/ETH.png',
  'BTC.b': '/telos-bridge-lifi/tokens/WBTC.png',
  BNB: '/telos-bridge-lifi/tokens/BNB.png',
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
  const [wrappedQuote, setWrappedQuote] = useState<WrappedBridgeQuote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [bridging, setBridging] = useState(false)
  const [bridgeStatus, setBridgeStatus] = useState<string | null>(null)
  const publicClient = usePublicClient({ chainId: fromChain })
  const quoteTimeout = useRef<NodeJS.Timeout | null>(null)

  // Token balance for ERC20 wrapped tokens
  const wrappedTokenAddr = TELOS_WRAPPED_TOKENS[token]?.address
  const { data: nativeBalance } = useBalance({ address, chainId: fromChain })
  const { data: tokenBalance } = useBalance({
    address, chainId: fromChain,
    token: wrappedTokenAddr as `0x${string}` | undefined,
  })

  const isOft = isTlosOftRoute(fromChain, toChain, token, token)
  const isWrapped = !isOft && isWrappedBridgeRoute(token, fromChain, toChain)
  const hasQuote = !!(oftQuote || wrappedQuote)
  const wrongNetwork = address && walletChainId !== fromChain
  const displayBalance = token === 'TLOS' ? nativeBalance : tokenBalance

  const chainName = (id: number) => CHAIN_MAP.get(id)?.name || `Chain ${id}`
  const chainIcon = (id: number) => CHAIN_MAP.get(id)?.icon

  // Build token list: TLOS (always) + wrapped tokens available for this route
  const availableTokens = useCallback(() => {
    const tokens = ['TLOS']
    if (fromChain === 40) {
      // From Telos: add wrapped tokens that can bridge to dest chain
      const wrapped = getAvailableTokens(toChain)
      tokens.push(...wrapped)
    }
    return tokens
  }, [fromChain, toChain])

  const tokenList = availableTokens()

  // Reset token if not available on new route
  useEffect(() => {
    if (!tokenList.includes(token)) setToken('TLOS')
  }, [tokenList, token])

  const clearQuotes = () => { setOftQuote(null); setWrappedQuote(null); setError(null); setBridgeStatus(null) }

  const doQuote = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0 || !publicClient) return
    setQuoting(true); setError(null); setOftQuote(null); setWrappedQuote(null)
    try {
      if (isOft) {
        const oq = await quoteOftSend(publicClient, fromChain, toChain, amount,
          address || '0x0000000000000000000000000000000000000001' as `0x${string}`)
        setOftQuote(oq)
      } else if (isWrapped) {
        const wq = await quoteWrappedBridge(publicClient, toChain)
        setWrappedQuote({ ...wq, amount: 0n, token })
      } else {
        setError(`${token} cannot be bridged on this route.`)
      }
    } catch (e: any) {
      setError(e.message || 'Failed to get quote')
    } finally { setQuoting(false) }
  }, [fromChain, toChain, token, amount, address, publicClient, isOft, isWrapped])

  // Auto-quote with debounce
  useEffect(() => {
    if (quoteTimeout.current) clearTimeout(quoteTimeout.current)
    setOftQuote(null); setWrappedQuote(null)
    if (!amount || parseFloat(amount) <= 0) return
    quoteTimeout.current = setTimeout(() => doQuote(), 800)
    return () => { if (quoteTimeout.current) clearTimeout(quoteTimeout.current) }
  }, [amount, fromChain, toChain, token])

  const handleBridge = useCallback(async () => {
    if (!hasQuote || !address || !walletClient || !publicClient) {
      setError(!address ? 'Connect your wallet first' : 'Get a quote first')
      return
    }
    if (displayBalance && parseFloat(amount) > parseFloat(displayBalance.formatted)) {
      setError(`Insufficient ${token} balance`)
      return
    }
    setBridging(true); setError(null); setBridgeStatus('Preparing…')
    try {
      if (walletChainId !== fromChain) {
        setBridgeStatus('Switching network…')
        await switchChainAsync({ chainId: fromChain })
      }
      if (oftQuote) {
        await executeOftSend(walletClient, publicClient, fromChain, toChain, amount,
          address, address, slippage, (s: string) => setBridgeStatus(s))
        setOftQuote(null)
      } else if (wrappedQuote) {
        await executeWrappedBridge(walletClient, publicClient, token, toChain, amount,
          address, address, (s: string) => setBridgeStatus(s))
        setWrappedQuote(null)
      }
      setBridgeStatus('✅ Bridge complete! Funds arriving shortly.')
      setAmount('')
    } catch (e: any) {
      const msg = e.message || 'Bridge failed'
      setError(msg.includes('rejected') || msg.includes('denied') ? 'Transaction rejected' : msg)
      setBridgeStatus(null)
    } finally { setBridging(false) }
  }, [oftQuote, wrappedQuote, address, walletClient, publicClient, walletChainId, fromChain, toChain, switchChainAsync, amount, slippage, displayBalance, token])

  const swap = () => {
    const fc = fromChain
    setFromChain(toChain); setToChain(fc)
    clearQuotes()
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

  const feeDisplay = oftQuote
    ? `~${parseFloat(oftQuote.nativeFeeFormatted).toFixed(0)} TLOS${oftQuote.feeEstimated ? ' (est · excess refunded)' : ''}`
    : wrappedQuote
    ? `~${parseFloat(wrappedQuote.nativeFeeFormatted).toFixed(0)} TLOS${wrappedQuote.feeEstimated ? ' (est · excess refunded)' : ''}`
    : ''

  return (
    <div className="space-y-4">
      <div className="bg-[#12121a]/80 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl shadow-black/40">

        {/* Settings toggle */}
        <div className="flex justify-end">
          <button onClick={() => setShowSettings(!showSettings)}
            className="text-gray-500 hover:text-gray-300 transition-colors text-lg">⚙️</button>
        </div>

        {/* Chain selector row */}
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-[#1a1a28] rounded-xl p-4 hover:bg-[#1e1e30] transition-colors">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">From</p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                style={{ background: `${CHAIN_COLORS[fromChain] || '#666'}20` }}>
                {chainIcon(fromChain) && <img src={chainIcon(fromChain)} alt="" className="w-7 h-7 rounded-full" />}
              </div>
              <select value={fromChain} onChange={e => handleFromChain(Number(e.target.value))}
                className="bg-transparent text-white font-semibold text-base outline-none cursor-pointer flex-1 min-w-0">
                {SUPPORTED_CHAINS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <button onClick={swap}
            className="w-10 h-10 rounded-full bg-[#1a1a28] border border-gray-700/50 flex items-center justify-center hover:border-telos-cyan/50 hover:bg-telos-cyan/5 transition-all text-gray-400 hover:text-telos-cyan shrink-0">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M10 2L13 5L10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 5H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M6 14L3 11L6 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M13 11H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>

          <div className="flex-1 bg-[#1a1a28] rounded-xl p-4 hover:bg-[#1e1e30] transition-colors">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">To</p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                style={{ background: `${CHAIN_COLORS[toChain] || '#666'}20` }}>
                {chainIcon(toChain) && <img src={chainIcon(toChain)} alt="" className="w-7 h-7 rounded-full" />}
              </div>
              <select value={toChain} onChange={e => handleToChain(Number(e.target.value))}
                className="bg-transparent text-white font-semibold text-base outline-none cursor-pointer flex-1 min-w-0">
                {SUPPORTED_CHAINS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Amount input */}
        <div className="bg-[#1a1a28] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <input type="number" inputMode="decimal" placeholder="0.00" value={amount}
              onChange={e => setAmount(e.target.value)}
              className="flex-1 bg-transparent text-4xl font-light text-white outline-none placeholder-gray-600 min-w-0 tabular-nums" />
            <div className="flex items-center gap-2.5 bg-[#252535] border border-gray-700/50 rounded-xl px-4 py-3 ml-4 relative">
              {TOKEN_LOGOS[token] && <img src={TOKEN_LOGOS[token]} alt="" className="w-6 h-6 rounded-full" />}
              {tokenList.length > 1 ? (
                <>
                  <select value={token} onChange={e => { setToken(e.target.value); clearQuotes() }}
                    className="bg-transparent text-base font-semibold outline-none cursor-pointer text-white appearance-none pr-5">
                    {tokenList.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <svg className="w-3.5 h-3.5 text-gray-500 absolute right-3" viewBox="0 0 12 12" fill="none"><path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </>
              ) : (
                <span className="text-base font-semibold text-white">{token}</span>
              )}
            </div>
          </div>
          {address && displayBalance && (
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{parseFloat(displayBalance.formatted).toFixed(4)} {token} available</span>
              <div className="flex gap-2">
                <button onClick={handleHalf} className="text-xs text-gray-500 hover:text-telos-cyan px-2 py-1 rounded-lg bg-white/[0.03] hover:bg-telos-cyan/10 transition-all font-medium">HALF</button>
                <button onClick={handleMax} className="text-xs text-telos-cyan/60 hover:text-telos-cyan px-2 py-1 rounded-lg bg-telos-cyan/5 hover:bg-telos-cyan/10 transition-all font-medium">MAX</button>
              </div>
            </div>
          )}
        </div>

        {/* You receive */}
        {(hasQuote || quoting) && (
          <div className="bg-[#1a1a28] rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">You receive</p>
            <div className="flex items-center justify-between">
              {quoting ? (
                <div className="skeleton h-10 w-40" />
              ) : (
                <span className="text-3xl font-light text-telos-cyan tabular-nums">{amount}</span>
              )}
              <div className="flex items-center gap-2 text-base text-gray-400 font-medium">
                {TOKEN_LOGOS[token] && <img src={TOKEN_LOGOS[token]} alt="" className="w-5 h-5 rounded-full" />}
                {token} on {chainName(toChain)}
              </div>
            </div>
          </div>
        )}

        {/* Slippage */}
        {showSettings && (
          <div className="bg-[#0e0e18] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Slippage</p>
              <span className="text-[10px] text-telos-cyan">{slippage}%</span>
            </div>
            <div className="flex gap-2">
              {[0.5, 1, 2, 3].map(s => (
                <button key={s} onClick={() => setSlippage(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    slippage === s
                      ? 'bg-telos-cyan/15 text-telos-cyan border border-telos-cyan/30'
                      : 'text-gray-500 border border-transparent hover:text-gray-300'}`}>
                  {s}%
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Route details */}
        {hasQuote && (
          <div className="space-y-1.5 text-xs text-gray-500 px-1">
            <div className="flex justify-between">
              <span>Via</span>
              <span className="text-telos-cyan font-medium">
                ⚡ {isOft ? 'LayerZero OFT' : 'LayerZero Wrapped Bridge'}
              </span>
            </div>
            <div className="flex justify-between"><span>Rate</span><span className="text-gray-300">1:1 — no slippage</span></div>
            <div className="flex justify-between"><span>Fee</span><span className="text-gray-300">{feeDisplay}</span></div>
            <div className="flex justify-between"><span>Time</span><span className="text-gray-300">~2 min</span></div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">{error}</div>
        )}

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
        {fromChain !== 40 && (
          <div className="flex items-center gap-2 bg-telos-cyan/[0.04] border border-telos-cyan/10 rounded-xl px-3.5 py-2.5 text-xs text-telos-cyan/70">
            <span>ℹ</span><span>Only TLOS bridging available from non-Telos chains</span>
          </div>
        )}

        {/* CTA */}
        {!address ? (
          <div className="w-full py-5 rounded-xl font-semibold text-center text-gray-500 bg-[#1a1a28] border border-gray-800/50 text-lg">
            Connect wallet to bridge
          </div>
        ) : (
          <button onClick={hasQuote ? handleBridge : doQuote}
            disabled={!amount || parseFloat(amount) <= 0 || quoting || bridging || fromChain === toChain || (!isOft && !isWrapped)}
            className="w-full py-5 rounded-xl font-semibold text-lg bg-gradient-to-r from-telos-cyan via-telos-blue to-telos-purple text-white disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all shadow-lg shadow-telos-cyan/10">
            {quoting ? 'Getting quote...' : bridging ? 'Bridging...' : hasQuote ? `⚡ Bridge ${token}` : 'Get Quote'}
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 text-xs text-telos-cyan/70 bg-telos-cyan/5 border border-telos-cyan/10 rounded-full px-3 py-1.5">
          ⚡ LayerZero — 1:1 bridging, excess fees refunded
        </span>
      </div>
      <p className="text-center text-[10px] text-gray-600">{SUPPORTED_CHAINS.length} chains · LayerZero OFT + Wrapped Bridge</p>
    </div>
  )
}
