'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount, useBalance, useSwitchChain, useWalletClient, usePublicClient, useReadContract } from 'wagmi'
import { createPublicClient, http } from 'viem'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { SUPPORTED_CHAINS, CHAIN_MAP } from '@/lib/chains'
import { TOKEN_ICONS } from '@/lib/constants'
import { CHAIN_RPC_URLS } from '@/lib/rpcs'
import { isTlosOftRoute, quoteOftSend, executeOftSend, isMstOftRoute, quoteMstSend, executeMstSend, getMstSupportedChains, TLOS_OFT_ADDRESSES, MST_OFT_ADDRESSES, type OftQuoteResult } from '@/lib/oft'
import { isOftV2Route, getAvailableOftV2Tokens, quoteOftV2Send, executeOftV2Send, OFT_V2_TOKENS, type OftV2QuoteResult } from '@/lib/oft-v2'
import { AmountInput } from './AmountInput'
import { ChainSelectorModal } from './ChainSelectorModal'
import { TokenSelectorModal } from './TokenSelectorModal'
import { LoadingSpinner, SkeletonLoader } from './LoadingSpinner'
import { QuoteDisplay } from './QuoteDisplay'
import { BridgeSettings } from './BridgeSettings'
import { ErrorDisplay, createError, type ErrorInfo } from './ErrorDisplay'
import { TransactionStepper, type TransactionStep } from './TransactionStepper'
import { RecentTransactions, addTransaction, updateTransaction, type BridgeTransaction } from './RecentTransactions'
import { SuccessCelebration } from './SuccessCelebration'
import { useAnimation } from './AnimationProvider'

// Token logos for the "You receive" section
const TOKEN_LOGOS = TOKEN_ICONS

// ERC20 ABI for balanceOf
const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: 'balance', type: 'uint256' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
]

// Get token address on a given chain
function getTokenAddress(token: string, chainId: number): string | undefined {
  // TLOS is native
  if (token === 'TLOS') return undefined
  // MST OFT
  if (token === 'MST' && MST_OFT_ADDRESSES[chainId]) return MST_OFT_ADDRESSES[chainId]
  // V2 OFT tokens (Stargate or LZ)
  const v2Config = OFT_V2_TOKENS[token]
  if (v2Config) {
    if (chainId === 40) return v2Config.address
    return v2Config.peers[chainId]
  }
  return undefined
}

// Canonical token addresses (for balance checking - NOT OFT adapters/pools)
// For Stargate tokens: use the underlying ERC20, not the Stargate pool
// For WBTC: on ETH it's the canonical WBTC, on other chains the OFT IS the token
const CANONICAL_TOKENS: Record<string, Record<number, string>> = {
  USDC: {
    40: '0xF1815bd50389c46847f0Bda824eC8da914045D14',   // Telos: Bridged USDC (Stargate)
    1: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',    // ETH: USDC
    8453: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',  // Base: USDC
    56: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',    // BSC: USDC
    42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum: USDC
    137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',   // Polygon: USDC
    43114: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // Avalanche: USDC
    10: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',    // OP: USDC
    534352: '0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4', // Scroll: USDC
    5000: '0x09Bc4E0D10E52d373A6010e0e42ae39b59ac6320',   // Mantle: USDC
    1329: '0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1',   // Sei: USDC
    100: '0xDDAfBB505ad214D7b80b1f830fcCc89B60fb7A83',    // Gnosis: USDC
  },
  USDT: {
    40: '0x674843C06FF83502ddb4D37c2E09C01cdA38cbc8',   // Telos: USDT
    1: '0xdac17f958d2ee523a2206206994597c13d831ec7',    // ETH: USDT
    56: '0x55d398326f99059ff775485246999027b3197955',    // BSC: USDT
    42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // Arbitrum: USDT
    137: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',   // Polygon: USDT
    43114: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', // Avalanche: USDT
    10: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',    // OP: USDT
    5000: '0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE',   // Mantle: USDT
  },
  WBTC: {
    40: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c',   // Telos: WBTC OFT (IS the token)
    1: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',    // ETH: canonical WBTC (OFT is adapter)
    56: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c',    // BSC: WBTC OFT (IS the token)
    43114: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c', // AVAX: WBTC OFT (IS the token)
    8453: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c',  // Base: WBTC OFT (IS the token)
    10: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',    // OP: canonical WBTC
  },
  ETH: {
    40: '0xBAb93B7ad7fE8692A878B95a8e689423437cc500',   // Telos: WETH underlying
    // On ETH/Base/Arb/OP etc, ETH is the NATIVE token - use native balance, not ERC20
    // Don't add entries here for chains where ETH is native
  },
}

