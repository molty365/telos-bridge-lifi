import { BridgeForm } from '@/components/BridgeForm'
import { Header } from '@/components/Header'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <div className="max-w-lg mx-auto px-4 pt-8 pb-20">
        <BridgeForm />
      </div>
    </main>
  )
}
