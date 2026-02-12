'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { dynamicChains, type ChainInfo } from '@/lib/chains'
import { initLiFi, isChainAvailable, fetchQuote, getTokensForChain } from '@/lib/lifi'

export function BridgeForm() {
  const { address } = useAccount()
  const [chains, setChains] = useState<ChainInfo[]>([])
  const [fromChain, setFromChain] = useState(1)
  const [toChain, setToChain] = useState(40)
  const [fromTokens, setFromTokens] = useState<string[]>([])
  const [toTokens, setToTokens] = useState<string[]>([])
  const [fromToken, setFromToken] = useState('USDC')
  const [toToken, setToToken] = useState('USDC')
  const [amount, setAmount] = useState('')
  const [slippage, setSlippage] = useState(0.5)

  const [quoting, setQuoting] = useState(false)
  const [quote, setQuote] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initLiFi().then(async () => {
      setChains([...dynamicChains])
      setReady(true)
      // Load tokens for default chains
      setFromTokens(await getTokensForChain(1))
      setToTokens(await getTokensForChain(40))
    })
  }, [])

  // Update tokens when chain changes
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
    setQuoting(true); setError(null); setQuote(null)
    try {
      const q = await fetchQuote({
        fromChainId: fromChain, toChainId: toChain,
        fromTokenSymbol: fromToken, toTokenSymbol: toToken,
        amount, slippage, fromAddress: address,
      })
      setQuote(q)
    } catch (e: any) {
      setError(e.message || 'Failed to get quote')
    } finally { setQuoting(false) }
  }, [fromChain, toChain, fromToken, toToken, amount, slippage, address])

  const swap = () => {
    const fc = fromChain, ft = fromToken
    setFromChain(toChain); setToChain(fc)
    setFromToken(toToken); setToToken(ft)
    setQuote(null)
  }

  const fmt = (raw: string, dec: number) => {
    const n = parseFloat(raw) / 10 ** dec
    return n < 0.001 ? n.toExponential(2) : n.toFixed(Math.min(6, dec))
  }

  const telosUnavailable = ready && !isChainAvailable(40) && (fromChain === 40 || toChain === 40)

  return (
    <div className="bg-[#12121a] border border-gray-800 rounded-2xl p-6 space-y-5">
      {/* From */}
      <div className="space-y-2">
        <label className="text-xs text-gray-500 uppercase tracking-wider">From</label>
        <div className="flex gap-3">
          <select value={fromChain} onChange={e => { setFromChain(Number(e.target.value)); setQuote(null) }}
            className="flex-1 bg-[#1a1a25] border border-gray-700 rounded-xl px-4 py-3 text-sm focus:border-telos-cyan outline-none">
            {chains.map(c => (
              <option key={c.id} value={c.id}>{c.name}{c.id === 40 && !isChainAvailable(40) ? ' (Coming Soon)' : ''}</option>
            ))}
          </select>
          <select value={fromToken} onChange={e => { setFromToken(e.target.value); setQuote(null) }}
            className="w-28 bg-[#1a1a25] border border-gray-700 rounded-xl px-4 py-3 text-sm focus:border-telos-cyan outline-none">
            {fromTokens.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <input type="number" placeholder="0.0" value={amount}
          onChange={e => { setAmount(e.target.value); setQuote(null) }}
          className="w-full bg-[#1a1a25] border border-gray-700 rounded-xl px-4 py-3 text-2xl font-mono focus:border-telos-cyan outline-none" />
      </div>

      {/* Swap */}
      <div className="flex justify-center">
        <button onClick={swap}
          className="w-10 h-10 rounded-full bg-[#1a1a25] border border-gray-700 flex items-center justify-center hover:border-telos-cyan transition-colors text-lg">↕</button>
      </div>

      {/* To */}
      <div className="space-y-2">
        <label className="text-xs text-gray-500 uppercase tracking-wider">To</label>
        <div className="flex gap-3">
          <select value={toChain} onChange={e => { setToChain(Number(e.target.value)); setQuote(null) }}
            className="flex-1 bg-[#1a1a25] border border-gray-700 rounded-xl px-4 py-3 text-sm focus:border-telos-cyan outline-none">
            {chains.map(c => (
              <option key={c.id} value={c.id}>{c.name}{c.id === 40 && !isChainAvailable(40) ? ' (Coming Soon)' : ''}</option>
            ))}
          </select>
          <select value={toToken} onChange={e => { setToToken(e.target.value); setQuote(null) }}
            className="w-28 bg-[#1a1a25] border border-gray-700 rounded-xl px-4 py-3 text-sm focus:border-telos-cyan outline-none">
            {toTokens.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {quote && (
          <div className="bg-[#1a1a25] border border-gray-700 rounded-xl px-4 py-3 text-2xl font-mono text-telos-cyan">
            {fmt(quote.toAmount, quote.toToken.decimals)}
          </div>
        )}
      </div>

      {/* Slippage */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Slippage</span>
        <div className="flex gap-2">
          {[0.5, 1, 2].map(s => (
            <button key={s} onClick={() => setSlippage(s)}
              className={`px-3 py-1 rounded-lg border ${slippage === s ? 'border-telos-cyan text-telos-cyan bg-telos-cyan/10' : 'border-gray-700 hover:border-gray-600'}`}>
              {s}%
            </button>
          ))}
        </div>
      </div>

      {/* Quote details */}
      {quote && (
        <div className="bg-[#0a0a0f] rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between text-gray-400"><span>Route</span><span className="text-white">{quote.tool}</span></div>
          <div className="flex justify-between text-gray-400"><span>Est. time</span><span className="text-white">{Math.ceil(quote.executionDuration / 60)} min</span></div>
          <div className="flex justify-between text-gray-400"><span>Min received</span><span className="text-white">{fmt(quote.toAmountMin, quote.toToken.decimals)} {quote.toToken.symbol}</span></div>
          {quote.gasCosts.length > 0 && (
            <div className="flex justify-between text-gray-400"><span>Gas</span><span className="text-white">{fmt(quote.gasCosts[0].amount, quote.gasCosts[0].token?.decimals || 18)} {quote.gasCosts[0].token?.symbol || 'ETH'}</span></div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">{error}</div>
      )}

      <button onClick={handleQuote}
        disabled={!amount || parseFloat(amount) <= 0 || quoting || !ready || telosUnavailable}
        className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-telos-cyan to-telos-blue text-black disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity">
        {!ready ? 'Loading chains...' : quoting ? 'Getting Quote...' : quote ? 'Bridge' : 'Get Quote'}
      </button>

      {telosUnavailable && (
        <div className="bg-telos-purple/10 border border-telos-purple/30 rounded-xl p-3 text-sm text-center text-telos-purple">
          ⏳ Telos on LiFi coming soon — select another chain to bridge now!
        </div>
      )}

      <p className="text-center text-xs text-gray-600">
        {ready ? `${chains.length} chains available` : 'Connecting to LiFi...'}
      </p>
    </div>
  )
}
