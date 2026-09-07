'use client'

import { motion } from 'framer-motion'
import { useCreatorStore } from '@/lib/store'

export function TitleScreen() {
  const setPhase = useCreatorStore((s) => s.setPhase)
  const account = useCreatorStore((s) => s.account)

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0c0a14] px-6">
      {/* Ciel étoilé */}
      <div className="pointer-events-none absolute inset-0">
        {[...Array(90)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${(i * 37.7) % 100}%`,
              top: `${(i * 53.3) % 100}%`,
              width: i % 7 === 0 ? 2.5 : 1.4,
              height: i % 7 === 0 ? 2.5 : 1.4,
              opacity: 0.25 + ((i * 13) % 60) / 100,
              animation: `twinkle ${2 + (i % 5)}s ease-in-out ${(i % 7) * 0.4}s infinite`,
            }}
          />
        ))}
        <div className="absolute left-1/2 top-1/3 h-[46vmin] w-[46vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#5a4a8c33] blur-[90px]" />
        <div className="absolute bottom-0 left-0 right-0 h-[38vh] bg-gradient-to-t from-[#1a1424] to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, ease: 'easeOut' }}
        className="relative z-10 text-center"
      >
        <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.6em] text-[#a898c8]">
          Un monde forgé par les étoiles
        </div>
        <h1 className="bg-gradient-to-b from-[#f4ecd8] via-[#e8d8b0] to-[#b8985c] bg-clip-text text-6xl font-black tracking-[0.18em] text-transparent drop-shadow-[0_0_28px_rgba(184,152,92,0.35)] sm:text-7xl md:text-8xl">
          NEXORIA
        </h1>
        <div className="mx-auto mt-4 h-px w-56 bg-gradient-to-r from-transparent via-[#b8985c99] to-transparent" />
        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-[#9a90b0] sm:text-base">
          Neuf races. Quatre destinées. Un village vous attend.
          <br />
          Créez votre héros — puis façonnez votre légende.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.8 }}
        className="relative z-10 mt-12 flex flex-col items-center gap-4"
      >
        <button
          onClick={() => setPhase(account ? 'charselect' : 'auth')}
          className="group relative min-h-[52px] overflow-hidden rounded-sm border border-[#b8985c66] bg-gradient-to-b from-[#2a2038] to-[#1a1424] px-12 py-3.5 text-sm font-bold uppercase tracking-[0.3em] text-[#e8d8b0] shadow-[0_0_30px_rgba(90,74,140,0.25)] transition-all duration-300 hover:border-[#d4b878] hover:text-white hover:shadow-[0_0_45px_rgba(184,152,92,0.4)] active:scale-[0.98]"
        >
          <span className="relative z-10">{account ? 'Retourner au monde' : 'Commencer l’aventure'}</span>
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[#b8985c22] to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        </button>
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.25em] text-[#6a6080]">
          <span>PC</span><span className="h-1 w-1 rounded-full bg-[#6a6080]" />
          <span>Android</span><span className="h-1 w-1 rounded-full bg-[#6a6080]" />
          <span>Sauvegarde serveur</span>
        </div>
      </motion.div>

      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.35); }
        }
      `}</style>
    </div>
  )
}
