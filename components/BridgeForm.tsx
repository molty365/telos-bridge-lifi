'use client'

import { useState, useEffect, useCallback } from 'react'
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
  const [toChain, setToChain] = useState(1)
  const [fromTokens, setFromTokens] = useState<string[]>([])
  const [toTokens, setToTokens] = useState<string[]>([])
  const [fromToken, setFromToken] = useState('TLOS')
  const [toToken, setToToken] = useState('TLOS')
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
      setToTokens(await getTokensForChain(1))
    })
  }, [])

  useEffect(() => {
    if (!ready) return
    getTokensForChain(fromChain).then(t => {
      setFromTokens(t)
      if (!t.includes(fromToken)) setFromToken(t[0] || 'USDC')
    })
  }, [fromChain, ready])

  useEffect(() => {
    if (!ready) return
    getTokensForChain(toChain).then(t => {
      setToTokens(t)
      if (!t.includes(toToken)) setToToken(t[0] || 'USDC')
    })
  }, [toChain, ready])

  const handleQuote = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return
    setQuoting(true); setError(null); setQuote(null); setOftQuote(null)
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
        setError(`No route for ${fromToken} → ${toToken}. Try USDC or ETH for best liquidity.`)
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
    const fc = fromChain, ft = fromToken
    setFromChain(toChain); setToChain(fc)
    setFromToken(toToken); setToToken(ft)
    setQuote(null); setOftQuote(null); setBridgeStatus(null)
  }

  const fmt = (raw: string, dec: number) => {
    const n = parseFloat(raw) / 10 ** dec
    return n < 0.001 ? n.toExponential(2) : n.toFixed(Math.min(6, dec))
  }

  const handleMax = () => {
    if (displayBalance) { setAmount(displayBalance.formatted); setQuote(null) }
  }

  const chainName = (id: number) => chains.find(c => c.id === id)?.name || `Chain ${id}`
  const telosUnavailable = ready && !isChainAvailable(40) && (fromChain === 40 || toChain === 40)

  return (
    <div className="space-y-4">
      {/* Main card */}
      <div className="bg-[#12121a]/80 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-5 space-y-4 shadow-2xl shadow-black/40">

        {/* Settings toggle */}
        <div className="flex justify-end">
          <button onClick={() => setShowSettings(!showSettings)}
            className="text-gray-500 hover:text-gray-300 transition-colors text-lg">⚙️</button>
        </div>

        {/* Chain selector row */}
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-[#1a1a28] rounded-xl p-3 cursor-pointer hover:bg-[#1e1e30] transition-colors">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">From</p>
            <select value={fromChain} onChange={e => { setFromChain(Number(e.target.value)); setQuote(null); setOftQuote(null) }}
              className="w-full bg-transparent text-white font-semibold text-sm outline-none cursor-pointer">
              {chains.map(c => (
                <option key={c.id} value={c.id}>{CHAIN_ICONS[c.id] || '⬡'} {c.name}{c.id === 40 && !isChainAvailable(40) ? ' ✦' : ''}</option>
              ))}
            </select>
          </div>

          <button onClick={swap}
            className="w-9 h-9 rounded-full bg-[#1a1a28] border border-gray-700/50 flex items-center justify-center hover:border-telos-cyan/50 hover:bg-telos-cyan/5 transition-all text-gray-400 hover:text-telos-cyan shrink-0">
            →
          </button>

          <div className="flex-1 bg-[#1a1a28] rounded-xl p-3 cursor-pointer hover:bg-[#1e1e30] transition-colors">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">To</p>
            <select value={toChain} onChange={e => { setToChain(Number(e.target.value)); setQuote(null); setOftQuote(null) }}
              className="w-full bg-transparent text-white font-semibold text-sm outline-none cursor-pointer">
              {chains.map(c => (
                <option key={c.id} value={c.id}>{CHAIN_ICONS[c.id] || '⬡'} {c.name}{c.id === 40 && !isChainAvailable(40) ? ' ✦' : ''}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount input */}
        <div className="bg-[#1a1a28] rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <input type="number" placeholder="0" value={amount}
              onChange={e => { setAmount(e.target.value); setQuote(null); setOftQuote(null) }}
              className="flex-1 bg-transparent text-3xl font-light text-white outline-none placeholder-gray-600 min-w-0" />
            <select value={fromToken} onChange={e => { setFromToken(e.target.value); setQuote(null); setOftQuote(null) }}
              className="bg-[#252535] border border-gray-700/50 rounded-lg px-3 py-2 text-sm font-medium outline-none cursor-pointer hover:border-gray-600 transition-colors ml-3">
              {fromTokens.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {address && displayBalance && (
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Balance: {parseFloat(displayBalance.formatted).toFixed(4)} {displayBalance.symbol}</span>
              <button onClick={handleMax} className="text-telos-cyan/70 hover:text-telos-cyan transition-colors font-medium">MAX</button>
            </div>
          )}
        </div>

        {/* Receive (if quote exists) */}
        {(quote || oftQuote) && (
          <div className="bg-[#1a1a28] rounded-xl p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">You receive</p>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-light text-telos-cyan">
                {oftQuote ? amount : quote ? fmt(quote.toAmount, quote.toToken.decimals) : ''}
              </span>
              <span className="text-sm text-gray-400 font-medium">
                {oftQuote ? toToken : quote?.toToken?.symbol}
                {' on '}{chainName(toChain)}
              </span>
            </div>
          </div>
        )}

        {/* To token selector (when different from/to tokens) */}
        {!isOftRoute && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Receive as:</span>
            <select value={toToken} onChange={e => { setToToken(e.target.value); setQuote(null) }}
              className="bg-[#1a1a28] border border-gray-700/50 rounded-lg px-2 py-1 text-xs outline-none cursor-pointer">
              {toTokens.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}

        {/* Slippage (hidden by default) */}
        {showSettings && (
          <div className="bg-[#0e0e18] rounded-xl p-3 space-y-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Slippage Tolerance</p>
            <div className="flex gap-2">
              {[0.5, 1, 2].map(s => (
                <button key={s} onClick={() => setSlippage(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    slippage === s
                      ? 'bg-telos-cyan/15 text-telos-cyan border border-telos-cyan/30'
                      : 'bg-[#1a1a28] text-gray-400 border border-transparent hover:border-gray-700'
                  }`}>
                  {s}%
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Route details */}
        {quote && (
          <div className="space-y-1.5 text-xs text-gray-500 px-1">
            <div className="flex justify-between"><span>Route</span><span className="text-gray-300">{quote.tool}</span></div>
            <div className="flex justify-between"><span>Time</span><span className="text-gray-300">~{Math.ceil(quote.executionDuration / 60)} min</span></div>
            <div className="flex justify-between"><span>Min received</span><span className="text-gray-300">{fmt(quote.toAmountMin, quote.toToken.decimals)} {quote.toToken.symbol}</span></div>
            {quote.gasCosts?.length > 0 && (
              <div className="flex justify-between"><span>Gas</span><span className="text-gray-300">{fmt(quote.gasCosts[0].amount, quote.gasCosts[0].token?.decimals || 18)} {quote.gasCosts[0].token?.symbol || 'ETH'}</span></div>
            )}
          </div>
        )}
        {oftQuote && (
          <div className="space-y-1.5 text-xs text-gray-500 px-1">
            <div className="flex justify-between"><span>Route</span><span className="text-telos-cyan">⚡ LayerZero OFT</span></div>
            <div className="flex justify-between"><span>Transfer</span><span className="text-gray-300">1:1 — no slippage</span></div>
            <div className="flex justify-between"><span>LZ Fee</span><span className="text-gray-300">{parseFloat(oftQuote.nativeFeeFormatted).toFixed(2)} TLOS {oftQuote.feeEstimated ? '(est.)' : ''}</span></div>
            <div className="flex justify-between"><span>Time</span><span className="text-gray-300">~2 min</span></div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Status */}
        {bridgeStatus && (
          <div className="bg-telos-cyan/5 border border-telos-cyan/15 rounded-xl px-4 py-3 text-sm text-center text-telos-cyan">
            {bridgeStatus}
          </div>
        )}

        {/* Action button */}
        {!address ? (
          <div className="w-full py-4 rounded-xl font-semibold text-center text-gray-500 bg-[#1a1a28] border border-gray-800/50">
            Connect wallet to bridge
          </div>
        ) : (
          <button
            onClick={(quote || oftQuote) ? handleBridge : handleQuote}
            disabled={!amount || parseFloat(amount) <= 0 || quoting || bridging || !ready || (telosUnavailable && !isOftRoute)}
            className="w-full py-4 rounded-xl font-semibold text-base bg-gradient-to-r from-telos-cyan via-telos-blue to-telos-purple text-white disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all shadow-lg shadow-telos-cyan/10">
            {!ready ? 'Loading...' : quoting ? 'Getting quote...' : bridging ? 'Bridging...' : (quote || oftQuote) ? '🚀 Bridge' : isOftRoute ? '⚡ Get OFT Quote' : 'Get Quote'}
          </button>
        )}
      </div>

      {/* OFT badge */}
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
            ✦ Telos on LiFi coming soon — try TLOS→TLOS for direct OFT bridging
          </span>
        </div>
      )}

      <p className="text-center text-[10px] text-gray-600">
        {ready ? `${chains.length} chains · LiFi + LayerZero` : 'Connecting...'}
      </p>
    </div>
  )
}
