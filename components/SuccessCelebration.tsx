'use client'

import { useEffect, useState } from 'react'
import { useAnimation } from './AnimationProvider'

interface SuccessCelebrationProps {
  isVisible: boolean
  onComplete?: () => void
}

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  rotation: number
  rotationSpeed: number
}

const COLORS = [
  '#00F2FE', // telos-cyan
  '#4FACFE', // telos-blue  
  '#C471F5', // telos-purple
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
]

export function SuccessCelebration({ isVisible, onComplete }: SuccessCelebrationProps) {
  const { reduceMotion } = useAnimation()
  const [particles, setParticles] = useState<Particle[]>([])
  const [animationId, setAnimationId] = useState<number | null>(null)

  useEffect(() => {
    if (isVisible && !reduceMotion) {
      // Create initial particles
      const newParticles: Particle[] = []
      for (let i = 0; i < 30; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * window.innerWidth,
          y: window.innerHeight + 10,
          vx: (Math.random() - 0.5) * 8,
          vy: -(Math.random() * 6 + 4),
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: Math.random() * 6 + 3,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 10,
        })
      }
      setParticles(newParticles)

      // Animation loop
      const animate = () => {
        setParticles(prevParticles => {
          return prevParticles
            .map(particle => ({
              ...particle,
              x: particle.x + particle.vx,
              y: particle.y + particle.vy,
              vy: particle.vy + 0.2, // gravity
              rotation: particle.rotation + particle.rotationSpeed,
            }))
            .filter(particle => particle.y < window.innerHeight + 50)
        })

        const id = requestAnimationFrame(animate)
        setAnimationId(id)
      }

      animate()

      // Auto cleanup after 3 seconds
      const timeout = setTimeout(() => {
        onComplete?.()
      }, 3000)

      return () => {
        if (animationId) cancelAnimationFrame(animationId)
        clearTimeout(timeout)
      }
    } else if (!isVisible) {
      setParticles([])
      if (animationId) {
        cancelAnimationFrame(animationId)
        setAnimationId(null)
      }
    }
  }, [isVisible, reduceMotion, onComplete, animationId])

  if (!isVisible || reduceMotion) {
    return null
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute animate-pulse"
          style={{
            left: particle.x,
            top: particle.y,
            transform: `rotate(${particle.rotation}deg)`,
            transition: 'none',
          }}
        >
          <div
            className="rounded-full shadow-lg"
            style={{
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              boxShadow: `0 0 ${particle.size * 2}px ${particle.color}40`,
            }}
          />
        </div>
      ))}

      {/* Central success message */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-black/60 backdrop-blur-lg border border-emerald-400/30 rounded-2xl px-8 py-4 animate-in zoom-in-75 fade-in duration-500">
          <div className="flex items-center gap-3">
            <div className="text-3xl animate-bounce">🎉</div>
            <div>
              <div className="text-emerald-400 font-semibold text-lg">Success!</div>
              <div className="text-emerald-400/70 text-sm">Bridge completed successfully</div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating emojis */}
      <div className="absolute inset-0">
        {[...Array(8)].map((_, i) => (
          <div
            key={`emoji-${i}`}
            className="absolute text-2xl animate-bounce"
            style={{
              left: `${10 + i * 10}%`,
              top: `${20 + Math.sin(i) * 20}%`,
              animationDelay: `${i * 200}ms`,
              animationDuration: '1s',
            }}
          >
            {i % 4 === 0 ? '🚀' : i % 4 === 1 ? '✨' : i % 4 === 2 ? '🌟' : '⚡'}
          </div>
        ))}
      </div>
    </div>
  )
}