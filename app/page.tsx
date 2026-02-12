import { BridgeForm } from '@/components/BridgeForm'
import { Header } from '@/components/Header'

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background orbs */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      <div className="relative z-10">
        <Header />
        <div className="max-w-[440px] mx-auto px-4 pt-8 pb-20">
          <BridgeForm />
        </div>
      </div>
    </main>
  )
}
