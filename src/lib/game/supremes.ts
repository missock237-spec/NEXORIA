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
// MISE À JOUR MAJEURE — « LES 10 SUPRÊMES EN 3D, PRÊTS À JOUER »
// Chaque Suprême possède des caractéristiques supérieures à tout
// ce qui existe dans NEXORIA et est INVINCIBLE. Les 10 sont
// désormais jouables en 3D dans leur Sanctuaire élémentaire.
// ══════════════════════════════════════════════════════════════

/** Types de effets visuels jouables dans le Sanctuaire 3D */
export type VfxKind = 'strike' | 'ring' | 'nova' | 'rise' | 'orbit'

export interface SupremeAbilityDef {
  name: string
  desc: string
  vfx: VfxKind
}

/** Caractéristiques de combat — valeurs au-delà de toute échelle du jeu */
export interface SupremeStatsDef {
  pv: number
  attaque: number
  defense: number
  vitesse: number
  puissance: number
}

/** Aucune créature, héros, boss ou armée de NEXORIA n'atteint ces valeurs. */
export const ULTIMATE_STATS: SupremeStatsDef = {
  pv: 999_999_999,
  attaque: 999_999_999,
  defense: 999_999_999,
  vitesse: 999_999_999,
  puissance: 999_999_999,
}

export interface SupremePalette {
  primary: string // matériau principal du modèle 3D
  secondary: string // matériau secondaire (armure, pierre, métal…)
  glow: string // émission lumineuse (yeux, fissures, aura)
  deep: string // variante sombre (cape, ombres)
}

export interface SupremePowerDef {
  stats: SupremeStatsDef
  invincible: true // aucun dégât ne peut être infligé à un Suprême
  niveau: '∞'
  menace: '∞'
  abilities: [SupremeAbilityDef, SupremeAbilityDef, SupremeAbilityDef]
  palette: SupremePalette
}

