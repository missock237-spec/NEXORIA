// NEXORIA — Types fondamentaux du système de création de personnage
// Toutes les données sont validées côté serveur. Le client n'est jamais autoritaire.

export type RaceId =
  | 'humain'
  | 'elfe'
  | 'elfe_noir'
  | 'lycan'
  | 'drakeen'
  | 'sylphide'
  | 'nain'
  | 'abyssien'
  | 'astreen'

export type ClassId = 'combattant' | 'epeiste' | 'mage' | 'ninja'

export type EquipmentSlot =
  | 'HEAD'
  | 'FACE'
  | 'HAIR'
  | 'TORSO'
  | 'ARMS'
  | 'HANDS'
  | 'LEGS'
  | 'FEET'
  | 'BACK'
  | 'WEAPON_MAIN'
  | 'WEAPON_OFFHAND'
  | 'ACCESSORY_1'
  | 'ACCESSORY_2'

export interface Stats {
  force: number
  agilite: number
  intelligence: number
  vitalite: number
  esprit: number
  chance: number
}

export interface DerivedStats {
  maxHp: number
  maxMp: number
  attaquePhysique: number
  attaqueMagique: number
  defense: number
  esquive: number
  vitesse: number
}

export interface RacialAbility {
  name: string
  description: string
}

export interface FaceParams {
  faceWidth: number // 0..1
  faceHeight: number
  jawWidth: number
  chinLength: number
  noseSize: number
  eyeSize: number
  eyeDistance: number
  browThickness: number
  mouthWidth: number
  earSize: number
}

export interface Appearance {
  skin: string
  face: FaceParams
  eyeColor: string
  hair: {
    style: string
    color: string
    secondaryColor: string
  }
  body: {
    height: number // 0..1 dans les limites de la race
    bulk: number // 0..1 dans les limites de la race
    shoulders: number // 0..1
  }
  marks: {
    type: string // 'aucune' | cicatrice/tatouage générique
    color: string
  }
  outfitTint?: string // teinte des vêtements, validée contre la palette globale
  racial: Record<string, string> // options propres à la race, validées par la définition de race
}

// Palettes de teinte de tenue autorisées (vêtements/cape) — §10 couleurs
export const OUTFIT_TINTS: { id: string; label: string; torso: string; cape: string }[] = [
  { id: 'naturel', label: 'Naturel', torso: '#8a7a5c', cape: '#7a6a50' },
  { id: 'braise', label: 'Braise', torso: '#8c3a2e', cape: '#a8422e' },
  { id: 'mousse', label: 'Mousse', torso: '#4a6b3a', cape: '#3d5a30' },
  { id: 'nuit', label: 'Nuit', torso: '#3a3a4c', cape: '#2c2c3c' },
  { id: 'royal', label: 'Royal', torso: '#5c3a6b', cape: '#4a2c58' },
  { id: 'sable', label: 'Sable', torso: '#c4b088', cape: '#a89870' },
]

export interface EquipmentItem {
  id: string
  name: string
  slot: EquipmentSlot
  visual: string
  color: string
  description: string
}

export interface CharacterEquipment {
  [slot: string]: string // slot -> equipmentId
}

export interface RaceDef {
  id: RaceId
  name: string
  tagline: string
  description: string
  lore: string
  statModifiers: Partial<Stats>
  abilities: RacialAbility[]
  morphology: {
    heightScale: [number, number]
    bulkScale: [number, number]
    skinTones: string[]
    eyeColors: string[]
    hairColors: string[]
    hairStyles: string[]
    earStyle: 'human' | 'elfic' | 'animal' | 'fin' | 'none'
    tail: boolean
  }
  marks: { types: string[]; colors: string[] }
  racialOptions: RacialOption[]
  compatibleVillages: string[]
  difficulty: string
}

export interface RacialOption {
  key: string
  label: string
  values: string[]
  default: string
}

export interface ClassDef {
  id: ClassId
  name: string
  description: string
  combatStyle: string
  mainWeapon: string
  difficulty: 1 | 2 | 3 | 4 | 5
  difficultyLabel: string
  statModifiers: Partial<Stats>
  skills: RacialAbility[]
  startingEquipment: string[]
  playStyle: string
}

export interface VillageDef {
  id: string
  name: string
  theme: 'forest' | 'mountain' | 'dark' | 'wild' | 'plains' | 'coastal' | 'cavern' | 'celestial' | 'wasteland'
  region: string
  description: string
  compatibleRaces: RaceId[]
  multicultural: boolean
  capacity: number
  spawnPoints: SpawnPointDef[]
  scenery: {
    groundColor: string
    pathColor: string
    treeStyle: 'pine' | 'oak' | 'dead' | 'crystal' | 'palm' | 'mushroom' | 'none'
    treeColor: string
    houseStyle: 'wood' | 'stone' | 'darkwood' | 'crystal' | 'troglodyte' | 'nomad'
    houseColor: string
    roofColor: string
    skyTop: string
    skyBottom: string
    fogColor: string
    lightColor: string
    ambientColor: string
  }
  props: string[]
  npcs: NpcDef[]
}

export interface SpawnPointDef {
  id: string
  x: number
  z: number
}

export interface NpcDef {
  id: string
  name: string
  role: 'ancien' | 'marchand' | 'garde' | 'aubergiste' | 'forgeron' | 'guerisseuse' | 'entraineur'
  x: number
  z: number
  color: string
}

export interface NameRules {
  minLength: number
  maxLength: number
  pattern: string
  allowedCharacters: string
}

export interface QualityProfile {
  id: 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA'
  dpr: number
  shadows: boolean
  shadowMapSize: number
  particles: number
  antialias: boolean
  treeDensity: number
  grassCount: number
}

export interface CreateCharacterRequest {
  name: string
  race: string
  class: string
  appearance: Appearance
  equipment: CharacterEquipment
}

export interface EnterWorldResponse {
  character: {
    id: string
    name: string
    race: RaceId
    class: ClassId
    appearance: Appearance
    equipment: CharacterEquipment
    level: number
    xp: number
    stats: Stats & DerivedStats
    quests: Record<string, unknown>
  }
  village: VillageDef
  spawn: { id: string; x: number; z: number }
  intro: {
    title: string
    lines: string[]
  }
}
