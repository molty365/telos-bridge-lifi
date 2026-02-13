'use client'

import { useState, useEffect } from 'react'

interface Transaction {
  id: string
  status: 'pending' | 'success' | 'failed' | 'expired'
  fromChain: string
  toChain: string
  token: string
  amount: string
  timestamp: number
  txHash?: string
  destinationTxHash?: string
  explorerUrl?: string
  destinationExplorerUrl?: string
}

interface TransactionHistoryProps {
  isOpen: boolean
  onClose: () => void
}

export function TransactionHistory({ isOpen, onClose }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('bridge-transactions')
    if (stored) {
      try {
        setTransactions(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to parse transaction history:', e)
      }
    }
  }, [])

  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
      case 'success':
        return <div className="w-2 h-2 bg-emerald-400 rounded-full" />
      case 'failed':
        return <div className="w-2 h-2 bg-red-400 rounded-full" />
      case 'expired':
        return <div className="w-2 h-2 bg-gray-500 rounded-full" />
    }
  }

  const getStatusText = (status: Transaction['status']) => {
    switch (status) {
      case 'pending':
        return 'Bridging...'
      case 'success':
        return 'Complete'
      case 'failed':
        return 'Failed'
      case 'expired':
        return 'Expired'
    }
  }

  const formatTimeAgo = (timestamp: number) => {
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#12121a] border border-gray-800/50 rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Transaction History</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-800/50 hover:bg-gray-700/50 flex items-center justify-center text-gray-400 hover:text-white transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <p className="text-gray-500">No transactions yet</p>
              <p className="text-sm text-gray-600">Your bridge history will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map(tx => (
                <div key={tx.id} className="bg-[#1a1a28] rounded-xl p-4 border border-gray-800/30 hover:border-gray-700/50 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(tx.status)}
                      <span className="text-sm text-gray-400">{getStatusText(tx.status)}</span>
                    </div>
                    <span className="text-xs text-gray-500">{formatTimeAgo(tx.timestamp)}</span>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">{tx.amount} {tx.token}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {tx.fromChain} → {tx.toChain}
                    </div>
                  </div>

                  {(tx.txHash || tx.destinationTxHash) && (
                    <div className="flex gap-2 mt-3">
                      {tx.txHash && (
                        <a 
                          href={tx.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-telos-cyan hover:text-telos-blue px-3 py-1.5 bg-telos-cyan/10 hover:bg-telos-cyan/20 rounded-lg transition-all"
                        >
                          Source Tx ↗
                        </a>
                      )}
                      {tx.destinationTxHash && (
                        <a 
                          href={tx.destinationExplorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-400 hover:text-emerald-300 px-3 py-1.5 bg-emerald-400/10 hover:bg-emerald-400/20 rounded-lg transition-all"
                        >
                          Destination Tx ↗
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Utility function to save transactions
export function saveTransaction(transaction: Omit<Transaction, 'id'>) {
  const stored = localStorage.getItem('bridge-transactions')
  const transactions = stored ? JSON.parse(stored) : []
  const newTx = { ...transaction, id: Date.now().toString() }
  transactions.unshift(newTx) // Add to beginning
  transactions.splice(20) // Keep only last 20
  localStorage.setItem('bridge-transactions', JSON.stringify(transactions))
}