export const SUPREME_POWER: Record<SupremeId, SupremePowerDef> = {
  aetherion: {
    stats: ULTIMATE_STATS,
    invincible: true,
    niveau: '∞',
    menace: '∞',
    abilities: [
      { name: 'Colère du Ciel', desc: 'Des éclairs géants s’abattent du firmament en continu.', vfx: 'strike' },
      { name: 'Tempête Gravitationnelle', desc: 'Une onde de choc annulaire balaye toute l’arène.', vfx: 'ring' },
      { name: 'Forme Spirituelle', desc: 'Il devient intangible — le ciel lui-même le protège.', vfx: 'nova' },
    ],
    palette: { primary: '#f0ead8', secondary: '#c8a850', glow: '#58a8f0', deep: '#3a4460' },
  },
  noxar: {
    stats: ULTIMATE_STATS,
    invincible: true,
    niveau: '∞',
    menace: '∞',
    abilities: [
      { name: 'Éclipse Totale', desc: 'La lumière meurt. Le monde entier s’agenouille.', vfx: 'nova' },
      { name: 'Faim des Âmes', desc: 'Il dévore l’obscurité des cœurs et grandit à jamais.', vfx: 'orbit' },
      { name: 'Voile Nocturne', desc: 'Les ténèbres montent du sol et recouvrent tout.', vfx: 'rise' },
    ],
    palette: { primary: '#171224', secondary: '#2a1f3e', glow: '#8858c8', deep: '#0c0814' },
  },
  thalyss: {
    stats: ULTIMATE_STATS,
    invincible: true,
    niveau: '∞',
    menace: '∞',
    abilities: [
      { name: 'Pression Abyssale', desc: 'Le poids de l’océan entier écrase ses ennemis.', vfx: 'ring' },
      { name: 'Colère des Courants', desc: 'Des colonnes d’eau perforantes jaillissent des abysses.', vfx: 'strike' },
      { name: 'Appel du Léviathan', desc: 'Toute la vie marine répond à sa voix.', vfx: 'orbit' },
    ],
    palette: { primary: '#38b8c8', secondary: '#187888', glow: '#98e8f0', deep: '#0c3038' },
  },
  ignarok: {
    stats: ULTIMATE_STATS,
    invincible: true,
    niveau: '∞',
    menace: '∞',
    abilities: [
      { name: 'Éruption Supervolcan', desc: 'Le ciel devient une pluie de magma brûlant.', vfx: 'strike' },
      { name: 'Séisme de Magma', desc: 'Des ondes de lave jaillissent du cœur de la terre.', vfx: 'ring' },
      { name: 'Cœur du Monde', desc: 'Le sol fond — la région entière devient un enfer.', vfx: 'nova' },
    ],
    palette: { primary: '#2b1a12', secondary: '#4a2c18', glow: '#e85818', deep: '#180c08' },
  },
  verdania: {
    stats: ULTIMATE_STATS,
    invincible: true,
    niveau: '∞',
    menace: '∞',
    abilities: [
      { name: 'Racines Éternelles', desc: 'La forêt tout entière se dresse pour la défendre.', vfx: 'rise' },
      { name: 'Invocation Sauvage', desc: 'Toutes les créatures de NEXORIA lui obéissent.', vfx: 'orbit' },
      { name: 'Régénération Absolue', desc: 'Son corps se reconstruit — indestructible, éternel.', vfx: 'nova' },
    ],
    palette: { primary: '#5c4033', secondary: '#3d6b2f', glow: '#58b848', deep: '#241812' },
  },
  chronyx: {
    stats: ULTIMATE_STATS,
    invincible: true,
    niveau: '∞',
    menace: '∞',
    abilities: [
      { name: 'Arrêt du Temps', desc: 'Le monde se fige. Lui, seul, continue d’exister.', vfx: 'ring' },
      { name: 'Clones Temporels', desc: 'Mille versions de lui-même frappent ensemble.', vfx: 'orbit' },
      { name: 'Retour en Arrière', desc: 'Le combat recommence… mais vous gardez des souvenirs.', vfx: 'nova' },
    ],
    palette: { primary: '#d8b838', secondary: '#8a6820', glow: '#f8e8a8', deep: '#3a2c0c' },
  },
  morpheus: {
    stats: ULTIMATE_STATS,
    invincible: true,
    niveau: '∞',
    menace: '∞',
    abilities: [
      { name: 'Réalité Perçue', desc: 'Ce que vous voyez n’a jamais existé.', vfx: 'nova' },
      { name: 'Miroirs Illusoires', desc: 'Le vrai Morpheus est déjà derrière vous.', vfx: 'orbit' },
      { name: 'Brouillard de Vérité', desc: 'Seule la communication révèle ce qui est réel.', vfx: 'rise' },
    ],
    palette: { primary: '#c858a8', secondary: '#6a2878', glow: '#f0a8e0', deep: '#241030' },
  },
  omega_x: {
    stats: ULTIMATE_STATS,
    invincible: true,
    niveau: '∞',
    menace: '∞',
    abilities: [
      { name: 'Protocole d’Adaptation', desc: 'Il analyse votre stratégie et développe un contre.', vfx: 'nova' },
      { name: 'Essaim Mécanique', desc: 'La cité mécanique entière se mobilise pour lui.', vfx: 'orbit' },
      { name: 'Purge Systémique', desc: 'Des frappes orbitales d’une précision absolue.', vfx: 'strike' },
    ],
    palette: { primary: '#3c4654', secondary: '#2c3844', glow: '#48b8f0', deep: '#182028' },
  },
  vhalor: {
    stats: ULTIMATE_STATS,
    invincible: true,
    niveau: '∞',
    menace: '∞',
    abilities: [
      { name: 'Légion des Tombés', desc: 'Les héros morts se relèvent et combattent à ses côtés.', vfx: 'rise' },
      { name: 'Chaîne des Âmes', desc: 'Les esprits enchaînés frappent en son nom.', vfx: 'orbit' },
      { name: 'Résurrection Inversée', desc: 'Il ressuscite le passé… et le retourne contre vous.', vfx: 'nova' },
    ],
    palette: { primary: '#68a8b0', secondary: '#24444c', glow: '#b0e8f0', deep: '#0e2028' },
  },
  inconnu: {
    stats: ULTIMATE_STATS,
    invincible: true,
    niveau: '∞',
    menace: '∞',
    abilities: [
      { name: 'Existence Légendaire', desc: 'Sa simple présence déforme la réalité.', vfx: 'nova' },
      { name: 'Peur des Suprêmes', desc: 'Même les 9 autres Suprêmes s’inclinent.', vfx: 'ring' },
      { name: '???', desc: 'Personne ne connaît ce pouvoir. Personne n’a survécu.', vfx: 'strike' },
    ],
    palette: { primary: '#1a1418', secondary: '#2e2830', glow: '#e8c060', deep: '#0c0a0e' },
  },
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
