// NEXORIA — Configuration globale du système de création
// Les règles de nom sont configurables ici et appliquées CÔTÉ SERVEUR.

import type { NameRules, QualityProfile } from './types'

export const NAME_RULES: NameRules = {
  minLength: 3,
  maxLength: 16,
  // Lettres (accents inclus), espace, apostrophe et tiret
  pattern: "^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$",
  allowedCharacters: "A-Z a-z À-ÿ ' - (espace)",
}

// Noms réservés ou interdits — extensible
export const FORBIDDEN_NAMES = [
  'admin', 'administrateur', 'administrator', 'moderateur', 'moderator', 'modo',
  'gm', 'gamemaster', 'game_master', 'game master', 'support', 'staff',
  'nexoria', 'supreme', 'supreme', 'system', 'dev', 'developer', 'root',
  'null', 'undefined', 'server', 'bot', 'official', 'officiel',
  'encule', 'connard', 'salope', 'pute', 'ntm', 'fdp', 'batard', 'merde',
  'fuck', 'shit', 'bitch', 'asshole', 'nigger', 'nigga', 'cunt',
]

export const SERVER_SEED = 'NEXORIA-WORLD-SEED-0x4E455852'

export const SESSION_COOKIE = 'nexoria_session'
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30 // 30 jours

export const MAX_CHARACTERS_PER_ACCOUNT = 4

// Profils qualité — compatibilité PC + Android
export const QUALITY_PROFILES: Record<string, QualityProfile> = {
  LOW: {
    id: 'LOW', dpr: 0.75, shadows: false, shadowMapSize: 512, particles: 0,
    antialias: false, treeDensity: 0.5, grassCount: 0,
  },
  MEDIUM: {
    id: 'MEDIUM', dpr: 1, shadows: true, shadowMapSize: 1024, particles: 16,
    antialias: true, treeDensity: 0.75, grassCount: 120,
  },
  HIGH: {
    id: 'HIGH', dpr: 1.5, shadows: true, shadowMapSize: 2048, particles: 48,
    antialias: true, treeDensity: 1, grassCount: 320,
  },
  ULTRA: {
    id: 'ULTRA', dpr: 2, shadows: true, shadowMapSize: 4096, particles: 100,
    antialias: true, treeDensity: 1, grassCount: 600,
  },
}

export const DEFAULT_QUALITY_PC: QualityProfile['id'] = 'HIGH'
export const DEFAULT_QUALITY_MOBILE: QualityProfile['id'] = 'MEDIUM'

export function detectPlatform(): 'pc' | 'android' {
  if (typeof window === 'undefined') return 'pc'
  const touch = (navigator.maxTouchPoints ?? 0) > 0 || 'ontouchstart' in window
  const ua = navigator.userAgent.toLowerCase()
  const android = ua.includes('android') || ua.includes('mobile')
  return android || (touch && window.innerWidth < 900) ? 'android' : 'pc'
}

export function loadQualityProfile(): QualityProfile {
  if (typeof window === 'undefined') return QUALITY_PROFILES.HIGH
  const saved = window.localStorage.getItem('nexoria_quality')
  if (saved && QUALITY_PROFILES[saved]) return QUALITY_PROFILES[saved]
  return QUALITY_PROFILES[detectPlatform() === 'android' ? DEFAULT_QUALITY_MOBILE : DEFAULT_QUALITY_PC]
}
