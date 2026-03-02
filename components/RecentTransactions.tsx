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
const CHAIN_CONFIG: Record<number, { name: string; icon: string; color: string }> = {
  40: { name: 'Telos', icon: '🟣', color: 'text-purple-400' },
  1: { name: 'Ethereum', icon: '⚫', color: 'text-blue-400' },
  8453: { name: 'Base', icon: '🔵', color: 'text-blue-500' },
  137: { name: 'Polygon', icon: '🟣', color: 'text-purple-500' },
  42161: { name: 'Arbitrum', icon: '🔷', color: 'text-cyan-400' },
  10: { name: 'Optimism', icon: '🔴', color: 'text-red-400' },
  43114: { name: 'Avalanche', icon: '🔺', color: 'text-red-500' },
}

export function RecentTransactions({ isOpen, onClose }: RecentTransactionsProps) {
  const { reduceMotion } = useAnimation()
  const [transactions, setTransactions] = useState<BridgeTransaction[]>([])

  // Load transactions from localStorage
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setTransactions(parsed.slice(0, MAX_TRANSACTIONS))
        } catch (e) {
          console.error('Failed to parse stored transactions:', e)
          setTransactions([])
        }
      }
    }
  }, [isOpen])

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
      137: 'https://polygonscan.com',
      42161: 'https://arbiscan.io',
      10: 'https://optimistic.etherscan.io',
      43114: 'https://snowtrace.io',
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
              <div className="text-4xl mb-4">🌉</div>
              <h4 className="text-gray-400 text-sm font-medium mb-2">No bridges yet</h4>
              <p className="text-gray-500 text-xs">Your bridge transactions will appear here</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {transactions.map((tx, index) => {
                const fromChain = CHAIN_CONFIG[tx.fromChain] || { name: `Chain ${tx.fromChain}`, icon: '⚪', color: 'text-gray-400' }
                const toChain = CHAIN_CONFIG[tx.toChain] || { name: `Chain ${tx.toChain}`, icon: '⚪', color: 'text-gray-400' }
                
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
                          {tx.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTime(tx.timestamp)}
                      </div>
                    </div>

                    {/* Chain Route */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={fromChain.color}>{fromChain.icon}</span>
                        <span className="text-gray-400">{fromChain.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-0.5 bg-gray-600" />
                        <svg width="12" height="12" viewBox="0 0 12 12" className="text-gray-500">
                          <path d="M8 3L11 6L8 9M1 6H11" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                        </svg>
                        <div className="w-4 h-0.5 bg-gray-600" />
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-400">{toChain.name}</span>
                        <span className={toChain.color}>{toChain.icon}</span>
                      </div>
                    </div>

                    {/* Transaction Hash */}
                    {tx.txHash && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Tx Hash</span>
                        <a
                          href={getExplorerUrl(tx.fromChain, tx.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-telos-cyan hover:text-telos-cyan/80 font-mono transition-colors"
                        >
                          {tx.txHash.slice(0, 6)}...{tx.txHash.slice(-4)} ↗
                        </a>
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
    }
  } catch (e) {
    console.error('Failed to update transaction:', e)
  }
}