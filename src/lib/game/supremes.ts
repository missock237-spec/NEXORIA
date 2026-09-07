// NEXORIA — Les 10 Suprêmes
// « Ils ne sont pas seulement des boss… Ils sont les piliers de NEXORIA. »
// 10 légendes · 10 éléments · 1 seul monde.
// Données officielles du Codex. Le combat complet livrable en jeu est
// implémenté pour AETHERION (Suprême #01) ; les autres sont consultables
// dans le Codex et arriveront comme boss jouables dans les mises à jour suivantes.

export type SupremeId =
  | 'aetherion'
  | 'noxar'
  | 'thalyss'
  | 'ignarok'
  | 'verdania'
  | 'chronyx'
  | 'morpheus'
  | 'omega_x'
  | 'vhalor'
  | 'inconnu'

export type ElementId =
  | 'eclair' | 'tenebres' | 'eau' | 'feu' | 'nature'
  | 'temps' | 'illusion' | 'mecanique' | 'ame' | 'inconnu'

export interface SupremeDef {
  id: SupremeId
  index: number
  name: string
  title: string
  element: ElementId
  elementLabel: string
  color: string // couleur d'élément (badge du Codex)
  glow: string // halo du portrait
  lore: string[] // description officielle
  domain: string
  implementable: boolean // boss jouable en jeu actuellement
}

export const SUPREMES: Record<SupremeId, SupremeDef> = {
  aetherion: {
    id: 'aetherion',
    index: 1,
    name: 'AETHERION',
    title: 'Le Roi du Ciel',
    element: 'eclair',
    elementLabel: 'ÉCLAIR',
    color: '#58a8f0',
    glow: '#a8d8ff',
    lore: [
      'Il règne sur les cieux et contrôle la foudre. Son domaine est une forteresse flottante au-dessus des nuages.',
      'Plus la tempête est forte, plus il devient puissant.',
    ],
    domain: 'Forteresse céleste',
    implementable: true,
  },
  noxar: {
    id: 'noxar',
    index: 2,
    name: 'NOXAR',
    title: 'L’Éternité Noire',
    element: 'tenebres',
    elementLabel: 'TÉNÈBRES',
    color: '#8858c8',
    glow: '#b898e8',
    lore: [
      'Il incarne les ténèbres et la peur. Son pouvoir grandit lorsque la lumière diminue.',
      'Il se nourrit de l’obscurité du monde et des âmes.',
    ],
    domain: 'Le Voile Nocturne',
    implementable: false,
  },
  thalyss: {
    id: 'thalyss',
    index: 3,
    name: 'THALYSS',
    title: 'La Reine des Abysses',
    element: 'eau',
    elementLabel: 'EAU',
    color: '#38b8c8',
    glow: '#98e8f0',
    lore: [
      'Elle règne sur les océans et les abysses. Son domaine est un monde sous-marin inconnu et terrifiant.',
      'Elle peut modifier les courants, la pression et la vie marine.',
    ],
    domain: 'Les Abysses',
    implementable: false,
  },
  ignarok: {
    id: 'ignarok',
    index: 4,
    name: 'IGNAROK',
    title: 'Le Cœur du Monde',
    element: 'feu',
    elementLabel: 'FEU',
    color: '#e85818',
    glow: '#f8a868',
    lore: [
      'Il est un colosse né du volcan. Son corps est une montagne vivante.',
      'Lors de son éveil, il peut transformer entièrement la région en enfer.',
    ],
    domain: 'Le Cœur Volcanique',
    implementable: false,
  },
  verdania: {
    id: 'verdania',
    index: 5,
    name: 'VERDANIA',
    title: 'La Mère Sauvage',
    element: 'nature',
    elementLabel: 'NATURE',
    color: '#58b848',
    glow: '#a8e898',
    lore: [
      'Elle contrôle la vie et la nature. Son domaine est une forêt éternelle qui ne cesse de grandir.',
      'Elle peut transformer le terrain, invoquer des créatures et régénérer son corps.',
    ],
    domain: 'La Forêt Éternelle',
    implementable: false,
  },
  chronyx: {
    id: 'chronyx',
    index: 6,
    name: 'CHRONYX',
    title: 'Le Maître du Temps',
    element: 'temps',
    elementLabel: 'TEMPS',
    color: '#d8b838',
    glow: '#f8e8a8',
    lore: [
      'Il manipule le temps à sa guise. Il peut ralentir, accélérer, revenir en arrière ou créer des clones temporels.',
      'En phase finale, le combat recommence… mais vous gardez certains souvenirs.',
    ],
    domain: 'L’Horizon Figé',
    implementable: false,
  },
  morpheus: {
    id: 'morpheus',
    index: 7,
    name: 'MORPHEUS',
    title: 'Le Seigneur des Illusions',
    element: 'illusion',
    elementLabel: 'ILLUSION',
    color: '#c858a8',
    glow: '#f0a8e0',
    lore: [
      'Il peut modifier la réalité perçue de chaque joueur. Ce que vous voyez n’est pas forcément ce que les autres voient.',
      'La communication est la clé pour découvrir la vérité.',
    ],
    domain: 'Le Labyrinthe Onirique',
    implementable: false,
  },
  omega_x: {
    id: 'omega_x',
    index: 8,
    name: 'OMEGA-X',
    title: 'La Machine Originelle',
    element: 'mecanique',
    elementLabel: 'MÉCANIQUE',
    color: '#4878b8',
    glow: '#98c8f0',
    lore: [
      'Il est une intelligence artificielle géante qui apprend et s’adapte. Plus vous utilisez la même stratégie, plus il développe un contre.',
      'Il contrôle une cité mécanique.',
    ],
    domain: 'La Cité Mécanique',
    implementable: false,
  },
  vhalor: {
    id: 'vhalor',
    index: 9,
    name: 'VHALOR',
    title: 'Le Roi des Âmes',
    element: 'ame',
    elementLabel: 'ÂME',
    color: '#68a8b0',
    glow: '#b0e8f0',
    lore: [
      'Il invoque les souvenirs des héros tombés. Son domaine est un royaume spectral rempli de fantômes et d’anciens guerriers.',
      'Il peut ressusciter le passé… mais aussi le retourner contre vous.',
    ],
    domain: 'Le Royaume Spectral',
    implementable: false,
  },
  inconnu: {
    id: 'inconnu',
    index: 10,
    name: '???',
    title: 'Le Suprême Inconnu',
    element: 'inconnu',
    elementLabel: 'INCONNU',
    color: '#9a90b0',
    glow: '#c8c0d8',
    lore: [
      'Son identité est un mystère. Son existence est liée à une légende et une menace.',
      'Personne ne sait s’il est un allié, un ennemi… Mais tous les autres Suprêmes semblent le craindre.',
    ],
    domain: 'Inconnu',
    implementable: false,
  },
}

