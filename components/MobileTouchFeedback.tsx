'use client'

import React, { ReactElement, cloneElement, useState, useRef, useEffect } from 'react'

interface TouchFeedbackProps {
  children: ReactElement
  disabled?: boolean
  feedbackIntensity?: 'light' | 'medium' | 'strong'
}

export function TouchFeedback({ children, disabled = false, feedbackIntensity = 'medium' }: TouchFeedbackProps) {
  const [isPressed, setIsPressed] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>()

  const intensityClasses = {
    light: 'transform scale-99',
    medium: 'transform scale-98',
    strong: 'transform scale-95'
  }

  const handleTouchStart = (originalHandler?: (e: any) => void) => (e: any) => {
    if (disabled) return
    
    setIsPressed(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    
    originalHandler?.(e)
  }

  const handleTouchEnd = (originalHandler?: (e: any) => void) => (e: any) => {
    if (disabled) return
    
    timeoutRef.current = setTimeout(() => setIsPressed(false), 100)
    originalHandler?.(e)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const enhancedChild = cloneElement(children, {
    className: `${children.props.className || ''} transition-transform duration-100 touch-manipulation ${
      isPressed && !disabled ? intensityClasses[feedbackIntensity] : ''
    }`,
    onTouchStart: handleTouchStart(children.props.onTouchStart),
    onTouchEnd: handleTouchEnd(children.props.onTouchEnd),
    onMouseDown: handleTouchStart(children.props.onMouseDown),
    onMouseUp: handleTouchEnd(children.props.onMouseUp),
    onMouseLeave: handleTouchEnd(children.props.onMouseLeave),
  })

  return enhancedChild
}

// Hook for mobile detection
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  const checkMobile = () => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth < 768)
    }
  }

  useEffect(() => {
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

// Mobile-optimized spacing utility
export function mobileSpacing(base: string, mobile?: string) {
  return mobile ? `${mobile} sm:${base}` : base
}

// Viewport height hook for mobile browsers (accounts for mobile browser UI)
export function useViewportHeight() {
  const [vh, setVh] = useState('100vh')

  useEffect(() => {
    const updateVh = () => {
      const vhValue = window.innerHeight * 0.01
      setVh(`${vhValue * 100}px`)
    }

    updateVh()
    window.addEventListener('resize', updateVh)
    window.addEventListener('orientationchange', updateVh)
    
    return () => {
      window.removeEventListener('resize', updateVh)
      window.removeEventListener('orientationchange', updateVh)
    }
  }, [])

  return vh
}