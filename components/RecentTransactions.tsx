'use client'

import { useState, useEffect } from 'react'
import { useAnimation } from './AnimationProvider'

export interface BridgeTransaction {
  id: string
  timestamp: number
  fromChain: number
  toChain: number
  token: string
  amount: string
  status: 'completed' | 'pending' | 'failed'
  txHash?: string
  toTxHash?: string // For destination chain transaction
}

interface RecentTransactionsProps {
  isOpen: boolean
  onClose: () => void
}

const STORAGE_KEY = 'telos_bridge_transactions'
const MAX_TRANSACTIONS = 50

// Chain configuration for display
const CHAIN_CONFIG: Record<number, { name: string; iconUrl: string }> = {
  40: { name: 'Telos', iconUrl: '/chains/telos.png' },
  1: { name: 'Ethereum', iconUrl: '/chains/ethereum.png' },
  8453: { name: 'Base', iconUrl: '/chains/base.png' },
  56: { name: 'BSC', iconUrl: '/chains/bsc.png' },
  42161: { name: 'Arbitrum', iconUrl: '/chains/arbitrum.png' },
  137: { name: 'Polygon', iconUrl: '/chains/polygon.png' },
  43114: { name: 'Avalanche', iconUrl: '/chains/avalanche.png' },
  10: { name: 'Optimism', iconUrl: '/chains/optimism.png' },
  534352: { name: 'Scroll', iconUrl: '/chains/scroll.png' },
  5000: { name: 'Mantle', iconUrl: '/chains/mantle.png' },
  1329: { name: 'Sei', iconUrl: '/chains/sei.png' },
  2222: { name: 'Kava', iconUrl: '/chains/kava.png' },
}