export const SUPREME_LIST: SupremeDef[] = Object.values(SUPREMES)

export function getSupreme(id: string): SupremeDef | undefined {
  return SUPREMES[id as SupremeId]
}

// ══════════════════════════════════════════════════════════════
// AETHERION — Suprême #01, fiche complète (affiche officielle)
// ══════════════════════════════════════════════════════════════

export interface AetherionPhase {
  index: number
  name: string
  hpThreshold: number // en-dessous de ce % de PV, la phase suivante démarre
  quote: string
  mechanic: string
  attacks: string[]
}

export const AETHERION_SPEC = {
  id: 'aetherion' as SupremeId,
  name: 'AETHERION',
  title: 'Le Roi du Ciel',
  subtitle: 'Le ciel n’est pas sa limite… Il est sa demeure.',
  element: 'Foudre / Ciel',
  domain: 'Forteresse céleste',
  size: '≈ 100 mètres (au garrot)',
  recommendedLevel: '100+ (Équipe)',
  type: 'Suprême (Boss Mondial)',
  particularites: [
    'Contrôle la météo et les courants aériens.',
    'Peut invoquer des éclairs et des tempêtes.',
    'Utilise la gravité et les plateformes volantes.',
    'Attaques à longue portée et en zone.',
    'Peut se transformer en forme spirituelle.',
  ],
  quotes: [
    'Les nuages sont mes ailes, la foudre, ma voix.',
  ],
  phases: [
    {
      index: 1,
      name: 'LE SOUVERAIN DU CIEL',
      hpThreshold: 0.66,
      quote: 'Les nuages sont mes ailes, la foudre, ma voix.',
      mechanic: 'Aetherion plane au-dessus de la forteresse et marque le sol de zones d’impact. Évitez les cercles de foudre puis frappez lorsqu’il descend.',
      attacks: ['Éclair ciblé (zones au sol)', 'Rafale d’éclairs en ligne'],
    },
    {
      index: 2,
      name: 'LA TEMPÊTE SE DÉCHAÎNE',
      hpThreshold: 0.33,
      quote: 'Plus la tempête est forte, plus je deviens puissant.',
      mechanic: 'Il invoque une tempête : la gravité fluctue, des anneaux d’onde de choc balayent l’arène. Frappez le noyau d’énergie exposé entre deux vagues.',
      attacks: ['Onde de choc annulaire', 'Tempête gravitationnelle'],
    },
    {
      index: 3,
      name: 'FORME SPIRITUELLE',
      hpThreshold: 0,
      quote: 'Je suis le ciel. Peut-on tuer le ciel ?',
      mechanic: 'Aetherion se transforme en forme spirituelle : seuls les éclats de son noyau sont vulnérables. Dernière fenêtre pour abattre le Roi du Ciel.',
      attacks: ['Pluie de foudre continue', 'Déflagration spirituelle'],
    },
  ] satisfies AetherionPhase[],
  rewards: [
    { icon: 'core', name: 'Cœur d’Aetherion', description: 'Trophée légendaire — preuve de votre défi au Roi du Ciel.' },
    { icon: 'weapon', name: 'Équipement légendaire (Foudre)', description: 'Skin d’arme : Lame du Roi du Ciel.' },
    { icon: 'material', name: 'Matériaux de craft rares', description: 'Éclats de foudre céleste, monnaie des grands forgerons.' },
    { icon: 'title', name: 'Titre exclusif', description: '« Celui qui a défié le Roi du Ciel ».' },
  ],
  // Équilibrage serveur (le client ne propose jamais ces valeurs)
  balance: {
    recommendedLevelNumber: 100,
    // Multiplicateur de PV du boss selon le niveau du challenger (mode solo)
    // Niveau 100+ : difficulté intégrale ; en dessous : « Épreuve du Ciel » adaptée
    bossHpByPlayerLevel: (level: number): number =>
      Math.round(900 * Math.max(0.35, Math.min(1.6, 0.35 + level / 90))),
    goldReward: 250,
  },
}
