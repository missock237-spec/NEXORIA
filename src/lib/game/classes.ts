// NEXORIA — Les 4 classes initiales + équipement de départ
// Toutes les combinaisons race × classe sont autorisées.

import type { ClassDef, ClassId, EquipmentDef } from './types'

export const CLASSES: Record<ClassId, ClassDef> = {
  combattant: {
    id: 'combattant',
    name: 'Combattant',
    description:
      "Le rempart inébranlable du champ de bataille. Le Combattant mêle épée lourde et bouclier pour absorber les coups, protéger ses alliés et frapper avec une puissance méthodique.",
    combatStyle: 'Mêlée défensive — tank et contrôle',
    mainWeapon: 'Épée longue + Bouclier',
    difficulty: 1,
    difficultyLabel: 'Débutant',
    playStyle: 'Absorber, protéger, marteler',
    statModifiers: { force: 5, vitalite: 5, esprit: 1, agilite: -1 },
    skills: [
      { name: 'Frappe de bouclier', description: 'Frappe l’ennemi avec le bouclier, l’étourdit 2 secondes.' },
      { name: 'Posture ferme', description: 'Réduit les dégâts subis de 30% pendant 8 secondes.' },
      { name: 'Cri de guerre', description: 'Provoque les ennemis proches et augmente votre défense.' },
    ],
    startingEquipment: ['epee_novice', 'bouclier_ecorce', 'armure_plaques_ligee', 'gants_cuir', 'bottes_marche', 'cape_recrue'],
  },
  epeiste: {
    id: 'epeiste',
    name: 'Épéiste',
    description:
      "Le duelliste pur. L'Épéiste manie une seule lame avec une précision chirurgicale : esquives fluides, ripostes éclair et enchaînements de sabre d'une élégance mortelle.",
    combatStyle: 'Mêlée offensive — duel et combos',
    mainWeapon: 'Épée élégante à une main',
    difficulty: 2,
    difficultyLabel: 'Facile',
    playStyle: 'Esquiver, enchaîner, perforer',
    statModifiers: { force: 4, agilite: 4, vitalite: 1 },
    skills: [
      { name: 'Taillade ascendante', description: 'Coupe ascendant projetant légèrement l’ennemi.' },
      { name: 'Pas du vent', description: 'Esquive rapide vers l’avant, annule les dégâts pendant la traverse.' },
      { name: 'Série triple lame', description: 'Trois coups rapides; le dernier brise la garde adverse.' },
    ],
    startingEquipment: ['epee_legant', 'armure_cuir_souple', 'gants_duelliste', 'bottes_passage', 'cape_voyage'],
  },
  mage: {
    id: 'mage',
    name: 'Mage',
    description:
      "L'architecte des éléments. Le Mage canalise l'énergie arcanique à travers son bâton pour déchaîner des projectiles dévastateurs — mais son corps reste fragile derrière ses sorts.",
    combatStyle: 'Distance magique — dégâts de zone',
    mainWeapon: 'Bâton arcanique + Grimoire',
    difficulty: 3,
    difficultyLabel: 'Intermédiaire',
    playStyle: 'Canaliser, esquiver, dévaster',
    statModifiers: { intelligence: 6, esprit: 4, force: -2, vitalite: -1 },
    skills: [
      { name: 'Trait arcanique', description: 'Projectile magique rapide, votre attaque de base.' },
      { name: 'Bouclier de mana', description: 'Absorbe les dégâts avec votre réserve de mana.' },
      { name: 'Nova de givre', description: 'Explosion glaciale autour de vous, ralentit les ennemis.' },
    ],
    startingEquipment: ['baton_apprenti', 'grimoire_prime', 'robe_apprenti', 'gants_soie', 'bottes_silence', 'cape_erudit'],
  },
  ninja: {
    id: 'ninja',
    name: 'Ninja',
    description:
      "L'ombre qui danse. Le Ninja enchaîne dagues et kunai, se fond dans le décor et frappe là où l'ennemi ne regarde pas. Attaques rapides, critiques mortels, fuites invisibles.",
    combatStyle: 'Mêlée rapide — crits et invisibilité',
    mainWeapon: 'Dagues jumelles + Kunai',
    difficulty: 4,
    difficultyLabel: 'Avancé',
    playStyle: 'Se cacher, frapper, disparaître',
    statModifiers: { agilite: 6, chance: 3, force: 1, vitalite: -1 },
    skills: [
      { name: 'Double lacération', description: 'Deux coups de dagues ultra-rapides, forts critiques.' },
      { name: 'Lancer de kunai', description: 'Projectile précis qui marque l’ennemi à distance.' },
      { name: 'Fumigène', description: 'Disparaît dans la fumée pendant 4 secondes.' },
    ],
    startingEquipment: ['dagues_novice', 'kunai_fer', 'tenue_chasseur', 'masque_linceul', 'bottes_silence', 'sash_ombre'],
  },
}

export const CLASS_LIST: ClassDef[] = Object.values(CLASSES)

export function getClass(id: string): ClassDef | undefined {
  return CLASSES[id as ClassId]
}

// ============================================================
// ÉQUIPEMENT DE DÉPART — catalogue visuel
// ============================================================