export function RecentTransactions({ isOpen, onClose }: RecentTransactionsProps) {
  const { reduceMotion } = useAnimation()
  const [transactions, setTransactions] = useState<BridgeTransaction[]>([])

  // Load transactions from localStorage, auto-expiring stale pending ones
  useEffect(() => {
    if (isOpen) {
      loadAndExpireTransactions()
    }
  }, [isOpen])

  const loadAndExpireTransactions = () => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return
    try {
      const parsed: BridgeTransaction[] = JSON.parse(stored)
      setTransactions(parsed.slice(0, MAX_TRANSACTIONS))
    } catch (e) {
      console.error('Failed to parse stored transactions:', e)
      setTransactions([])
    }
  }

  // Listen for transaction updates (e.g. status changes from BridgeForm)
  useEffect(() => {
    const reload = () => {
      loadAndExpireTransactions()
    }
    window.addEventListener("telos:tx-updated", reload)
    return () => window.removeEventListener("telos:tx-updated", reload)
  }, [])

  const formatTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  const getExplorerUrl = (chainId: number, txHash: string) => {
    const explorers: Record<number, string> = {
      1: 'https://etherscan.io',
      40: 'https://teloscan.io',
      8453: 'https://basescan.org',
      56: 'https://bscscan.com',
      137: 'https://polygonscan.com',
      42161: 'https://arbiscan.io',
      10: 'https://optimistic.etherscan.io',
      43114: 'https://snowtrace.io',
      534352: 'https://scrollscan.com',
      5000: 'https://mantlescan.xyz',
      1329: 'https://seitrace.com',
      2222: 'https://kavascan.com',
    }
    const baseUrl = explorers[chainId] || 'https://teloscan.io'
    return `${baseUrl}/tx/${txHash}`
  }

  const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY)
    setTransactions([])
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-[#12121a] border border-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col ${
        reduceMotion ? '' : 'animate-in zoom-in-95 fade-in duration-300'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-telos-cyan rounded-full" />
            <h3 className="text-lg font-semibold text-white">Recent Bridges</h3>
          </div>
          <div className="flex items-center gap-2">
            {transactions.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-xs text-gray-400 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-400/5"
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-gray-600 mb-4">
                <path d="M2 18h20M5 18V8m14 10V8M9 18v-4m6 4v-4M5 8c0-2 2-4 7-4s7 2 7 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h4 className="text-gray-400 text-sm font-medium mb-2">No bridges yet</h4>
              <p className="text-gray-500 text-xs">Your bridge transactions will appear here</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {transactions.map((tx, index) => {
                const fromChain = CHAIN_CONFIG[tx.fromChain] || { name: `Chain ${tx.fromChain}`, iconUrl: '' }
                const toChain = CHAIN_CONFIG[tx.toChain] || { name: `Chain ${tx.toChain}`, iconUrl: '' }
                
                return (
                  <div
                    key={tx.id}
                    className={`bg-[#1a1a28] border border-gray-800/50 rounded-xl p-3 hover:border-telos-cyan/20 transition-all ${
                      reduceMotion ? '' : 'animate-in fade-in slide-in-from-bottom-1'
                    }`}
                    style={{ animationDelay: reduceMotion ? '0ms' : `${index * 50}ms` }}
                  >
                    {/* Transaction Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">
                          {tx.amount} {tx.token}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          tx.status === 'completed' 
                            ? 'bg-emerald-400/10 text-emerald-400' 
                            : tx.status === 'pending'
                              ? 'bg-yellow-400/10 text-yellow-400'
                              : 'bg-red-400/10 text-red-400'
                        }`}>
                          {tx.status === 'pending' ? 'submitted' : tx.status}
                        </span>
                        {tx.status === 'pending' && tx.txHash && (
                          <a href={getExplorerUrl(tx.fromChain, tx.txHash)} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors">
                            tx link ↗
                          </a>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTime(tx.timestamp)}
                      </div>
                    </div>

                    {/* Chain Route */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-xs">
                        <img src={fromChain.iconUrl} alt={fromChain.name} className="w-4 h-4 rounded-full" onError={(e) => { e.currentTarget.style.display="none" }} />
                        <span className="text-gray-400">{fromChain.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-0.5 bg-gray-600" />
                        <svg width="12" height="12" viewBox="0 0 12 12" className="text-gray-500">
                          <path d="M8 3L11 6L8 9M1 6H11" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                        </svg>
                        <div className="w-4 h-0.5 bg-gray-600" />
                      </div>

                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-gray-400">{toChain.name}</span>
                        <img src={toChain.iconUrl} alt={toChain.name} className="w-4 h-4 rounded-full" onError={(e) => { e.currentTarget.style.display="none" }} />
                      </div>
                    </div>

                    {/* Transaction Links */}
                    {tx.txHash && (
                      <div className="flex flex-col gap-1 pt-1.5 mt-1.5 border-t border-white/[0.04]">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Source tx</span>
                          <a href={getExplorerUrl(tx.fromChain, tx.txHash)} target="_blank" rel="noopener noreferrer"
                            className="text-telos-cyan hover:text-telos-cyan/70 font-mono transition-colors">
                            {tx.txHash.slice(0, 6)}...{tx.txHash.slice(-4)} ↗
                          </a>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">LayerZero</span>
                          <a href={`https://layerzeroscan.com/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 transition-colors">
                            Track on LZScan ↗
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {transactions.length > 0 && (
          <div className="border-t border-gray-800 p-4">
            <div className="flex items-center justify-center text-xs text-gray-500">
              <span>Stored locally • {transactions.length} transactions</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper function to add a transaction to localStorage
export function addTransaction(transaction: Omit<BridgeTransaction, 'id' | 'timestamp'>) {
  const newTransaction: BridgeTransaction = {
    ...transaction,
    id: Math.random().toString(36).substr(2, 9),
    timestamp: Date.now(),
  }

  const stored = localStorage.getItem(STORAGE_KEY)
  let transactions: BridgeTransaction[] = []
  
  if (stored) {
    try {
      transactions = JSON.parse(stored)
    } catch (e) {
      console.error('Failed to parse stored transactions:', e)
    }
  }

  // Add new transaction to the beginning
  transactions.unshift(newTransaction)
  
  // Keep only the most recent MAX_TRANSACTIONS
  transactions = transactions.slice(0, MAX_TRANSACTIONS)

  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))
  
  return newTransaction
}

// Helper function to update transaction status
export function updateTransaction(id: string, updates: Partial<BridgeTransaction>) {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return

  try {
    const transactions: BridgeTransaction[] = JSON.parse(stored)
    const index = transactions.findIndex(tx => tx.id === id)
    
    if (index !== -1) {
      transactions[index] = { ...transactions[index], ...updates }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("telos:tx-updated"))
      }
    }
  } catch (e) {
    console.error('Failed to update transaction:', e)
  }
}