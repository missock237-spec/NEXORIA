// NEXORIA — Authentification serveur
// Sessions DB + cookie httpOnly + hachage scrypt (crypto natif Node).
// Le client n'est JAMAIS de confiance : chaque route valide la session.

import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { SESSION_COOKIE, SESSION_DURATION_MS } from './game/config'

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const candidate = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

export function generateRecoveryKey(): string {
  // Clé de récupération affichée une seule fois à l'inscription
  const raw = randomBytes(8).toString('hex').toUpperCase()
  return `${raw.slice(0, 8)}-${raw.slice(8, 16)}`
}

export function recoveryKeyHash(key: string): string {
  return createHash('sha256').update(key.trim().toUpperCase()).digest('hex')
}

export async function createSession(accountId: string): Promise<string> {
  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
  await db.session.create({ data: { token, accountId, expiresAt } })
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })
  return token
}

export interface SessionInfo {
  accountId: string
  email: string
}

export async function getSession(): Promise<SessionInfo | null> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (!token) return null
  const session = await db.session.findUnique({
    where: { token },
    include: { account: { select: { id: true, email: true } } },
  })
  if (!session) return null
  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }
  return { accountId: session.account.id, email: session.account.email }
}

export async function destroySession(): Promise<void> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (token) {
    await db.session.deleteMany({ where: { token } })
  }
  jar.delete(SESSION_COOKIE)
}

export async function requireSession(): Promise<SessionInfo> {
  const session = await getSession()
  if (!session) {
    throw new AuthError('Session requise — veuillez vous connecter', 401)
  }
  return session
}

export class AuthError extends Error {
  status: number
  constructor(message: string, status = 401) {
    super(message)
    this.status = status
  }
}
