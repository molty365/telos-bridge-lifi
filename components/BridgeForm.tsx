'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount, useBalance, useSwitchChain, useWalletClient, usePublicClient } from 'wagmi'
import { dynamicChains, type ChainInfo } from '@/lib/chains'
import { initLiFi, isChainAvailable, fetchQuote, getTokensForChain, getTokenAddress, executeBridge } from '@/lib/lifi'
import { isTlosOftRoute, quoteOftSend, executeOftSend, type OftQuoteResult } from '@/lib/oft'

const CHAIN_LOGOS: Record<number, string> = {
  1: '/telos-bridge-lifi/chains/ethereum.png',
  40: '/telos-bridge-lifi/chains/telos.png',
  8453: '/telos-bridge-lifi/chains/base.png',
  56: '/telos-bridge-lifi/chains/bsc.png',
  42161: '/telos-bridge-lifi/chains/arbitrum.png',
  137: '/telos-bridge-lifi/chains/polygon.png',
  43114: '/telos-bridge-lifi/chains/avalanche.png',
  10: '/telos-bridge-lifi/chains/optimism.png',
}

const CHAIN_COLORS: Record<number, string> = {
  1: '#627EEA', 40: '#00F2FE', 8453: '#0052FF', 56: '#F0B90B',
  42161: '#28A0F0', 137: '#8247E5', 43114: '#E84142', 10: '#FF0420',
}

