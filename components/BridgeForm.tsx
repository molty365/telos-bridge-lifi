'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount, useBalance, useSwitchChain, useWalletClient, usePublicClient } from 'wagmi'
import { dynamicChains, type ChainInfo } from '@/lib/chains'
import { initLiFi, isChainAvailable, fetchQuote, getTokensForChain, getTokenAddress, executeBridge } from '@/lib/lifi'
import { isTlosOftRoute, quoteOftSend, executeOftSend, type OftQuoteResult } from '@/lib/oft'

const CHAIN_LOGOS: Record<number, string> = {
  1: '/telos-bridge-lifi/chains/ethereum.svg',
  40: '/telos-bridge-lifi/telos-logo.png',
  8453: '/telos-bridge-lifi/chains/base.svg',
  56: '/telos-bridge-lifi/chains/bsc.svg',
  42161: '/telos-bridge-lifi/chains/arbitrum.svg',
  137: '/telos-bridge-lifi/chains/polygon.svg',
  43114: '/telos-bridge-lifi/chains/avalanche.svg',
  10: '/telos-bridge-lifi/chains/optimism.svg',
}

const CHAIN_COLORS: Record<number, string> = {
  1: '#627EEA', 40: '#00F2FE', 8453: '#0052FF', 56: '#F0B90B',
  42161: '#28A0F0', 137: '#8247E5', 43114: '#E84142', 10: '#FF0420',
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

  // Bridge same token across chains (no swaps)
  const fromToken = token
  const toToken = token

  const isOftRoute = isTlosOftRoute(fromChain, toChain, fromToken, toToken)

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

  const handleQuote = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return
    setQuoting(true); setError(null); clearQuote()
    try {
      if (isOftRoute && publicClient) {
        const oq = await quoteOftSend(
          publicClient, fromChain, toChain, amount,
          address || '0x0000000000000000000000000000000000000001' as `0x${string}`,
        )
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
        setError(`No route available for ${fromToken} on this path.`)
      } else {
        setError(msg)
      }
    } finally { setQuoting(false) }
  }, [fromChain, toChain, fromToken, toToken, amount, slippage, address, isOftRoute, publicClient])

  const handleBridge = useCallback(async () => {
    if (!(quote || oftQuote) || !address || !walletClient) {
      setError(!address ? 'Connect your wallet first' : 'Get a quote first')
      return
    }
    if (displayBalance && parseFloat(amount) > parseFloat(displayBalance.formatted)) {
      setError(`Insufficient ${fromToken} balance`)
      return
    }
    setBridging(true); setError(null); setBridgeStatus('Preparing...')
    try {
      if (walletChainId !== fromChain) {
        setBridgeStatus('Switching network...')
        await switchChainAsync({ chainId: fromChain })
      }
      if (oftQuote && publicClient) {
        await executeOftSend(walletClient, publicClient, fromChain, toChain, amount,
          address, address, slippage, (s: string) => setBridgeStatus(s))
        setOftQuote(null)
      } else if (quote) {
        setBridgeStatus('Confirm in wallet...')
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

  const handleMax = () => {
    if (displayBalance) { setAmount(displayBalance.formatted); clearQuote() }
  }

  const chainName = (id: number) => chains.find(c => c.id === id)?.name || `Chain ${id}`
  const telosUnavailable = ready && !isChainAvailable(40) && (fromChain === 40 || toChain === 40)

  return (
    <div className="space-y-3">
      <div className="bg-[#12121a]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl shadow-black/50">

        {/* Chain selector row */}
        <div className="flex items-center border-b border-white/[0.04]">
          <button className="flex-1 flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left"
            onClick={() => {/* could open chain modal */}}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden"
              style={{ background: `${CHAIN_COLORS[fromChain] || '#666'}20` }}>
              {CHAIN_LOGOS[fromChain]
                ? <img src={CHAIN_LOGOS[fromChain]} alt="" className="w-5 h-5" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                : <span className="text-sm">⬡</span>}
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">From</p>
              <select value={fromChain} onChange={e => { setFromChain(Number(e.target.value)); clearQuote() }}
                className="bg-transparent text-white font-semibold text-sm outline-none cursor-pointer -ml-1">
                {chains.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </button>

          <button onClick={swap}
            className="w-10 h-10 rounded-full bg-[#1a1a28] border border-white/[0.06] flex items-center justify-center hover:border-telos-cyan/40 hover:bg-telos-cyan/5 transition-all text-gray-500 hover:text-telos-cyan shrink-0 hover:rotate-180 duration-300">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 2L13 5L10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 5H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M6 14L3 11L6 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M13 11H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>

          <button className="flex-1 flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-right justify-end"
            onClick={() => {/* could open chain modal */}}>
            <div className="text-right">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">To</p>
              <select value={toChain} onChange={e => { setToChain(Number(e.target.value)); clearQuote() }}
                className="bg-transparent text-white font-semibold text-sm outline-none cursor-pointer text-right">
                {chains.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden"
              style={{ background: `${CHAIN_COLORS[toChain] || '#666'}20` }}>
              {CHAIN_LOGOS[toChain]
                ? <img src={CHAIN_LOGOS[toChain]} alt="" className="w-5 h-5" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                : <span className="text-sm">⬡</span>}
            </div>
          </button>
        </div>

        {/* Amount + token */}
        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <div className="flex items-end gap-3">
              <input type="number" placeholder="0" value={amount}
                onChange={e => { setAmount(e.target.value); clearQuote() }}
                className="flex-1 bg-transparent text-[40px] font-extralight text-white outline-none placeholder-gray-700 min-w-0 leading-none" />
              <select value={token} onChange={e => { setToken(e.target.value); clearQuote() }}
                className="bg-white/[0.06] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm font-semibold outline-none cursor-pointer hover:bg-white/[0.08] transition-colors mb-1">
                {fromTokens.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {address && displayBalance ? (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {parseFloat(displayBalance.formatted).toFixed(4)} {displayBalance.symbol} available
                </span>
                <button onClick={handleMax}
                  className="text-[10px] font-bold uppercase tracking-wider text-telos-cyan/60 hover:text-telos-cyan transition-colors px-2 py-0.5 rounded bg-telos-cyan/5 hover:bg-telos-cyan/10">
                  Max
                </button>
              </div>
            ) : !address && (
              <p className="text-xs text-gray-600">Connect wallet to see balance</p>
            )}
          </div>

          {/* You receive preview */}
          {(quote || oftQuote) && (
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.04]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">You receive</p>
                  <p className="text-2xl font-light text-white">
                    {oftQuote ? amount : quote ? fmt(quote.toAmount, quote.toToken.decimals) : ''}{' '}
                    <span className="text-base text-gray-400">{token}</span>
                  </p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  on {chainName(toChain)}
                </div>
              </div>
            </div>
          )}

          {/* Route details */}
          {quote && (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>Via</span><span className="text-gray-300">{quote.tool}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Time</span><span className="text-gray-300">~{Math.ceil(quote.executionDuration / 60)} min</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Min received</span><span className="text-gray-300">{fmt(quote.toAmountMin, quote.toToken.decimals)} {quote.toToken.symbol}</span>
              </div>
              {quote.gasCosts?.length > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Gas</span><span className="text-gray-300">{fmt(quote.gasCosts[0].amount, quote.gasCosts[0].token?.decimals || 18)} {quote.gasCosts[0].token?.symbol || 'ETH'}</span>
                </div>
              )}
            </div>
          )}
          {oftQuote && (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>Via</span><span className="text-telos-cyan font-medium">⚡ LayerZero OFT</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Rate</span><span className="text-gray-300">1:1 — no slippage</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Fee</span><span className="text-gray-300">~{parseFloat(oftQuote.nativeFeeFormatted).toFixed(0)} TLOS{oftQuote.feeEstimated ? ' (est · excess refunded)' : ''}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Time</span><span className="text-gray-300">~2 min</span>
              </div>
            </div>
          )}

          {/* Settings */}
          {showSettings && (
            <div className="bg-white/[0.02] rounded-xl p-3 space-y-2 border border-white/[0.04]">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Slippage</p>
              <div className="flex gap-2">
                {[0.5, 1, 2].map(s => (
                  <button key={s} onClick={() => setSlippage(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      slippage === s
                        ? 'bg-telos-cyan/10 text-telos-cyan border border-telos-cyan/20'
                        : 'text-gray-500 border border-transparent hover:text-gray-300'
                    }`}>
                    {s}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl px-4 py-3 text-sm text-red-400 bg-red-500/5 border border-red-500/10">
              {error}
            </div>
          )}

          {/* Status */}
          {bridgeStatus && (
            <div className="rounded-xl px-4 py-3 text-sm text-center text-telos-cyan bg-telos-cyan/5 border border-telos-cyan/10">
              {bridgeStatus}
            </div>
          )}

          {/* CTA */}
          {!address ? (
            <div className="w-full py-4 rounded-xl font-medium text-center text-gray-500 bg-white/[0.04] border border-white/[0.06]">
              Connect wallet to bridge
            </div>
          ) : (
            <button
              onClick={(quote || oftQuote) ? handleBridge : handleQuote}
              disabled={!amount || parseFloat(amount) <= 0 || quoting || bridging || !ready || (telosUnavailable && !isOftRoute)}
              className={`w-full py-4 rounded-xl font-semibold text-base transition-all disabled:opacity-20 disabled:cursor-not-allowed
                ${(quote || oftQuote)
                  ? 'bg-gradient-to-r from-telos-cyan to-telos-blue text-black hover:shadow-lg hover:shadow-telos-cyan/20'
                  : 'bg-white/[0.08] text-white hover:bg-white/[0.12]'
                }`}>
              {!ready ? 'Loading...' : quoting ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Getting quote...
                </span>
              ) : bridging ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Bridging...
                </span>
              ) : (quote || oftQuote) ? 'Bridge' : 'Get Quote'}
            </button>
          )}
        </div>
      </div>

      {/* Footer badges */}
      <div className="flex items-center justify-center gap-3">
        {isOftRoute && (
          <span className="text-[10px] text-telos-cyan/50 bg-telos-cyan/5 rounded-full px-3 py-1 border border-telos-cyan/10">
            ⚡ LayerZero OFT · 1:1 · excess fees refunded
          </span>
        )}
        <button onClick={() => setShowSettings(!showSettings)}
          className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors">
          ⚙ Settings
        </button>
      </div>

      {telosUnavailable && !isOftRoute && (
        <p className="text-center text-[10px] text-gray-600">
          Telos not yet on LiFi — TLOS→TLOS uses direct LayerZero OFT
        </p>
      )}
    </div>
  )
}