export const EQUIPMENT_CATALOG: Record<string, EquipmentDef> = {
  epee_novice: { id: 'epee_novice', name: 'Épée du novice', slot: 'WEAPON_MAIN', visual: 'sword', color: '#9aa2ad', description: 'Une lame simple mais fiable, forgée pour les premières batailles.' },
  bouclier_ecorce: { id: 'bouclier_ecorce', name: 'Bouclier d’écorce', slot: 'WEAPON_OFFHAND', visual: 'shield', color: '#7a5230', description: 'Bouclier renforcé d’écorce de chêne-gris, léger et résistant.' },
  armure_plaques_ligee: { id: 'armure_plaques_ligee', name: 'Armure de plaques ligée', slot: 'TORSO', visual: 'heavy_armor', color: '#6b7280', description: 'Plaques de fer ligées sur gambison, protection complète.' },
  gants_cuir: { id: 'gants_cuir', name: 'Gants de cuir bouilli', slot: 'HANDS', visual: 'gloves', color: '#5a4630', description: 'Gants durcis au feu, poigne sûre sur la garde et l’arme.' },
  bottes_marche: { id: 'bottes_marche', name: 'Bottes de marche', slot: 'FEET', visual: 'boots', color: '#4a3826', description: 'Bottes renforcées, semelles épaisses pour longues routes.' },
  cape_recrue: { id: 'cape_recrue', name: 'Cape de recrue', slot: 'BACK', visual: 'cape', color: '#8c3a2e', description: 'Cape courte marquée du sceau de la garnison locale.' },

  epee_legant: { id: 'epee_legant', name: 'Épée du duelliste', slot: 'WEAPON_MAIN', visual: 'sword_slim', color: '#c0c8d4', description: 'Lame effilée et équilibrée, danse dans la main comme un fil.' },
  armure_cuir_Souple: { id: 'armure_cuir_Souple', name: 'Armure de cuir souple', slot: 'TORSO', visual: 'light_armor', color: '#6b4a2e', description: 'Cuir assoupli à l’huile, liberté de mouvement totale.' },
  gants_duelliste: { id: 'gants_duelliste', name: 'Gants du duelliste', slot: 'HANDS', visual: 'gloves', color: '#2c2c2c', description: 'Gants fins paume renforcée, sensibilité parfaite.' },
  bottes_passage: { id: 'bottes_passage', name: 'Bottes de passage', slot: 'FEET', visual: 'boots', color: '#3a2c1e', description: 'Bottes silencieuses à semelles tressées.' },
  cape_voyage: { id: 'cape_voyage', name: 'Cape de voyage', slot: 'BACK', visual: 'cape', color: '#4a5a6b', description: 'Cape usée par les routes, repousse la pluie et les regards.' },

  baton_apprenti: { id: 'baton_apprenti', name: 'Bâton de l’apprenti', slot: 'WEAPON_MAIN', visual: 'staff', color: '#7a5230', description: 'Bâton de bois-vif serti d’une pierre lunaire timide.' },
  grimoire_prime: { id: 'grimoire_prime', name: 'Grimoire des premières pages', slot: 'WEAPON_OFFHAND', visual: 'tome', color: '#5c2c4a', description: 'Grimoire d’occasion, les marges grouillent de notes d’anciens élèves.' },
  robe_apprenti: { id: 'robe_apprenti', name: 'Robe de l’apprenti', slot: 'TORSO', visual: 'robe', color: '#3d4a6b', description: 'Robe tissée de fils conducteurs, garde le corps au chaud les nuits d’étude.' },
  gants_soie: { id: 'gants_soie', name: 'Gants de soie arcanique', slot: 'HANDS', visual: 'gloves', color: '#8c7ba8', description: 'Gants de soie améliorant la canalisation du mana.' },
  bottes_silence: { id: 'bottes_silence', name: 'Bottes du silence', slot: 'FEET', visual: 'boots', color: '#2c2c3a', description: 'Bottes légères qui effacent le bruit des pas.' },
  cape_erudit: { id: 'cape_erudit', name: 'Cape de l’érudit', slot: 'BACK', visual: 'cape', color: '#4a3d6b', description: 'Cape brodée de constellations approximatives.' },

  dagues_novice: { id: 'dagues_novice', name: 'Dagues du novice', slot: 'WEAPON_MAIN', visual: 'daggers', color: '#9aa2ad', description: 'Paire de dagues équilibrées, rapides et discrètes.' },
  kunai_fer: { id: 'kunai_fer', name: 'Kunai de fer', slot: 'WEAPON_OFFHAND', visual: 'kunai', color: '#7a828c', description: 'Projectiles de lancer à la pointe lourde.' },
  tenue_chasseur: { id: 'tenue_chasseur', name: 'Tenue de chasseur', slot: 'TORSO', visual: 'ninja_outfit', color: '#2c352c', description: 'Tenue ajustée verte des pisteurs, se fond dans les fourrés.' },
  masque_linceul: { id: 'masque_linceul', name: 'Masque-linceul', slot: 'FACE', visual: 'mask', color: '#1c1c24', description: 'Masque de tissu sombre qui ne laisse que le regard.' },
  sash_ombre: { id: 'sash_ombre', name: 'Écharpe de l’ombre', slot: 'BACK', visual: 'sash', color: '#1c1c24', description: 'Écharpe longue qui ondule derrière vous comme une traînée de nuit.' },
}

export function getEquipment(id: string): EquipmentDef | undefined {
  return EQUIPMENT_CATALOG[id]
}

export function getStartingEquipment(classId: string): EquipmentDef[] {
  const cls = getClass(classId)
  if (!cls) return []
  return cls.startingEquipment.map((id) => EQUIPMENT_CATALOG[id]).filter(Boolean)
}
