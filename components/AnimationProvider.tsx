'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface AnimationContextType {
  pageLoaded: boolean
  reduceMotion: boolean
}

const AnimationContext = createContext<AnimationContextType>({
  pageLoaded: false,
  reduceMotion: false,
})

export function AnimationProvider({ children }: { children: React.ReactNode }) {
  const [pageLoaded, setPageLoaded] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mediaQuery.matches)
    
    const handleChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches)
    mediaQuery.addEventListener('change', handleChange)

    // Trigger page load animation
    const timer = setTimeout(() => setPageLoaded(true), 100)

    return () => {
      clearTimeout(timer)
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return (
    <AnimationContext.Provider value={{ pageLoaded, reduceMotion }}>
      {children}
    </AnimationContext.Provider>
  )
}

export const useAnimation = () => useContext(AnimationContext)