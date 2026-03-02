'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount, useBalance, useSwitchChain, useWalletClient, usePublicClient } from 'wagmi'
import { getWalletClient } from '@wagmi/core'
import { config } from '@/lib/wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { SUPPORTED_CHAINS, CHAIN_MAP } from '@/lib/chains'
import { isTlosOftRoute, quoteOftSend, executeOftSend, isMstOftRoute, quoteMstSend, executeMstSend, getMstSupportedChains, TLOS_OFT_ADDRESSES, MST_OFT_ADDRESSES, type OftQuoteResult } from '@/lib/oft'
import { isOftV2Route, getAvailableOftV2Tokens, quoteOftV2Send, executeOftV2Send, OFT_V2_TOKENS, type OftV2QuoteResult, type OftV2Token } from '@/lib/oft-v2'
import type { Address } from 'viem'

const CHAIN_COLORS: Record<number, string> = {
  1: '#627EEA', 40: '#00F2FE', 8453: '#0052FF', 56: '#F0B90B',
  42161: '#28A0F0', 137: '#8247E5', 43114: '#E84142', 10: '#FF0420',
}

const TOKEN_LOGOS: Record<string, string> = {
  TLOS: '/telos-bridge-lifi/tokens/TLOS.svg',
  USDC: '/telos-bridge-lifi/tokens/USDC.png',
  USDT: '/telos-bridge-lifi/tokens/USDT.png',
  ETH: '/telos-bridge-lifi/tokens/ETH.png',
  WBTC: '/telos-bridge-lifi/tokens/WBTC.png',
  MST: '/telos-bridge-lifi/tokens/MST.svg',
}

const TOKEN_NAMES: Record<string, string> = {
  TLOS: 'Telos',
  USDC: 'Bridged USDC (Stargate)',
  USDT: 'Tether USD',
  ETH: 'Ethereum',
  WBTC: 'Wrapped BTC',
  MST: 'Meridian Token',
}

