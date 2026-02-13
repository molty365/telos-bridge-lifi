'use client'

import { useEffect, useState, useRef } from 'react'

interface UseCountUpOptions {
  start?: number
  end: number
  duration?: number
  decimals?: number
  preserveValue?: boolean
}

export function useCountUp({ 
  start = 0, 
  end, 
  duration = 800, 
  decimals = 4,
  preserveValue = false 
}: UseCountUpOptions) {
  const [displayValue, setDisplayValue] = useState(preserveValue ? end : start)
  const animationRef = useRef<number | undefined>(undefined)
  const startTimeRef = useRef<number | undefined>(undefined)
  const startValueRef = useRef(start)

  useEffect(() => {
    // If the end value hasn't changed and we want to preserve, don't animate
    if (preserveValue && displayValue === end) return

    startValueRef.current = preserveValue ? displayValue : start
    startTimeRef.current = performance.now()

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) return

      const elapsed = currentTime - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function: ease-out
      const easeOut = 1 - Math.pow(1 - progress, 3)
      
      const current = startValueRef.current + (end - startValueRef.current) * easeOut
      setDisplayValue(current)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [end, duration, preserveValue])

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return {
    value: displayValue,
    formattedValue: displayValue.toFixed(decimals).replace(/\.?0+$/, ''), // Remove trailing zeros
  }
}