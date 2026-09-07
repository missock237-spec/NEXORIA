'use client'

// NEXORIA — « CRÉEZ VOTRE IDENTITÉ » — choix du nom avec validation SERVEUR en temps réel
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useCreatorStore } from '@/lib/store'
import { NAME_RULES } from '@/lib/game/config'

export function NameScreen() {
  const { draftName, setDraftName, setPhase, account, setAccount, worldConfig } = useCreatorStore()
  const [status, setStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const name = draftName

  // Sécurité : session obligatoire
  useEffect(() => {
    if (!account) {
      fetch('/api/auth/session')
        .then((r) => r.json())
        .then((d) => {
          if (!d.authenticated) setPhase('auth')
          else {
            setAccount({ accountId: d.accountId, email: d.email })
            if (d.characters?.length > 0) {
              useCreatorStore.getState().setCharacters(d.characters)
            }
          }
        })
        .catch(() => setPhase('auth'))
    }
  }, [account, setPhase, setAccount])

  // Validation debouncée côté serveur — le client ne décide jamais seul
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (!name.trim()) return // statut affiché dérivé = 'idle' quand vide
    timer.current = setTimeout(async () => {
      setStatus('checking')
      try {
        const res = await fetch('/api/characters/validate-name', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        })
        const data = await res.json()
        if (!res.ok && res.status === 401) {
          setPhase('auth')
          return
        }
        if (data.valid) {
          setStatus('valid')
          setMessage('Identité disponible')
        } else {
          setStatus('invalid')
          setMessage(data.error ?? 'Nom invalide')
        }
      } catch {
        setStatus('invalid')
        setMessage('Serveur injoignable')
      }
    }, 420)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [name, setPhase])

  function confirm() {
    if (displayStatus !== 'valid') return
    const final = name.trim().replace(/\s+/g, ' ')
    setDraftName(final)
    setPhase('race')
  }

  const rules = worldConfig?.nameRules ?? NAME_RULES
  const displayStatus = !name.trim() ? 'idle' : status
  const displayMessage = !name.trim() ? null : message

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0c0a14] px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <div className="mb-2 text-center text-[11px] uppercase tracking-[0.45em] text-[#8a80a0]">
          Étape 1 — Identité
        </div>
        <h1 className="text-center text-3xl font-black uppercase tracking-[0.2em] text-[#e8d8b0] sm:text-4xl">
          Créez votre identité
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-relaxed text-[#8a80a0]">
          Ce nom marquera le monde. Il est vérifié par le serveur et doit être unique
          parmi tous les héros de NEXORIA.
        </p>

        <div className="mt-8 rounded-md border border-[#2c2438] bg-[#16121f] p-6 sm:p-8">
          <input
            autoFocus
            value={name}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && confirm()}
            maxLength={rules.maxLength + 2}
            placeholder="Nom de votre héros…"
            className="min-h-[64px] w-full rounded-sm border-2 border-[#2c2438] bg-[#0c0a14] px-5 text-center text-2xl font-bold tracking-wide text-[#f0e8d8] outline-none transition placeholder:text-[#4a4260] focus:border-[#b8985c88]"
          />

          <div className="mt-3 flex min-h-[24px] items-center justify-center text-sm">
            {displayStatus === 'checking' && <span className="text-[#8a80a0]">Vérification auprès du serveur…</span>}
            {displayStatus === 'valid' && <span className="text-[#7cc88c]">✦ {message}</span>}
            {displayStatus === 'invalid' && <span className="text-[#e89880]">✕ {message}</span>}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px] uppercase tracking-wider text-[#6a6080]">
            <div className="rounded-sm bg-[#0c0a14] px-2 py-2">
              Longueur
              <div className="mt-0.5 text-[#a898c8]">{rules.minLength}–{rules.maxLength}</div>
            </div>
            <div className="rounded-sm bg-[#0c0a14] px-2 py-2">
              Caractères
              <div className="mt-0.5 text-[#a898c8]">{rules.allowedCharacters}</div>
            </div>
            <div className="rounded-sm bg-[#0c0a14] px-2 py-2">
              Unicité
              <div className="mt-0.5 text-[#a898c8]">Serveur</div>
            </div>
          </div>

          <button
            onClick={confirm}
            disabled={status !== 'valid'}
            className="mt-6 min-h-[52px] w-full rounded-sm bg-gradient-to-b from-[#8c6b2e] to-[#6b4e1e] text-sm font-bold uppercase tracking-[0.25em] text-white transition hover:from-[#a87c3a] disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.99]"
          >
            Valider mon identité
          </button>
        </div>

        <button
          onClick={() => setPhase(account ? 'charselect' : 'title')}
          className="mx-auto mt-6 block text-xs uppercase tracking-[0.2em] text-[#6a6080] transition hover:text-[#9a90b0]"
        >
          ← Retour
        </button>
      </motion.div>
    </div>
  )
}
