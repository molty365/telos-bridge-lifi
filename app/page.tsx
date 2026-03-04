'use client'

import { useEffect } from 'react'

const REDIRECT_URL = 'https://stargate.finance/?srcChain=telos&srcToken=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE&dstChain=ethereum&dstToken=0x193f4A4a6ea24102F49b931DEeeb931f6E32405d'

export default function Home() {
  useEffect(() => {
    window.location.href = REDIRECT_URL
  }, [])

<<<<<<< HEAD
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a12] text-white">
      <div className="text-center space-y-4">
        <div className="text-2xl font-light">Redirecting to Telos Bridge...</div>
        <p className="text-gray-400 text-sm">
          If you are not redirected, <a href={REDIRECT_URL} className="text-telos-cyan underline">click here</a>.
        </p>
      </div>
    </main>
=======
          <div className="relative z-10">
            <Header />
            <div className="max-w-[560px] mx-auto px-5 sm:px-6 pt-4 sm:pt-8 pb-safe pb-20 sm:pb-24 relative z-10">
              <BridgeForm />
            </div>
          </div>
        </main>
      </PageTransition>
    </AnimationProvider>
>>>>>>> eb0fbbe (fix: mobile UI, fee estimation, connect wallet button, Superbridge-style layout)
  )
}
