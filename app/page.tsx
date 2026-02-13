import { BridgeForm } from '@/components/BridgeForm'
import { Header } from '@/components/Header'

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden touch-manipulation">
      {/* Background orbs - reduced intensity on mobile for better performance */}
      <div className="bg-orb bg-orb-1 opacity-60 sm:opacity-100" />
      <div className="bg-orb bg-orb-2 opacity-40 sm:opacity-100" />
      <div className="bg-orb bg-orb-3 opacity-50 sm:opacity-100" />

      <div className="relative z-10">
        <Header />
        <div className="max-w-[560px] mx-auto px-4 sm:px-6 pt-4 sm:pt-8 pb-safe pb-20 sm:pb-24 relative z-10">
          <BridgeForm />
        </div>
      </div>
    </main>
  )
}
