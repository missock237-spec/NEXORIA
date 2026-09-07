'use client'

// NEXORIA — Écran d'authentification : inscription, connexion, récupération de compte
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useCreatorStore } from '@/lib/store'

type Mode = 'login' | 'register' | 'recover'

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [recoveryKey, setRecoveryKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shownRecoveryKey, setShownRecoveryKey] = useState<string | null>(null)

  const setPhase = useCreatorStore((s) => s.setPhase)
  const setAccount = useCreatorStore((s) => s.setAccount)
  const setCharacters = useCreatorStore((s) => s.setCharacters)

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const url = mode === 'register' ? '/api/auth/register' : mode === 'recover' ? '/api/auth/recover' : '/api/auth/login'
      const payload = mode === 'recover' ? { email, recoveryKey, newPassword } : { email, password }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erreur inconnue')
        return
      }
      if (mode === 'register' && data.recoveryKey) {
        setShownRecoveryKey(data.recoveryKey)
        setAccount({ accountId: data.accountId, email: data.email })
        return
      }
      setAccount({ accountId: data.accountId, email: data.email })
      // Vérifier si le compte possède déjà des personnages
      const sRes = await fetch('/api/auth/session')
      const sData = await sRes.json()
      if (sData.authenticated) {
        setCharacters(sData.characters ?? [])
        setPhase(sData.characters?.length > 0 ? 'charselect' : 'name')
      } else {
        setPhase('name')
      }
    } catch {
      setError('Connexion au serveur impossible. Vérifiez votre réseau.')
    } finally {
      setBusy(false)
    }
  }

  if (shownRecoveryKey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0a14] px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-md border border-[#b8985c55] bg-[#16121f] p-8 text-center"
        >
          <h2 className="text-xl font-bold uppercase tracking-[0.2em] text-[#e8d8b0]">Compte créé</h2>
          <p className="mt-3 text-sm text-[#9a90b0]">
            Notez précieusement votre <span className="text-[#d4b878]">clé de récupération</span>.
            Elle ne sera plus jamais affichée. Elle permet de récupérer votre compte sans mot de passe.
          </p>
          <div className="mt-5 select-all rounded-sm border border-[#b8985c88] bg-[#0c0a14] px-4 py-3 font-mono text-lg tracking-[0.2em] text-[#d4b878]">
            {shownRecoveryKey}
          </div>
          <button
            onClick={() => {
              setCharacters([])
              setPhase('name')
            }}
            className="mt-6 min-h-[48px] w-full rounded-sm bg-gradient-to-b from-[#8c6b2e] to-[#6b4e1e] text-sm font-bold uppercase tracking-[0.25em] text-white transition hover:from-[#a87c3a] active:scale-[0.99]"
          >
            J’ai noté ma clé — Continuer
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0c0a14] px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <div className="text-3xl font-black tracking-[0.25em] text-[#e8d8b0]">NEXORIA</div>
          <div className="mt-2 h-px w-32 mx-auto bg-gradient-to-r from-transparent via-[#b8985c88] to-transparent" />
        </div>

        <div className="rounded-md border border-[#2c2438] bg-[#16121f] p-6 shadow-2xl sm:p-8">
          <div className="mb-6 grid grid-cols-3 gap-1 rounded-sm bg-[#0c0a14] p-1">
            {(['login', 'register', 'recover'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null) }}
                className={`min-h-[40px] rounded-sm text-[11px] font-bold uppercase tracking-wider transition ${
                  mode === m ? 'bg-[#2a2038] text-[#e8d8b0] shadow' : 'text-[#6a6080] hover:text-[#9a90b0]'
                }`}
              >
                {m === 'login' ? 'Connexion' : m === 'register' ? 'Créer un compte' : 'Récupérer'}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); submit() }}
            className="space-y-4"
          >
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a80a0]">Adresse email</span>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="heros@nexoria.world"
                className="min-h-[48px] w-full rounded-sm border border-[#2c2438] bg-[#0c0a14] px-4 text-sm text-[#e8e4f0] outline-none transition focus:border-[#b8985c88]"
              />
            </label>

            {mode !== 'recover' ? (
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a80a0]">Mot de passe</span>
                <input
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? '8 caractères minimum, lettres + chiffres' : '••••••••'}
                  className="min-h-[48px] w-full rounded-sm border border-[#2c2438] bg-[#0c0a14] px-4 text-sm text-[#e8e4f0] outline-none transition focus:border-[#b8985c88]"
                />
              </label>
            ) : (
              <>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a80a0]">Clé de récupération</span>
                  <input
                    required value={recoveryKey} onChange={(e) => setRecoveryKey(e.target.value)}
                    placeholder="XXXXXXXX-XXXXXXXX"
                    className="min-h-[48px] w-full rounded-sm border border-[#2c2438] bg-[#0c0a14] px-4 font-mono text-sm text-[#e8e4f0] outline-none focus:border-[#b8985c88]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a80a0]">Nouveau mot de passe</span>
                  <input
                    type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    className="min-h-[48px] w-full rounded-sm border border-[#2c2438] bg-[#0c0a14] px-4 text-sm text-[#e8e4f0] outline-none focus:border-[#b8985c88]"
                  />
                </label>
              </>
            )}

            {error && (
              <div className="rounded-sm border border-[#8c3a2e55] bg-[#8c3a2e18] px-4 py-3 text-sm text-[#e89880]">{error}</div>
            )}

            <button
              type="submit" disabled={busy}
              className="min-h-[52px] w-full rounded-sm bg-gradient-to-b from-[#8c6b2e] to-[#6b4e1e] text-sm font-bold uppercase tracking-[0.25em] text-white transition hover:from-[#a87c3a] disabled:opacity-50 active:scale-[0.99]"
            >
              {busy ? 'Vérification…' : mode === 'login' ? 'Se connecter' : mode === 'register' ? 'Créer mon compte' : 'Récupérer mon compte'}
            </button>
          </form>

          <button
            onClick={() => setPhase('title')}
            className="mt-5 w-full text-center text-xs uppercase tracking-[0.2em] text-[#6a6080] transition hover:text-[#9a90b0]"
          >
            ← Retour
          </button>
        </div>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-[#584f6a]">
          Votre compte est distinct de vos personnages. Un même compte peut
          héberger jusqu’à 4 héros, jouables depuis n’importe quel appareil.
        </p>
      </motion.div>
    </div>
  )
}