const TOKEN_LOGOS: Record<string, string> = {
  TLOS: '/telos-bridge-lifi/tokens/TLOS.png',
  USDC: '/telos-bridge-lifi/tokens/USDC.png',
  USDT: '/telos-bridge-lifi/tokens/USDT.png',
  ETH: '/telos-bridge-lifi/tokens/ETH.png',
  WBTC: '/telos-bridge-lifi/tokens/WBTC.png',
  BNB: '/telos-bridge-lifi/tokens/BNB.png',
  AVAX: '/telos-bridge-lifi/tokens/AVAX.png',
  MATIC: '/telos-bridge-lifi/tokens/MATIC.png',
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

  const fromToken = token
  const toToken = token
  const isOftRoute = isTlosOftRoute(fromChain, toChain, fromToken, toToken)
  const hasQuote = !!(quote || oftQuote)

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

  const clearQuote = () => { setQuote(null); setOftQuote(null); setBridgeStatus(null) }

  const doQuote = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0 || !ready) return
    setQuoting(true); setError(null); clearQuote()
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
    const fc = fromChain
    setFromChain(toChain); setToChain(fc)
    clearQuote()
  }

  const fmt = (raw: string, dec: number) => {
    const n = parseFloat(raw) / 10 ** dec
    return n < 0.001 ? n.toExponential(2) : n.toFixed(Math.min(6, dec))
  }

  const handleMax = () => { if (displayBalance) setAmount(displayBalance.formatted) }
  const handleHalf = () => { if (displayBalance) setAmount((parseFloat(displayBalance.formatted) / 2).toString()) }
  const chainName = (id: number) => chains.find(c => c.id === id)?.name || `Chain ${id}`
  const telosUnavailable = ready && !isChainAvailable(40) && (fromChain === 40 || toChain === 40)

  return (
    <div className="space-y-4">
      <div className="bg-[#12121a]/80 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-5 space-y-4 shadow-2xl shadow-black/40">

        {/* Settings toggle */}
        <div className="flex justify-end">
          <button onClick={() => setShowSettings(!showSettings)}
            className="text-gray-500 hover:text-gray-300 transition-colors text-lg">⚙️</button>
        </div>

        {/* Chain selector row */}
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-[#1a1a28] rounded-xl p-3 hover:bg-[#1e1e30] transition-colors">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">From</p>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                style={{ background: `${CHAIN_COLORS[fromChain] || '#666'}20` }}>
                {CHAIN_LOGOS[fromChain] && <img src={CHAIN_LOGOS[fromChain]} alt="" className="w-5 h-5 rounded-full" />}
              </div>
              <select value={fromChain} onChange={e => setFromChain(Number(e.target.value))}
                className="bg-transparent text-white font-semibold text-sm outline-none cursor-pointer flex-1 min-w-0">
                {chains.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <button onClick={swap}
            className="w-9 h-9 rounded-full bg-[#1a1a28] border border-gray-700/50 flex items-center justify-center hover:border-telos-cyan/50 hover:bg-telos-cyan/5 transition-all text-gray-400 hover:text-telos-cyan shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 2L13 5L10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 5H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M6 14L3 11L6 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M13 11H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>

          <div className="flex-1 bg-[#1a1a28] rounded-xl p-3 hover:bg-[#1e1e30] transition-colors">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">To</p>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                style={{ background: `${CHAIN_COLORS[toChain] || '#666'}20` }}>
                {CHAIN_LOGOS[toChain] && <img src={CHAIN_LOGOS[toChain]} alt="" className="w-5 h-5 rounded-full" />}
              </div>
              <select value={toChain} onChange={e => setToChain(Number(e.target.value))}
                className="bg-transparent text-white font-semibold text-sm outline-none cursor-pointer flex-1 min-w-0">
                {chains.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Amount input */}
        <div className="bg-[#1a1a28] rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <input type="number" inputMode="decimal" placeholder="0.00" value={amount}
              onChange={e => setAmount(e.target.value)}
              className="flex-1 bg-transparent text-3xl font-light text-white outline-none placeholder-gray-600 min-w-0 tabular-nums" />
            <div className="flex items-center gap-2 bg-[#252535] border border-gray-700/50 rounded-lg px-3 py-2 ml-3 relative">
              {TOKEN_LOGOS[token] && <img src={TOKEN_LOGOS[token]} alt="" className="w-5 h-5 rounded-full" />}
              <select value={token} onChange={e => setToken(e.target.value)}
                className="bg-transparent text-sm font-medium outline-none cursor-pointer text-white appearance-none pr-4">
                {fromTokens.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <svg className="w-3 h-3 text-gray-500 absolute right-2" viewBox="0 0 12 12" fill="none"><path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
          </div>
          {address && displayBalance && (
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{parseFloat(displayBalance.formatted).toFixed(4)} {displayBalance.symbol} available</span>
              <div className="flex gap-1.5">
                <button onClick={handleHalf} className="text-[10px] text-gray-500 hover:text-telos-cyan px-1.5 py-0.5 rounded bg-white/[0.03] hover:bg-telos-cyan/10 transition-all font-medium">HALF</button>
                <button onClick={handleMax} className="text-[10px] text-telos-cyan/60 hover:text-telos-cyan px-1.5 py-0.5 rounded bg-telos-cyan/5 hover:bg-telos-cyan/10 transition-all font-medium">MAX</button>
              </div>
            </div>
          )}
        </div>

        {/* You receive */}
        {(hasQuote || quoting) && (
          <div className="bg-[#1a1a28] rounded-xl p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">You receive</p>
            <div className="flex items-center justify-between">
              {quoting ? (
                <div className="skeleton h-8 w-32" />
              ) : (
                <span className="text-2xl font-light text-telos-cyan tabular-nums">
                  {oftQuote ? amount : quote ? fmt(quote.toAmount, quote.toToken.decimals) : ''}
                </span>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
                {TOKEN_LOGOS[token] && <img src={TOKEN_LOGOS[token]} alt="" className="w-4 h-4 rounded-full" />}
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
        {quote && (
          <div className="space-y-1.5 text-xs text-gray-500 px-1">
            <div className="flex justify-between"><span>Via</span><span className="text-gray-300">{quote.tool}</span></div>
            <div className="flex justify-between"><span>Time</span><span className="text-gray-300">~{Math.ceil(quote.executionDuration / 60)} min</span></div>
            <div className="flex justify-between"><span>Min received</span><span className="text-gray-300">{fmt(quote.toAmountMin, quote.toToken.decimals)} {quote.toToken.symbol}</span></div>
            {quote.gasCosts?.length > 0 && (
              <div className="flex justify-between"><span>Gas</span><span className="text-gray-300">{fmt(quote.gasCosts[0].amount, quote.gasCosts[0].token?.decimals || 18)} {quote.gasCosts[0].token?.symbol || 'ETH'}</span></div>
            )}
          </div>
        )}
        {oftQuote && (
          <div className="space-y-1.5 text-xs text-gray-500 px-1">
            <div className="flex justify-between"><span>Via</span><span className="text-telos-cyan font-medium">⚡ LayerZero OFT</span></div>
            <div className="flex justify-between"><span>Rate</span><span className="text-gray-300">1:1 — no slippage</span></div>
            <div className="flex justify-between"><span>Fee</span><span className="text-gray-300">~{parseFloat(oftQuote.nativeFeeFormatted).toFixed(0)} TLOS{oftQuote.feeEstimated ? ' (est · excess refunded)' : ''}</span></div>
            <div className="flex justify-between"><span>Time</span><span className="text-gray-300">~2 min</span></div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">{error}</div>
        )}
        {bridgeStatus && (
          <div className="bg-telos-cyan/5 border border-telos-cyan/15 rounded-xl px-4 py-3 text-sm text-center text-telos-cyan">{bridgeStatus}</div>
        )}

        {/* CTA */}
        {!address ? (
          <div className="w-full py-4 rounded-xl font-semibold text-center text-gray-500 bg-[#1a1a28] border border-gray-800/50">
            Connect wallet to bridge
          </div>
        ) : (
          <button onClick={hasQuote ? handleBridge : doQuote}
            disabled={!amount || parseFloat(amount) <= 0 || quoting || bridging || !ready || (telosUnavailable && !isOftRoute)}
            className="w-full py-4 rounded-xl font-semibold text-base bg-gradient-to-r from-telos-cyan via-telos-blue to-telos-purple text-white disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all shadow-lg shadow-telos-cyan/10">
            {!ready ? 'Loading...' : quoting ? 'Getting quote...' : bridging ? 'Bridging...' : hasQuote ? '🚀 Bridge' : 'Get Quote'}
          </button>
        )}
      </div>

      {isOftRoute && (
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 text-xs text-telos-cyan/70 bg-telos-cyan/5 border border-telos-cyan/10 rounded-full px-3 py-1.5">
            ⚡ Direct LayerZero OFT — 1:1, no slippage, excess fees refunded
          </span>
        </div>
      )}
      {telosUnavailable && !isOftRoute && (
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 text-xs text-telos-purple/70 bg-telos-purple/5 border border-telos-purple/10 rounded-full px-3 py-1.5">
            ✦ Telos on LiFi coming soon — use TLOS→TLOS for direct OFT bridging
          </span>
        </div>
      )}
      <p className="text-center text-[10px] text-gray-600">{ready ? `${chains.length} chains · LiFi + LayerZero` : 'Connecting...'}</p>
    </div>
  )
}
