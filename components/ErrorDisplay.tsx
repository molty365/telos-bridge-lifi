'use client'

import { useState } from 'react'

export type ErrorType = 
  | 'wallet_not_connected'
  | 'insufficient_balance'
  | 'network_mismatch'
  | 'transaction_rejected'
  | 'quote_failed'
  | 'bridge_failed'
  | 'unsupported_route'
  | 'rpc_error'
  | 'unknown'

export interface ErrorInfo {
  type: ErrorType
  message: string
  details?: string
  chainId?: number
  expectedChainId?: number
}

interface ErrorDisplayProps {
  error: ErrorInfo | null
  onRetry?: () => void
  onDismiss?: () => void
  onConnectWallet?: () => void
  onSwitchNetwork?: (chainId: number) => void
  chainName?: (id: number) => string
}

const getErrorIcon = (type: ErrorType) => {
  switch (type) {
    case 'wallet_not_connected':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    case 'network_mismatch':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case 'insufficient_balance':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    case 'transaction_rejected':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
        </svg>
      )
    case 'rpc_error':
    case 'bridge_failed':
    case 'quote_failed':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      )
    default:
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
  }
}

const getErrorColor = (type: ErrorType) => {
  switch (type) {
    case 'wallet_not_connected':
      return 'text-blue-400 border-blue-500/20 bg-blue-500/8'
    case 'network_mismatch':
      return 'text-yellow-400 border-yellow-500/20 bg-yellow-500/8'
    case 'insufficient_balance':
      return 'text-orange-400 border-orange-500/20 bg-orange-500/8'
    case 'transaction_rejected':
      return 'text-gray-400 border-gray-500/20 bg-gray-500/8'
    default:
      return 'text-red-400 border-red-500/20 bg-red-500/8'
  }
}

export function ErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss, 
  onConnectWallet,
  onSwitchNetwork,
  chainName = (id) => `Chain ${id}`
}: ErrorDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!error) return null

  const colorClasses = getErrorColor(error.type)

  const renderRecoveryActions = () => {
    switch (error.type) {
      case 'wallet_not_connected':
        return (
          <div className="flex gap-2 mt-3">
            <button
              onClick={onConnectWallet}
              className="flex-1 px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-300 text-sm font-medium hover:bg-blue-500/30 transition-all active:scale-98"
            >
              Connect Wallet
            </button>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-gray-400 text-sm hover:bg-gray-600/50 transition-all active:scale-98"
              >
                Dismiss
              </button>
            )}
          </div>
        )

      case 'network_mismatch':
        return (
          <div className="flex gap-2 mt-3">
            {onSwitchNetwork && error.expectedChainId && (
              <button
                onClick={() => onSwitchNetwork(error.expectedChainId!)}
                className="flex-1 px-3 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-300 text-sm font-medium hover:bg-yellow-500/30 transition-all active:scale-98"
              >
                Switch to {chainName(error.expectedChainId)}
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-gray-400 text-sm hover:bg-gray-600/50 transition-all active:scale-98"
              >
                Dismiss
              </button>
            )}
          </div>
        )

      case 'transaction_rejected':
        return (
          <div className="flex gap-2 mt-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex-1 px-3 py-2 bg-gray-500/20 border border-gray-500/30 rounded-lg text-gray-300 text-sm font-medium hover:bg-gray-500/30 transition-all active:scale-98"
              >
                Try Again
              </button>
            )}
            <button
              onClick={onDismiss}
              className="px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-gray-400 text-sm hover:bg-gray-600/50 transition-all active:scale-98"
            >
              Dismiss
            </button>
          </div>
        )

      case 'quote_failed':
      case 'bridge_failed':
      case 'rpc_error':
        return (
          <div className="flex gap-2 mt-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex-1 px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm font-medium hover:bg-red-500/30 transition-all active:scale-98"
              >
                Retry
              </button>
            )}
            <button
              onClick={onDismiss}
              className="px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-gray-400 text-sm hover:bg-gray-600/50 transition-all active:scale-98"
            >
              Dismiss
            </button>
          </div>
        )

      default:
        return (
          <div className="flex gap-2 mt-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex-1 px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm font-medium hover:bg-red-500/30 transition-all active:scale-98"
              >
                Retry
              </button>
            )}
            <button
              onClick={onDismiss}
              className="px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-gray-400 text-sm hover:bg-gray-600/50 transition-all active:scale-98"
            >
              Dismiss
            </button>
          </div>
        )
    }
  }

  return (
    <div className={`border rounded-xl p-4 transition-all duration-200 ${colorClasses}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getErrorIcon(error.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm">{error.message}</p>
              
              {error.details && (
                <div className="mt-2">
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-xs opacity-70 hover:opacity-100 transition-opacity underline"
                  >
                    {isExpanded ? 'Hide details' : 'Show details'}
                  </button>
                  {isExpanded && (
                    <p className="text-xs opacity-80 mt-1 font-mono bg-black/20 p-2 rounded border break-all">
                      {error.details}
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="flex-shrink-0 w-5 h-5 rounded-full hover:bg-black/20 flex items-center justify-center transition-all active:scale-95"
                title="Dismiss"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          {renderRecoveryActions()}
        </div>
      </div>
    </div>
  )
}

// Utility function to create error objects
export const createError = (type: ErrorType, message: string, details?: string, extra?: Partial<ErrorInfo>): ErrorInfo => ({
  type,
  message,
  details,
  ...extra
})