// Get canonical token address for balance checking
function getCanonicalTokenAddress(token: string, chainId: number): string | undefined {
  // TLOS is always native
  if (token === 'TLOS') return undefined
  
  // ETH is native on most chains - only check ERC20 on Telos
  if (token === 'ETH') {
    if (chainId === 40) return CANONICAL_TOKENS['ETH']?.[40]
    return undefined // Use native balance on other chains
  }
  
  // Check canonical mapping first
  if (CANONICAL_TOKENS[token]?.[chainId]) {
    return CANONICAL_TOKENS[token][chainId]
  }
  
  // Fall back to OFT address (for chains not in canonical map)
  return getTokenAddress(token, chainId)
}

export function BridgeForm() {
  const { address, chainId: walletChainId } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { switchChainAsync } = useSwitchChain()
  const { data: walletClient } = useWalletClient()
  const { reduceMotion } = useAnimation()
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
  const [transactionStep, setTransactionStep] = useState<TransactionStep>('idle')
  const [transactionHash, setTransactionHash] = useState<string | undefined>()
  const [currentTransactionId, setCurrentTransactionId] = useState<string | undefined>()
  const [showRecentTransactions, setShowRecentTransactions] = useState(false)
  const [showSuccessCelebration, setShowSuccessCelebration] = useState(false)
  const wagmiPublicClient = usePublicClient({ chainId: fromChain })
  // Fallback: create a direct viem client if wagmi hasn't hydrated yet
  const publicClient = wagmiPublicClient ?? (CHAIN_RPC_URLS[fromChain] ? createPublicClient({
    transport: http(CHAIN_RPC_URLS[fromChain]),
  }) : undefined)
  const quoteTimeout = useRef<NodeJS.Timeout | null>(null)

  const { data: nativeBalance } = useBalance({ address, chainId: fromChain })

  // Get ERC20 token address for the selected token on fromChain
  const tokenAddress = getCanonicalTokenAddress(token, fromChain)

  // Fetch ERC20 balance if token is not native TLOS
  const { data: erc20BalanceData } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!tokenAddress && token !== 'TLOS' }
  })

  const { data: erc20Decimals } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'decimals',
    query: { enabled: !!tokenAddress && token !== 'TLOS' }
  })

  // Combine native and ERC20 balance
  // For TLOS: always use native balance
  // For ETH on non-Telos chains: use native balance (ETH is native)
  // For ERC20 tokens: use ERC20 balance
  let displayBalance = nativeBalance
  const isNativeToken = token === 'TLOS' || (token === 'ETH' && fromChain !== 40)
  
  if (!isNativeToken && erc20BalanceData !== undefined && erc20Decimals !== undefined) {
    const bal = BigInt(erc20BalanceData as any)
    const dec = Number(erc20Decimals)
    displayBalance = {
      ...nativeBalance,
      formatted: (Number(bal) / Math.pow(10, dec)).toString(),
      value: bal,
      decimals: dec,
      symbol: token,
    } as any
  } else if (token === 'ETH' && fromChain !== 40 && nativeBalance) {
    // ETH on non-Telos chains: show native balance with ETH symbol
    displayBalance = {
      ...nativeBalance,
      symbol: 'ETH',
    } as any
  }

  const isOft = isTlosOftRoute(fromChain, toChain, token, token)
  const isMst = isMstOftRoute(fromChain, toChain, token, token)
  const isV2 = !isOft && !isMst && isOftV2Route(token, fromChain, toChain)
  const hasQuote = !!(oftQuote || v2Quote)
  const wrongNetwork = address && walletChainId !== fromChain

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

  const clearQuotes = () => { 
    setOftQuote(null); setV2Quote(null); setError(null); setBridgeStatus(null);
    setTransactionStep('idle'); setTransactionHash(undefined); setCurrentTransactionId(undefined);
    setShowSuccessCelebration(false);
  }

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
    setTransactionStep('submitted')

    // Create transaction record in localStorage
    const transaction = addTransaction({
      fromChain,
      toChain,
      token,
      amount,
      status: 'pending',
    })
    setCurrentTransactionId(transaction.id)

    // Enhanced status callback that updates both status and stepper
    const updateProgress = (status: string, hash?: string) => {
      // Extract tx hash from LZ status messages like "✅ TLOS bridged via LayerZero! Track at layerzeroscan.com/tx/0x..."
      const hashMatch = status.match(/0x[a-fA-F0-9]{60,66}/)
      const extractedHash = hash || (hashMatch ? hashMatch[0] : undefined)

      // Clean display status — strip the tracking URL part
      const displayStatus = status.replace(/Track at layerzeroscan\.com\/tx\/\S+/, '').trim()
      setBridgeStatus(displayStatus)
      
      if (extractedHash && !transactionHash) {
        setTransactionHash(extractedHash)
        if (transaction.id) {
          updateTransaction(transaction.id, { txHash: extractedHash })
        }
      }
      
      // Update stepper based on status keywords
      if (status.toLowerCase().includes('confirm')) {
        setTransactionStep('confirming')
      } else if (status.toLowerCase().includes('bridg') || status.toLowerCase().includes('relay')) {
        setTransactionStep('bridging')
      } else if (status.toLowerCase().includes('complete') || status.toLowerCase().includes('✅')) {
        setTransactionStep('completed')
        // Mark transaction as completed
        if (transaction.id) {
          updateTransaction(transaction.id, { status: 'completed' })
        }
        // Trigger success celebration
        setShowSuccessCelebration(true)
      }
    }

    try {
      if (walletChainId !== fromChain) {
        setBridgeStatus('Switching network…')
        await switchChainAsync({ chainId: fromChain })
      }
      if (oftQuote && isMst) {
        await executeMstSend(walletClient, publicClient, fromChain, toChain, amount,
          address, address, updateProgress)
        setOftQuote(null)
      } else if (oftQuote) {
        await executeOftSend(walletClient, publicClient, fromChain, toChain, amount,
          address, address, slippage, updateProgress)
        setOftQuote(null)
      } else if (v2Quote) {
        await executeOftV2Send(walletClient, publicClient, token, fromChain, toChain, amount,
          address, address, updateProgress)
        setV2Quote(null)
      }
      setBridgeStatus('Bridge complete. Funds arriving shortly.')
      setTransactionStep('completed')
      setShowSuccessCelebration(true)
      // Ensure transaction is marked completed in localStorage
      if (transaction.id) {
        updateTransaction(transaction.id, { status: 'completed' })
      }
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
      setTransactionStep('idle')
      // Mark transaction as failed
      if (transaction.id) {
        updateTransaction(transaction.id, { status: 'failed' })
      }
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
    <div className={`space-y-4 sm:space-y-6 ${
      reduceMotion ? '' : 'animate-in slide-in-from-bottom-4 fade-in duration-700 delay-300'
    }`}>
      {/* Toolbar icons above the bridge frame */}
      <div className={`flex justify-end gap-3 sm:gap-3 ${
        reduceMotion ? '' : 'animate-in slide-in-from-right-3 fade-in duration-500 delay-500'
      }`}>
        <button 
          onClick={() => setShowRecentTransactions(true)}
          className="w-11 h-11 sm:w-9 sm:h-9 rounded-full bg-[#1a1a28]/80 border border-gray-800/50 flex items-center justify-center text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-all active:scale-95" 
          title="Transaction History"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </button>
        <button onClick={() => setShowSettings(!showSettings)} className="w-11 h-11 sm:w-9 sm:h-9 rounded-full bg-[#1a1a28]/80 border border-gray-800/50 flex items-center justify-center text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-all active:scale-95" title="Settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>

      <div className={`bg-gradient-to-br from-gray-800/30 via-gray-700/10 to-gray-800/30 p-[1px] rounded-2xl ${
        reduceMotion ? '' : 'animate-in slide-in-from-bottom-5 fade-in duration-800 delay-400'
      }`}>
        <div className="bg-[#12121a]/80 backdrop-blur-xl rounded-2xl p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-5 shadow-2xl shadow-black/40 transition-all duration-300 hover:shadow-3xl hover:shadow-telos-cyan/5">

        {/* Chain selector row */}
        <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-0 sm:gap-0">
          {/* From chain */}
          <div className="flex-1 min-w-0 bg-[#1a1a28] rounded-t-xl sm:rounded-xl overflow-hidden">
            <ChainSelectorModal
              label="From"
              selectedChainId={fromChain}
              chains={filteredChains}
              onChainChange={handleFromChain}
              className="rounded-none"
            />
          </div>

          {/* Swap button — between the two selectors */}
          <div className="relative z-20 flex items-center justify-center sm:mx-1" style={{ marginTop: '-12px', marginBottom: '-12px' }}>
            <button 
              onClick={swap}
              className="w-10 h-10 rounded-full bg-[#1a1a28] border-2 sm:border border-gray-700/50 flex items-center justify-center hover:border-telos-cyan/50 hover:bg-telos-cyan/5 hover:rotate-180 duration-300 text-gray-400 hover:text-telos-cyan shrink-0 group active:scale-95 touch-manipulation shadow-lg shadow-black/50 sm:shadow-none"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="group-hover:scale-110 transition-transform rotate-90 sm:rotate-0">
                <path d="M7 10L12 5L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 14L12 19L17 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* To chain */}
          <div className="flex-1 min-w-0 bg-[#1a1a28] rounded-b-xl sm:rounded-xl overflow-hidden">
            <ChainSelectorModal
              label="To"
              selectedChainId={toChain}
              chains={filteredChains}
              onChainChange={handleToChain}
              className="rounded-none"
            />
          </div>
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
            className="flex-1 min-w-0"
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
              ? `~${parseFloat(oftQuote.nativeFeeFormatted) >= 1 ? parseFloat(oftQuote.nativeFeeFormatted).toFixed(0) : parseFloat(oftQuote.nativeFeeFormatted).toFixed(4)}` 
              : v2Quote 
                ? `~${parseFloat(v2Quote.nativeFeeFormatted) >= 1 ? parseFloat(v2Quote.nativeFeeFormatted).toFixed(0) : parseFloat(v2Quote.nativeFeeFormatted).toFixed(4)}`
                : undefined
            }
            feeCurrency={CHAIN_MAP.get(fromChain)?.nativeCurrency || 'TLOS'}
            estimatedTime="~2 min"
          />
        )}

        {/* Low amount / fee warning */}
        {(() => {
          const nativeFeeStr = oftQuote?.nativeFeeFormatted || v2Quote?.nativeFeeFormatted
          const fCurrency = CHAIN_MAP.get(fromChain)?.nativeCurrency || 'TLOS'
          if (amount && (oftQuote || v2Quote) && nativeFeeStr && parseFloat(amount) < parseFloat(nativeFeeStr) * 3) {
            const feeDisplay = parseFloat(nativeFeeStr) >= 1 
              ? parseFloat(nativeFeeStr).toFixed(0) 
              : parseFloat(nativeFeeStr).toFixed(4)
            return (
              <div className="bg-amber-500/[0.06] border border-amber-500/10 rounded-xl px-4 py-3 text-xs text-amber-400/90 leading-relaxed">
                Amount is low relative to the network fee (~{feeDisplay} {fCurrency}). You may receive little or nothing.
              </div>
            )
          }
          return null
        })()}

        {/* Transaction Progress Stepper */}
        <TransactionStepper
          currentStep={transactionStep}
          txHash={transactionHash}
          fromChainId={fromChain}
          toChainId={toChain}
          estimatedTime="~2 min"
        />

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
          <div className="bg-amber-500/[0.06] border border-amber-500/10 rounded-xl px-4 py-2.5 text-xs text-amber-400/80 leading-relaxed">
            Will switch to {chainName(fromChain)} on bridge
          </div>
        )}

        {/* From non-Telos notice */}
        {fromChain !== 40 && tokenList.length === 1 && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-xs text-gray-400 leading-relaxed">
            Only TLOS bridging available on this route
          </div>
        )}

        {/* CTA */}
        {!address ? (
          <button 
            onClick={openConnectModal}
            className="w-full py-4 sm:py-5 rounded-2xl font-semibold text-base sm:text-lg bg-gradient-to-r from-telos-cyan via-telos-blue to-telos-purple text-white hover:opacity-90 hover:shadow-xl hover:shadow-telos-cyan/20 active:scale-98 transition-all duration-200 shadow-lg shadow-telos-cyan/10 touch-manipulation"
          >
            Connect Wallet
          </button>
        ) : (
          <button onClick={hasQuote ? handleBridge : doQuote}
            disabled={!amount || parseFloat(amount) <= 0 || quoting || bridging || fromChain === toChain || (!isOft && !isMst && !isV2) || insufficientBalance}
            className="w-full py-4 sm:py-5 rounded-2xl font-semibold text-base sm:text-lg bg-gradient-to-r from-telos-cyan via-telos-blue to-telos-purple text-white disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 hover:shadow-xl hover:shadow-telos-cyan/20 active:scale-98 transition-all duration-200 shadow-lg shadow-telos-cyan/10 relative overflow-hidden group touch-manipulation">
            <span className="relative z-10 flex items-center justify-center gap-2">
              {(quoting || bridging) && <LoadingSpinner size="sm" className="text-white" />}
              {insufficientBalance ? 'Insufficient balance' : 
               quoting ? 'Getting quote...' : 
               bridging ? 'Bridging...' : 
               hasQuote ? `Bridge ${token}` : 
               (!amount || parseFloat(amount) <= 0) ? 'Enter an amount' : 'Get Quote'}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-telos-cyan/10 via-white/5 to-telos-cyan/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        )}
        </div>
      </div>

      {/* Footer */}
      <div className={`text-center ${
        reduceMotion ? '' : 'animate-in fade-in slide-in-from-bottom-2 duration-600 delay-700'
      }`}>
        <span className="inline-flex items-center gap-1.5 text-xs text-telos-cyan/70 bg-telos-cyan/5 border border-telos-cyan/10 rounded-full px-3 py-1.5">
          Cross-chain transfers with transparent fee refunds
        </span>
      </div>

      {/* Recent Transactions Modal */}
      <RecentTransactions
        isOpen={showRecentTransactions}
        onClose={() => setShowRecentTransactions(false)}
      />

      {/* Success Celebration Animation */}
      <SuccessCelebration
        isVisible={showSuccessCelebration}
        onComplete={() => setShowSuccessCelebration(false)}
      />
    </div>
  )
}
