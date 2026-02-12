'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount, useBalance, useSwitchChain, useWalletClient, usePublicClient } from 'wagmi'
import { dynamicChains, type ChainInfo } from '@/lib/chains'
import { initLiFi, isChainAvailable, fetchQuote, getTokensForChain, getTokenAddress, executeBridge } from '@/lib/lifi'
import { isTlosOftRoute, quoteOftSend, executeOftSend, type OftQuoteResult } from '@/lib/oft'

const CHAIN_ICONS: Record<number, string> = {
  1: '🔷', 40: '🟢', 8453: '🔵', 56: '🟡', 42161: '🔶', 137: '🟣', 43114: '🔺', 10: '🔴',
}

export function BridgeForm() {
  const { address, chainId: walletChainId } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const { data: walletClient } = useWalletClient()
  const [chains, setChains] = useState<ChainInfo[]>([])
  const [fromChain, setFromChain] = useState(40)
  const [toChain, setToChain] = useState(8453)
  const [fromTokens, setFromTokens] = useState<string[]>([])
  const [token, setToken] = useState('TLOS')
  const [amount, setAmount] = useState('')
  const [slippage, setSlippage] = useState(0.5)
  const [showSettings, setShowSettings] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [swapRotation, setSwapRotation] = useState(0)

  const [quoting, setQuoting] = useState(false)
  const [quote, setQuote] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [bridging, setBridging] = useState(false)
  const [bridgeStatus, setBridgeStatus] = useState<string | null>(null)
  const [fromTokenAddress, setFromTokenAddress] = useState<string | undefined>(undefined)
  const [oftQuote, setOftQuote] = useState<OftQuoteResult | null>(null)
  const publicClient = usePublicClient({ chainId: fromChain })
  const quoteTimeout = useRef<NodeJS.Timeout | null>(null)

  // Bridge same token across chains
  const fromToken = token
  const toToken = token
  const isOftRoute = isTlosOftRoute(fromChain, toChain, fromToken, toToken)
  const hasQuote = !!(quote || oftQuote)
  const wrongNetwork = address && walletChainId !== fromChain

  useEffect(() => {
    if (!ready) return
    getTokenAddress(fromChain, fromToken).then(addr => setFromTokenAddress(addr))
  }, [fromChain, fromToken, ready])

  const { data: nativeBalance } = useBalance({ address, chainId: fromChain })
  const { data: tokenBalance } = useBalance({
    address, chainId: fromChain,
    token: fromTokenAddress && fromTokenAddress !== '0x0000000000000000000000000000000000000000'
      ? fromTokenAddress as `0x${string}` : undefined,
  })

  const isNativeToken = fromTokenAddress === '0x0000000000000000000000000000000000000000' ||
    ['ETH', 'TLOS', 'BNB', 'MATIC', 'AVAX'].includes(fromToken)
  const displayBalance = isNativeToken ? nativeBalance : tokenBalance

  useEffect(() => {
    initLiFi().then(async () => {
      setChains([...dynamicChains])
      setReady(true)
      setFromTokens(await getTokensForChain(40))
    })
  }, [])

  useEffect(() => {
    if (!ready) return
    getTokensForChain(fromChain).then(t => {
      setFromTokens(t)
      if (!t.includes(token)) setToken(t[0] || 'TLOS')
    })
  }, [fromChain, ready])

  const doQuote = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0 || !ready) return
    setQuoting(true); setError(null); setQuote(null); setOftQuote(null)
    try {
      if (isOftRoute && publicClient) {
        const oq = await quoteOftSend(publicClient, fromChain, toChain, amount,
          address || '0x0000000000000000000000000000000000000001' as `0x${string}`)
        setOftQuote(oq)
      } else {
        const q = await fetchQuote({
          fromChainId: fromChain, toChainId: toChain,
          fromTokenSymbol: fromToken, toTokenSymbol: toToken,
          amount, slippage, fromAddress: address,
        })
        setQuote(q)
      }
    } catch (e: any) {
      const msg = e.message || 'Failed to get quote'
      if (msg.includes('No available quotes') || msg.includes('404')) {
        setError(`No route for ${fromToken} on this path.`)
      } else { setError(msg) }
    } finally { setQuoting(false) }
  }, [fromChain, toChain, fromToken, toToken, amount, slippage, address, isOftRoute, publicClient, ready])

  // Auto-quote with debounce
  useEffect(() => {
    if (quoteTimeout.current) clearTimeout(quoteTimeout.current)
    setQuote(null); setOftQuote(null)
    if (!amount || parseFloat(amount) <= 0 || !ready) return
    quoteTimeout.current = setTimeout(() => doQuote(), 800)
    return () => { if (quoteTimeout.current) clearTimeout(quoteTimeout.current) }
  }, [amount, fromChain, toChain, token, slippage, ready])

  const handleBridge = useCallback(async () => {
    if (!hasQuote || !address || !walletClient) {
      setError(!address ? 'Connect your wallet first' : 'Get a quote first')
      return
    }
    if (displayBalance && parseFloat(amount) > parseFloat(displayBalance.formatted)) {
      setError(`Insufficient ${fromToken} balance`)
      return
    }
    setBridging(true); setError(null); setBridgeStatus('Preparing…')
    try {
      if (walletChainId !== fromChain) {
        setBridgeStatus('Switching network…')
        await switchChainAsync({ chainId: fromChain })
      }
      if (oftQuote && publicClient) {
        await executeOftSend(walletClient, publicClient, fromChain, toChain, amount,
          address, address, slippage, (s: string) => setBridgeStatus(s))
        setOftQuote(null)
      } else if (quote) {
        setBridgeStatus('Confirm in wallet…')
        await executeBridge(quote.raw, (s: string) => setBridgeStatus(s))
        setQuote(null)
      }
      setBridgeStatus('✅ Bridge complete! Funds arriving shortly.')
      setAmount('')
    } catch (e: any) {
      const msg = e.message || 'Bridge failed'
      setError(msg.includes('rejected') || msg.includes('denied') ? 'Transaction rejected' : msg)
      setBridgeStatus(null)
    } finally { setBridging(false) }
  }, [quote, oftQuote, address, walletClient, publicClient, walletChainId, fromChain, toChain, switchChainAsync, amount, slippage, displayBalance, fromToken])

  const swap = () => {
    setSwapRotation(r => r + 180)
    const fc = fromChain
    setFromChain(toChain); setToChain(fc)
    setQuote(null); setOftQuote(null); setBridgeStatus(null)
  }

  const fmt = (raw: string, dec: number) => {
    const n = parseFloat(raw) / 10 ** dec
    return n < 0.001 ? n.toExponential(2) : n.toFixed(Math.min(6, dec))
  }

  const handleMax = () => { if (displayBalance) setAmount(displayBalance.formatted) }
  const handleHalf = () => { if (displayBalance) setAmount((parseFloat(displayBalance.formatted) / 2).toString()) }
  const chainName = (id: number) => chains.find(c => c.id === id)?.name || `Chain ${id}`
  const telosUnavailable = ready && !isChainAvailable(40) && (fromChain === 40 || toChain === 40)

  const Spinner = () => (
    <svg className="w-4 h-4 animate-spin-slow" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
      <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )

  return (
    <div className="space-y-3 w-full max-w-[440px] mx-auto">
      <div className="bg-[#11111b]/90 backdrop-blur-2xl border border-white/[0.04] rounded-2xl card-glow overflow-hidden">

        {/* Card header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <span className="text-sm font-semibold text-white/90">Bridge</span>
          <button onClick={() => setShowSettings(!showSettings)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all text-sm
              ${showSettings ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}>
            ⚙️
          </button>
        </div>

        {/* Settings */}
        {showSettings && (
          <div className="mx-5 mb-3 bg-[#0c0c16] rounded-xl p-3.5 border border-white/[0.04]">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] text-gray-400 font-medium">Slippage Tolerance</span>
              <span className="text-[11px] text-telos-cyan font-medium">{slippage}%</span>
            </div>
            <div className="flex gap-1.5">
              {[0.5, 1, 2, 3].map(s => (
                <button key={s} onClick={() => setSlippage(s)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${slippage === s
                      ? 'bg-telos-cyan/15 text-telos-cyan border border-telos-cyan/25'
                      : 'bg-white/[0.03] text-gray-500 border border-transparent hover:bg-white/[0.06]'}`}>
                  {s}%
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-5 pb-5 space-y-1.5">
          {/* FROM panel */}
          <div className="bg-[#16162280] rounded-xl p-4 border border-white/[0.03] focus-within:border-white/[0.08] transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">From</span>
              {address && displayBalance && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-gray-500">
                    {parseFloat(displayBalance.formatted).toFixed(4)} {displayBalance.symbol}
                  </span>
                  <button onClick={handleHalf}
                    className="text-[10px] text-gray-500 hover:text-telos-cyan px-1.5 py-0.5 rounded bg-white/[0.03] hover:bg-telos-cyan/10 transition-all font-medium">
                    HALF
                  </button>
                  <button onClick={handleMax}
                    className="text-[10px] text-gray-500 hover:text-telos-cyan px-1.5 py-0.5 rounded bg-white/[0.03] hover:bg-telos-cyan/10 transition-all font-medium">
                    MAX
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <input type="number" inputMode="decimal" placeholder="0.00" value={amount}
                onChange={e => setAmount(e.target.value)}
                className="flex-1 bg-transparent text-[28px] font-light text-white outline-none placeholder-gray-700 min-w-0 tabular-nums" />
              <select value={token} onChange={e => setToken(e.target.value)}
                className="bg-[#1e1e30] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm font-semibold outline-none cursor-pointer hover:border-white/[0.12] transition-colors text-white min-w-[90px]">
                {fromTokens.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="mt-2.5">
              <select value={fromChain} onChange={e => setFromChain(Number(e.target.value))}
                className="bg-transparent text-[11px] text-gray-500 outline-none cursor-pointer hover:text-gray-300 transition-colors">
                {chains.map(c => (
                  <option key={c.id} value={c.id}>{CHAIN_ICONS[c.id] || '⬡'} {c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Swap button */}
          <div className="flex justify-center -my-1 relative z-10">
            <button onClick={swap}
              className="w-10 h-10 rounded-xl bg-[#1a1a2e] border border-white/[0.06] flex items-center justify-center hover:border-telos-cyan/30 hover:bg-telos-cyan/5 transition-all text-gray-400 hover:text-telos-cyan shadow-lg shadow-black/20"
              style={{ transform: `rotate(${swapRotation}deg)`, transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L8 14M8 14L4 10M8 14L12 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* TO panel */}
          <div className="bg-[#16162280] rounded-xl p-4 border border-white/[0.03]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">To</span>
              {quoting && (
                <span className="text-[11px] text-telos-cyan flex items-center gap-1.5">
                  <Spinner /> Fetching quote…
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                {quoting ? (
                  <div className="skeleton h-8 w-32" />
                ) : (
                  <span className={`text-[28px] font-light tabular-nums block truncate ${hasQuote ? 'text-white' : 'text-gray-700'}`}>
                    {oftQuote ? amount : quote ? fmt(quote.toAmount, quote.toToken.decimals) : '0.00'}
                  </span>
                )}
              </div>
              <div className="bg-[#1e1e30] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm font-semibold text-white min-w-[90px] text-center">
                {token}
              </div>
            </div>
            <div className="mt-2.5">
              <select value={toChain} onChange={e => setToChain(Number(e.target.value))}
                className="bg-transparent text-[11px] text-gray-500 outline-none cursor-pointer hover:text-gray-300 transition-colors">
                {chains.map(c => (
                  <option key={c.id} value={c.id}>{CHAIN_ICONS[c.id] || '⬡'} {c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Route details (collapsible) */}
          {hasQuote && (
            <button onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                {isOftRoute ? (
                  <><span className="text-telos-cyan">⚡</span><span>LayerZero OFT · 1:1 · ~2 min</span></>
                ) : quote && (
                  <><span className="text-gray-500">via</span><span>{quote.tool}</span><span className="text-gray-600">·</span><span>~{Math.ceil(quote.executionDuration / 60)} min</span></>
                )}
              </div>
              <svg className={`w-3.5 h-3.5 text-gray-500 transition-transform ${showDetails ? 'rotate-180' : ''}`}
                viewBox="0 0 16 16" fill="none">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}

          {hasQuote && showDetails && (
            <div className="space-y-1.5 text-xs text-gray-500 px-3 pb-1">
              {quote && (
                <>
                  <div className="flex justify-between"><span>Min received</span><span className="text-gray-300">{fmt(quote.toAmountMin, quote.toToken.decimals)} {quote.toToken.symbol}</span></div>
                  <div className="flex justify-between"><span>Slippage</span><span className="text-gray-300">{slippage}%</span></div>
                  {quote.gasCosts?.length > 0 && (
                    <div className="flex justify-between"><span>Gas</span><span className="text-gray-300">{fmt(quote.gasCosts[0].amount, quote.gasCosts[0].token?.decimals || 18)} {quote.gasCosts[0].token?.symbol || 'ETH'}</span></div>
                  )}
                </>
              )}
              {oftQuote && (
                <>
                  <div className="flex justify-between"><span>Rate</span><span className="text-telos-cyan">1:1 — no slippage</span></div>
                  <div className="flex justify-between"><span>LZ Fee</span><span className="text-gray-300">~{parseFloat(oftQuote.nativeFeeFormatted).toFixed(0)} TLOS{oftQuote.feeEstimated ? ' (est · excess refunded)' : ''}</span></div>
                </>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/[0.06] border border-red-500/15 rounded-xl px-4 py-3">
              <span className="text-red-400 text-sm">⚠</span>
              <span className="text-sm text-red-400/90">{error}</span>
            </div>
          )}

          {/* Status */}
          {bridgeStatus && (
            <div className="bg-telos-cyan/[0.04] border border-telos-cyan/10 rounded-xl px-4 py-3 text-sm text-center text-telos-cyan/90">
              {bridgeStatus}
            </div>
          )}

          {/* Network warning */}
          {wrongNetwork && !bridging && !bridgeStatus && (
            <div className="flex items-center gap-2 bg-yellow-500/[0.05] border border-yellow-500/10 rounded-xl px-3.5 py-2.5 text-xs text-yellow-500/80">
              <span>⚠</span><span>Will switch to {chainName(fromChain)} on bridge</span>
            </div>
          )}

          {/* CTA */}
          {!address ? (
            <div className="w-full py-4 rounded-xl font-semibold text-center text-gray-500 bg-white/[0.03] border border-white/[0.04] text-sm">
              Connect wallet to bridge
            </div>
          ) : (
            <button onClick={hasQuote ? handleBridge : doQuote}
              disabled={!amount || parseFloat(amount) <= 0 || quoting || bridging || !ready || (telosUnavailable && !isOftRoute)}
              className={`w-full py-4 rounded-xl font-semibold text-[15px] transition-all
                bg-gradient-to-r from-telos-cyan via-telos-blue to-telos-purple text-white
                disabled:opacity-20 disabled:cursor-not-allowed
                hover:shadow-[0_0_30px_rgba(0,242,254,0.15)] hover:brightness-110 active:scale-[0.99]
                ${hasQuote && !bridging ? 'bridge-ready' : ''}`}>
              {!ready ? (
                <span className="flex items-center justify-center gap-2"><Spinner /> Initializing…</span>
              ) : quoting ? (
                <span className="flex items-center justify-center gap-2"><Spinner /> Getting quote…</span>
              ) : bridging ? (
                <span className="flex items-center justify-center gap-2"><Spinner /> Bridging…</span>
              ) : hasQuote ? 'Bridge' : 'Get Quote'}
            </button>
          )}
        </div>
      </div>

      {/* Footer badges */}
      {isOftRoute && (
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-telos-cyan/60 bg-telos-cyan/[0.04] border border-telos-cyan/[0.08] rounded-full px-3 py-1.5 font-medium">
            ⚡ Direct LayerZero OFT — 1:1, no slippage
          </span>
        </div>
      )}
      {telosUnavailable && !isOftRoute && (
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-telos-purple/60 bg-telos-purple/[0.04] border border-telos-purple/[0.08] rounded-full px-3 py-1.5 font-medium">
            ✦ Telos on LiFi coming soon — use TLOS→TLOS for OFT bridging
          </span>
        </div>
      )}
      <p className="text-center text-[10px] text-gray-600/60">
        {ready ? `${chains.length} chains · LiFi + LayerZero OFT` : 'Connecting…'}
      </p>
    </div>
  )
}
