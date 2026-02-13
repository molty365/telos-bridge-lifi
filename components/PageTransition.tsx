'use client'

import { useAnimation } from './AnimationProvider'

interface PageTransitionProps {
  children: React.ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const { pageLoaded, reduceMotion } = useAnimation()

  if (reduceMotion) {
    return <>{children}</>
  }

  return (
    <div
      className={`transition-all duration-1000 ease-out ${
        pageLoaded 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-4'
      }`}
    >
      {children}
    </div>
  )
}