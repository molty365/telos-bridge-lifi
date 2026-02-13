'use client'

import { useEffect, useState } from 'react'

// Mobile detection hook
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

// Mobile-optimized modal wrapper
interface MobileModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  maxHeight?: string
}

export function MobileModal({ isOpen, onClose, title, children, maxHeight = "85vh" }: MobileModalProps) {
  const isMobile = useIsMobile()

  if (!isOpen) return null

  if (isMobile) {
    // Mobile: slide up from bottom
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center">
        <div 
          className="bg-[#12121a] border border-gray-800/50 rounded-t-2xl w-full overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300"
          style={{ maxHeight }}
        >
          {/* Mobile header with larger touch targets */}
          <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-700/50">
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-gray-800/50 hover:bg-gray-700/50 flex items-center justify-center text-gray-400 hover:text-white transition-all touch-manipulation active:scale-95"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          
          {/* Mobile content with proper scroll */}
          <div className="flex-1 overflow-auto p-6 pt-4">
            {children}
          </div>
          
          {/* Mobile drag indicator */}
          <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-10 h-1 bg-gray-600 rounded-full"></div>
        </div>
      </div>
    )
  }

  // Desktop: centered modal
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="bg-[#12121a] border border-gray-800/50 rounded-2xl max-w-md w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        style={{ maxHeight }}
      >
        <div className="flex items-center justify-between p-6 pb-4">
          <h3 className="text-xl font-bold text-white">{title}</h3>
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
        
        <div className="flex-1 overflow-auto px-6 pb-6">
          {children}
        </div>
      </div>
    </div>
  )
}

// Mobile-optimized button with proper touch feedback
interface MobileButtonProps {
  onClick: () => void
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  className?: string
  disabled?: boolean
}

export function MobileButton({ onClick, children, variant = 'primary', className = '', disabled = false }: MobileButtonProps) {
  const baseClasses = "font-semibold rounded-xl transition-all touch-manipulation active:scale-98 min-h-[48px] px-4 py-3"
  
  const variantClasses = {
    primary: "bg-gradient-to-r from-telos-cyan via-telos-blue to-telos-purple text-white hover:opacity-90 hover:shadow-xl hover:shadow-telos-cyan/20 shadow-lg shadow-telos-cyan/10",
    secondary: "bg-[#1a1a28] border border-gray-700/50 text-white hover:bg-[#1e1e30] hover:border-gray-600/50",
    ghost: "text-gray-400 hover:text-white hover:bg-white/[0.04]"
  }

  const disabledClasses = disabled ? "opacity-30 cursor-not-allowed" : ""

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${disabledClasses} ${className}`}
    >
      {children}
    </button>
  )
}

// Mobile-optimized input with better touch targets
interface MobileInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'number'
  className?: string
}

export function MobileInput({ value, onChange, placeholder, type = 'text', className = '' }: MobileInputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-[#1a1a28] border border-gray-700/50 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-telos-cyan/50 focus:border-telos-cyan/50 outline-none transition-all text-base ${className}`}
      style={{ fontSize: '16px' }} // Prevent iOS zoom on input focus
    />
  )
}

// Mobile-specific layout improvements
export function MobileContainer({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`px-4 sm:px-6 ${className}`}>
      {children}
    </div>
  )
}

// Safe area padding for iOS devices
export function SafeArea({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`pb-safe ${className}`} style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {children}
    </div>
  )
}