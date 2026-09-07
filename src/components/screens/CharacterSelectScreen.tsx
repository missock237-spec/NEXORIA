'use client'

// NEXORIA — Sélection de personnage (reconnexion, changement d'appareil)
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useCreatorStore } from '@/lib/store'
import { RACES } from '@/lib/game/races'
import { CLASSES } from '@/lib/game/classes'

export function CharacterSelectScreen() {
  const { characters, setPhase, setActiveWorld, setError } = useCreatorStore()
  const account = useCreatorStore((s) => s.account)
  const setAccount = useCreatorStore((s) => s.setAccount)
  const [entering, setEntering] = useState<string | null>(null)

  async function enter(id: string) {
    setEntering(id)
    setError(null)
    try {
      const res = await fetch(`/api/characters/${id}/enter`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Impossible d’entrer dans le monde')
        setEntering(null)
        return
      }
      setActiveWorld(data)
      setPhase('loading')
      // Préchargement puis apparition
      setTimeout(() => setPhase('village'), 1800)
    } catch {
      setError('Connexion au serveur impossible')
      setEntering(null)
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    setAccount(null)
    setPhase('title')
  }

  return (
    <div className="min-h-screen bg-[#0c0a14] px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-2 text-center text-[11px] uppercase tracking-[0.4em] text-[#8a80a0]">
          Compte : {account?.email}
        </div>
        <h1 className="text-center text-3xl font-black uppercase tracking-[0.2em] text-[#e8d8b0]">
          Vos Héros
        </h1>
        <div className="mx-auto mt-3 h-px w-40 bg-gradient-to-r from-transparent via-[#b8985c88] to-transparent" />

        <div className="mt-8 space-y-3">
          {characters.map((c, i) => {
            const race = RACES[c.race as keyof typeof RACES]
            const cls = CLASSES[c.class as keyof typeof CLASSES]
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex items-center gap-4 rounded-md border border-[#2c2438] bg-[#16121f] p-4 transition hover:border-[#b8985c55]"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm border border-[#b8985c44] bg-[#0c0a14] text-2xl font-black text-[#d4b878]">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-lg font-bold text-[#f0e8d8]">{c.name}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[#8a80a0]">
                    <span className="text-[#a89cc0]">{race?.name ?? c.race}</span>
                    <span className="text-[#8a9cc0]">{cls?.name ?? c.class}</span>
                    <span>Niv. {c.level}</span>
                    <span>{c.startingVillage?.name ?? 'Monde'}</span>
                  </div>
                </div>
                <button
                  onClick={() => enter(c.id)}
                  disabled={entering !== null}
                  className="min-h-[44px] shrink-0 rounded-sm border border-[#b8985c66] bg-[#2a2038] px-5 text-xs font-bold uppercase tracking-[0.15em] text-[#e8d8b0] transition hover:bg-[#3a2c48] disabled:opacity-50"
                >
                  {entering === c.id ? '…' : 'Entrer'}
                </button>
              </motion.div>
            )
          })}
        </div>

        {characters.length < 4 && (
          <button
            onClick={() => setPhase('name')}
            className="mt-6 min-h-[56px] w-full rounded-md border border-dashed border-[#3a3050] text-sm font-semibold uppercase tracking-[0.25em] text-[#8a80a0] transition hover:border-[#b8985c66] hover:text-[#d4b878]"
          >
            + Créer un nouveau personnage
          </button>
        )}

        {useCreatorStore.getState().error && (
          <div className="mt-4 rounded-sm border border-[#8c3a2e55] bg-[#8c3a2e18] px-4 py-3 text-sm text-[#e89880]">
            {useCreatorStore.getState().error}
          </div>
        )}

        <button
          onClick={logout}
          className="mx-auto mt-8 block text-xs uppercase tracking-[0.2em] text-[#6a6080] transition hover:text-[#9a90b0]"
        >
          Déconnexion
        </button>
      </div>
    </div>
  )
}