export function BridgeForm() {
  const { address, chainId: walletChainId } = useAccount()
  const { connectModalOpen, openConnectModal } = useConnectModal()
  const { switchChainAsync } = useSwitchChain()
  const { data: walletClient } = useWalletClient()
  const [fromChain, setFromChain] = useState(40)
  const [toChain, setToChain] = useState(8453)
  const [chainSearch, setChainSearch] = useState('')
  const [showChainDropdown, setShowChainDropdown] = useState<number | null>(null) // 0=from, 1=to, null=closed
  const [tokenSearch, setTokenSearch] = useState('')
  const [showTokenDropdown, setShowTokenDropdown] = useState(false)
  const [token, setToken] = useState('TLOS')
  const [amount, setAmount] = useState('')
  const [slippage, setSlippage] = useState(0.5)
  const [showSettings, setShowSettings] = useState(false)

  const [quoting, setQuoting] = useState(false)
  const [oftQuote, setOftQuote] = useState<OftQuoteResult | null>(null)
  const [v2Quote, setV2Quote] = useState<OftV2QuoteResult | null>(null)
  const [error, setError] = useState<string | null>(null)
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

  // ERC-20 token address for balance lookup
  // TLOS on non-Telos chains = OFT contract
  // WBTC on any chain = OFT contract (peers map)
  // ETH/USDC/USDT on non-Telos chains = native ETH (no token address needed)
  const erc20TokenAddress: Address | undefined = (() => {
    if (token === 'TLOS' && fromChain !== 40) return TLOS_OFT_ADDRESSES[fromChain] as Address
    if (token === 'WBTC') return (OFT_V2_TOKENS['WBTC']?.peers?.[fromChain] ?? OFT_V2_TOKENS['WBTC']?.address) as Address | undefined
    return undefined
  })()

  const { data: erc20Balance } = useBalance({
    address,
    chainId: fromChain,
    token: erc20TokenAddress,
  })

  // On Telos, TLOS is native. On other chains, TLOS is ERC-20. WBTC is always ERC-20.
  const displayBalance = erc20TokenAddress ? erc20Balance : nativeBalance

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

  // Filter chains by search term
  const searchedChains = chainSearch 
    ? filteredChains.filter(c => c.name.toLowerCase().includes(chainSearch.toLowerCase()))
    : filteredChains

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

  // Filter tokens by search
  const searchedTokens = tokenSearch
    ? tokenList.filter(t => t.toLowerCase().includes(tokenSearch.toLowerCase()))
    : tokenList

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
        setError(`${token} cannot be bridged on this route`)
      }
    } catch (e: any) {
      setError(e.message || 'Failed to get quote')
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
      // Always get a fresh walletClient bound to fromChain — the hook value can be stale after a switch
      const freshWalletClient = await getWalletClient(config, { chainId: fromChain })
      if (!freshWalletClient) throw new Error('Could not get wallet client for chain')

      if (oftQuote && isMst) {
        await executeMstSend(freshWalletClient, publicClient, fromChain, toChain, amount,
          address, address, (s: string) => setBridgeStatus(s))
        setOftQuote(null)
      } else if (oftQuote) {
        await executeOftSend(freshWalletClient, publicClient, fromChain, toChain, amount,
          address, address, slippage, (s: string) => setBridgeStatus(s))
        setOftQuote(null)
      } else if (v2Quote) {
        await executeOftV2Send(freshWalletClient, publicClient, token, fromChain, toChain, amount,
          address, address, (s: string) => setBridgeStatus(s))
        setV2Quote(null)
      }
      setBridgeStatus('✅ Bridge complete! Funds arriving shortly.')
      setAmount('')
    } catch (e: any) {
      const msg = e.message || 'Bridge failed'
      setError(msg.includes('rejected') || msg.includes('denied') ? 'Transaction rejected' : msg)
      setBridgeStatus(null)
    } finally { setBridging(false) }
  }, [oftQuote, v2Quote, address, walletClient, publicClient, walletChainId, fromChain, toChain, switchChainAsync, amount, slippage, displayBalance, token, isMst])

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

  const feeCurrency = CHAIN_MAP.get(fromChain)?.nativeCurrency || 'TLOS'
  const formatFee = (val: string) => {
    const n = parseFloat(val)
    if (n >= 1) return n.toFixed(3)
    if (n >= 0.001) return n.toFixed(4)
    return n.toFixed(6)
  }
  const feeDisplay = oftQuote
    ? `~${formatFee(oftQuote.nativeFeeFormatted)} ${feeCurrency}`
    : v2Quote
    ? `~${formatFee(v2Quote.nativeFeeFormatted)} ${feeCurrency}`
    : ''

  return (
    <div className="space-y-3">
      {/* Toolbar icons above the bridge frame */}
      <div className="flex justify-end gap-3 pr-1">
        <button className="w-9 h-9 rounded-full bg-[#1a1a28]/80 border border-gray-800/50 flex items-center justify-center text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-all" title="Transaction History">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </button>
        <button onClick={() => setShowSettings(!showSettings)} className="w-9 h-9 rounded-full bg-[#1a1a28]/80 border border-gray-800/50 flex items-center justify-center text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-all" title="Settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>

      <div className="bg-gradient-to-br from-gray-800/30 via-gray-700/10 to-gray-800/30 p-[1px] rounded-2xl">
        <div className="bg-[#12121a]/80 backdrop-blur-xl rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xl shadow-black/40">

        {/* Chain selector row */}
        {/* Mobile bottom sheet + desktop backdrop */}
        {(showChainDropdown !== null || showTokenDropdown) && (
          <>
            {/* Desktop: transparent click-away */}
            <div className="fixed inset-0 z-40 hidden sm:block" onClick={() => { setShowChainDropdown(null); setShowTokenDropdown(false); setChainSearch(''); setTokenSearch(''); }} />
            {/* Mobile: Superbridge-style bottom sheet */}
            <div className="fixed inset-0 z-50 sm:hidden flex flex-col justify-end">
              {/* Blurred backdrop */}
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { setShowChainDropdown(null); setShowTokenDropdown(false); setChainSearch(''); setTokenSearch(''); }} />
              <div className="relative bg-[#1c1c1e] rounded-t-3xl flex flex-col" style={{ maxHeight: '85vh', paddingBottom: 'env(safe-area-inset-bottom)' }}>
                {/* Header: title + X */}
                <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
                  <p className="text-white font-bold text-xl">
                    {showTokenDropdown ? 'Select a token' : showChainDropdown === 0 ? 'From chain' : 'To chain'}
                  </p>
                  <button
                    onClick={() => { setShowChainDropdown(null); setShowTokenDropdown(false); setChainSearch(''); setTokenSearch(''); }}
                    className="w-7 h-7 rounded-full bg-[#2c2c2e] flex items-center justify-center text-gray-400 hover:text-white">
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  </button>
                </div>
                {/* Search */}
                <div className="px-4 pb-2 shrink-0">
                  <input
                    type="text"
                    placeholder="Search"
                    value={showTokenDropdown ? tokenSearch : chainSearch}
                    onChange={e => showTokenDropdown ? setTokenSearch(e.target.value) : setChainSearch(e.target.value)}
                    className="w-full bg-[#2c2c2e] text-white placeholder-gray-500 px-4 py-2.5 rounded-xl outline-none"
                    style={{ fontSize: '16px' }}
                  />
                </div>
                {/* List / Grid */}
                <div className="overflow-y-auto flex-1 px-3 pb-3">
                  {showTokenDropdown
                    ? searchedTokens.map(t => (
                        <div key={t} onClick={() => { setToken(t); setShowTokenDropdown(false); setTokenSearch(''); }}
                          className={`flex items-center gap-4 px-3 py-3.5 rounded-2xl cursor-pointer active:bg-[#2c2c2e] ${t === token ? 'bg-[#2c2c2e]' : ''}`}>
                          {TOKEN_LOGOS[t]
                            ? <img src={TOKEN_LOGOS[t]} alt="" className="w-10 h-10 rounded-full shrink-0" />
                            : <div className="w-10 h-10 rounded-full bg-gray-700 shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-base leading-tight">{TOKEN_NAMES[t] || t}</p>
                            <p className="text-gray-500 text-sm leading-tight mt-0.5">{t}</p>
                          </div>
                          <span className="text-gray-500 text-base">0</span>
                        </div>
                      ))
                    : (
                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                          {searchedChains.map(c => {
                            const isSelected = c.id === (showChainDropdown === 0 ? fromChain : toChain)
                            const bg = CHAIN_COLORS[c.id] || '#3a3a4a'
                            return (
                              <div key={c.id} onClick={() => {
                                if (showChainDropdown === 0) handleFromChain(c.id); else handleToChain(c.id)
                                setShowChainDropdown(null); setChainSearch('');
                              }}
                                className={`relative flex flex-col items-center justify-center gap-1 rounded-xl p-2.5 cursor-pointer active:scale-95 transition-transform ${isSelected ? 'ring-2 ring-telos-cyan' : ''}`}
                                style={{ background: `${bg}22` }}>
                                {chainIcon(c.id)
                                  ? <img src={chainIcon(c.id)} alt="" className="w-7 h-7 rounded-lg" />
                                  : <div className="w-7 h-7 rounded-lg" style={{ background: bg }} />}
                                <p className="text-white text-xs font-medium text-center leading-tight line-clamp-2">{c.name}</p>
                                {isSelected && <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-telos-cyan flex items-center justify-center">
                                  <svg width="7" height="5" viewBox="0 0 8 6" fill="none"><path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </div>}
                              </div>
                            )
                          })}
                        </div>
                      )
                  }
                </div>
              </div>
            </div>
          </>
        )}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex-1 min-w-0 bg-[#1a1a28] rounded-xl p-2.5 sm:p-3 hover:bg-[#1e1e30] hover:border hover:border-gray-600/30 transition-all duration-200 relative">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">From</p>
            <div className="flex items-center gap-2 sm:gap-3" onClick={() => setShowChainDropdown(showChainDropdown === 0 ? null : 0)}>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
                style={{ background: `${CHAIN_COLORS[fromChain] || '#666'}30` }}>
                {chainIcon(fromChain) && <img src={chainIcon(fromChain)} alt="" className="w-5 h-5 sm:w-6 sm:h-6" />}
              </div>
              <div className="flex-1 min-w-0 truncate text-white font-semibold text-sm sm:text-base cursor-pointer flex items-center gap-1">
                {chainName(fromChain)}
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
            {/* Searchable Dropdown */}
            {showChainDropdown === 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a28] border border-gray-700 rounded-xl z-50 overflow-hidden shadow-xl hidden sm:block">
                <div className="p-2 border-b border-gray-700">
                  <input 
                    type="text" 
                    placeholder="Search chain..." 
                    value={chainSearch}
                    onChange={e => setChainSearch(e.target.value)}
                    className="w-full bg-[#0a0a0f] text-white px-3 py-2 rounded-lg text-base outline-none border border-gray-700 focus:border-telos-cyan"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {searchedChains.map(c => (
                    <div key={c.id} onClick={() => { handleFromChain(c.id); setShowChainDropdown(null); setChainSearch(''); }}
                      className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-800 ${c.id === fromChain ? 'bg-gray-800' : ''}`}>
                      {chainIcon(c.id) && <img src={chainIcon(c.id)} alt="" className="w-5 h-5" />}
                      <span className="text-white text-sm">{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button onClick={swap}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#1a1a28] border border-gray-700/50 flex items-center justify-center hover:border-telos-cyan/50 hover:bg-telos-cyan/5 hover:rotate-180 duration-300 text-gray-400 hover:text-telos-cyan shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 2L13 5L10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 5H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M6 14L3 11L6 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M13 11H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>

          <div className="flex-1 min-w-0 bg-[#1a1a28] rounded-xl p-2.5 sm:p-3 hover:bg-[#1e1e30] hover:border hover:border-gray-600/30 transition-all duration-200 relative">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">To</p>
            <div className="flex items-center gap-2 sm:gap-3" onClick={() => setShowChainDropdown(showChainDropdown === 1 ? null : 1)}>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
                style={{ background: `${CHAIN_COLORS[toChain] || '#666'}30` }}>
                {chainIcon(toChain) && <img src={chainIcon(toChain)} alt="" className="w-5 h-5 sm:w-6 sm:h-6" />}
              </div>
              <div className="flex-1 min-w-0 truncate text-white font-semibold text-sm sm:text-base cursor-pointer flex items-center gap-1">
                {chainName(toChain)}
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
            {/* Searchable Dropdown */}
            {showChainDropdown === 1 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a28] border border-gray-700 rounded-xl z-50 overflow-hidden shadow-xl hidden sm:block">
                <div className="p-2 border-b border-gray-700">
                  <input 
                    type="text" 
                    placeholder="Search chain..." 
                    value={chainSearch}
                    onChange={e => setChainSearch(e.target.value)}
                    className="w-full bg-[#0a0a0f] text-white px-3 py-2 rounded-lg text-base outline-none border border-gray-700 focus:border-telos-cyan"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {searchedChains.map(c => (
                    <div key={c.id} onClick={() => { handleToChain(c.id); setShowChainDropdown(null); setChainSearch(''); }}
                      className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-800 ${c.id === toChain ? 'bg-gray-800' : ''}`}>
                      {chainIcon(c.id) && <img src={chainIcon(c.id)} alt="" className="w-5 h-5" />}
                      <span className="text-white text-sm">{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Subtle separator */}
        <div className="border-t border-white/[0.03]"></div>

        {/* Amount input */}
        <div className="bg-[#1a1a28] rounded-xl p-3 sm:p-4 space-y-2 focus-within:ring-1 focus-within:ring-telos-cyan/30 transition-all duration-200">
          <div className="flex items-center justify-between">
            <input type="number" inputMode="decimal" placeholder="0.00" value={amount}
              onChange={e => setAmount(e.target.value)}
              className={`flex-1 bg-transparent text-2xl sm:text-4xl font-light ${insufficientBalance ? 'text-red-400' : 'text-white'} outline-none placeholder-gray-500 min-w-0 tabular-nums`} />
            <div className="flex items-center gap-2.5 bg-gradient-to-br from-[#252535] to-[#1e1e2e] border border-gray-700/50 rounded-xl px-4 py-3 ml-4 relative">
              {TOKEN_LOGOS[token] && <img src={TOKEN_LOGOS[token]} alt="" className="w-6 h-6 rounded-full" />}
              {tokenList.length > 1 ? (
                <div className="relative" onClick={() => setShowTokenDropdown(!showTokenDropdown)}>
                  <div className="flex items-center gap-1 cursor-pointer">
                    <span className="text-base font-semibold text-white">{token}</span>
                    <svg className="w-3.5 h-3.5 text-gray-500" viewBox="0 0 12 12" fill="none"><path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </div>
                  {/* Token Dropdown with Search — desktop only, mobile uses bottom sheet */}
                  {showTokenDropdown && (
                    <div className="absolute top-full right-0 mt-2 w-40 bg-[#1a1a28] border border-gray-700 rounded-xl z-50 overflow-hidden shadow-xl hidden sm:block">
                      <div className="p-2 border-b border-gray-700">
                        <input 
                          type="text" 
                          placeholder="Search..." 
                          value={tokenSearch}
                          onChange={e => setTokenSearch(e.target.value)}
                          className="w-full bg-[#0a0a0f] text-white px-2 py-1.5 rounded-lg text-base outline-none border border-gray-700 focus:border-telos-cyan"
                          onClick={e => e.stopPropagation()}
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {searchedTokens.map(t => (
                          <div key={t} onClick={() => { setToken(t); clearQuotes(); setShowTokenDropdown(false); setTokenSearch(''); }}
                            className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-800 ${t === token ? 'bg-gray-800' : ''}`}>
                            {TOKEN_LOGOS[t] && <img src={TOKEN_LOGOS[t]} alt="" className="w-5 h-5 rounded-full" />}
                            <span className="text-white text-sm">{t}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-base font-semibold text-white">{token}</span>
              )}
            </div>
          </div>
          {address && displayBalance && (
            <div className="flex items-center justify-between text-sm">
              <span className={insufficientBalance ? 'text-red-400' : 'text-gray-500'}>
                <svg className="inline w-3 h-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 18v1c0 1.1-.9 2-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14c1.1 0 2 .9 2 2v1h-9a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h9z"/>
                  <path d="M12 16h10V8H12v8zm2-4a2 2 0 1 1 4 0 2 2 0 0 1-4 0z"/>
                </svg>
                {parseFloat(displayBalance.formatted).toFixed(4)} {token} available
              </span>
              <div className="flex gap-2">
                <button onClick={handleHalf} className="text-xs text-gray-500 hover:text-telos-cyan px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-telos-cyan/10 transition-all duration-200 font-medium border border-transparent hover:border-telos-cyan/20">HALF</button>
                <button onClick={handleMax} className="text-xs text-telos-cyan/60 hover:text-telos-cyan px-3 py-1.5 rounded-lg bg-telos-cyan/5 hover:bg-telos-cyan/10 transition-all duration-200 font-medium border border-telos-cyan/20 hover:border-telos-cyan/40">MAX</button>
              </div>
            </div>
          )}
        </div>

        {/* Transaction summary */}
        {(hasQuote || quoting) && (
          <div className="bg-[#111118] rounded-2xl overflow-hidden">
            {/* Row 1: protocol + time */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <span className="inline-flex items-center gap-1.5 bg-[#1e1e28] rounded-full px-2.5 py-1 text-xs text-gray-300 font-medium">
                <img
                  src={(isOft || isMst) ? '/telos-bridge-lifi/lz-logo.png' : '/telos-bridge-lifi/stargate-logo.png'}
                  alt="" className="w-3.5 h-3.5 rounded-full" />
                {(isOft || isMst) ? 'LayerZero' : 'Stargate'}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                ~2m
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </span>
            </div>

            {/* Row 2: amount + logos */}
            <div className="flex items-center gap-3 px-4 pb-3 border-b border-white/[0.05]">
              <div className="relative shrink-0">
                {TOKEN_LOGOS[token]
                  ? <img src={TOKEN_LOGOS[token]} alt="" className="w-11 h-11 rounded-full" />
                  : <div className="w-11 h-11 rounded-full bg-gray-700" />}
                {chainIcon(toChain) && (
                  <img src={chainIcon(toChain)} alt="" className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#111118]" />
                )}
              </div>
              <div>
                {quoting
                  ? <div className="h-8 w-28 bg-gray-800 rounded-lg animate-pulse" />
                  : <p className="text-white font-bold text-2xl leading-none">
                      {v2Quote ? v2Quote.amountReceivedFormatted : amount} {token}
                    </p>}
              </div>
            </div>

            {/* Row 3: fee only */}
            <div className="flex items-center gap-2 px-4 py-2.5">
              {chainIcon(fromChain) && <img src={chainIcon(fromChain)} alt="" className="w-4 h-4 rounded-full" />}
              <span className="text-xs text-red-300 font-medium">{feeDisplay || '…'}</span>
            </div>
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
        {fromChain !== 40 && tokenList.length === 1 && (
          <div className="flex items-center gap-2 bg-telos-cyan/[0.04] border border-telos-cyan/10 rounded-xl px-3.5 py-2.5 text-xs text-telos-cyan/70">
            <span>ℹ</span><span>Only TLOS bridging available on this route</span>
          </div>
        )}

        {/* CTA */}
        {!address ? (
          <button onClick={openConnectModal}
            className="w-full py-5 rounded-2xl font-semibold text-lg bg-gradient-to-r from-telos-cyan via-telos-blue to-telos-purple text-white hover:opacity-90 hover:shadow-xl hover:shadow-telos-cyan/20 transition-all duration-200 shadow-lg shadow-telos-cyan/10 cursor-pointer">
            Connect Wallet to Bridge
          </button>
        ) : (
          <button onClick={hasQuote ? handleBridge : doQuote}
            disabled={!amount || parseFloat(amount) <= 0 || quoting || bridging || fromChain === toChain || (!isOft && !isMst && !isV2) || insufficientBalance}
            className="w-full py-5 rounded-2xl font-semibold text-lg bg-gradient-to-r from-telos-cyan via-telos-blue to-telos-purple text-white disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 hover:shadow-xl hover:shadow-telos-cyan/20 transition-all duration-200 shadow-lg shadow-telos-cyan/10 relative overflow-hidden group">
            <span className="relative z-10">{insufficientBalance ? 'Insufficient balance' : quoting ? 'Getting quote...' : bridging ? 'Bridging...' : hasQuote ? `⚡ Bridge ${token}` : 'Get Quote'}</span>
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
