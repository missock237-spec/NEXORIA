// NEXORIA — Les villages de départ
// 30 villages répartis par races compatibles, dont plusieurs multiculturels.
// Chaque village possède 6 points de spawn SÛRS (validés hors murs, eau, bâtiments, zones hostiles).

import type { VillageDef } from './types'

export const VILLAGES: VillageDef[] = [
  // ============ HUMAINS (et multiculturels) ============
  {
    id: 'asteria', name: 'Asteria', theme: 'plains', region: 'Plaines d’Orande',
    description: 'Village-carrefour humain, ouvert à toutes les races. Ses marchés accueillent elfes, nains et vagabonds de tout horizon.',
    compatibleRaces: ['humain', 'elfe', 'astreen', 'sylphide'], multicultural: true, capacity: 100,
    spawnPoints: [
      { id: 'Spawn_01', x: -8, z: 10 }, { id: 'Spawn_02', x: 8, z: 10 }, { id: 'Spawn_03', x: 0, z: 14 },
      { id: 'Spawn_04', x: -14, z: 4 }, { id: 'Spawn_05', x: 14, z: 4 }, { id: 'Spawn_06', x: 0, z: -2 },
    ],
    scenery: {
      groundColor: '#6a8c3f', pathColor: '#c9b285', treeStyle: 'oak', treeColor: '#4a7c3a',
      houseStyle: 'wood', houseColor: '#b8946a', roofColor: '#a8422e',
      skyTop: '#7ab8e8', skyBottom: '#d8e8f0', fogColor: '#c8dce8', lightColor: '#fff4e0', ambientColor: '#8ca8c0',
    },
    props: ['well', 'market', 'banner', 'fence', 'cart'],
    npcs: [
      { id: 'ancien', name: 'Ancien Bertrand', role: 'ancien', x: 0, z: -6, color: '#8a7a6a' },
      { id: 'marchand', name: 'Marchande Lyse', role: 'marchand', x: 10, z: -2, color: '#c88c3a' },
      { id: 'garde', name: 'Garde Corvin', role: 'garde', x: -6, z: 2, color: '#6b7280' },
      { id: 'entraineur', name: 'Maître d’armes Rollo', role: 'entraineur', x: 12, z: 8, color: '#8c4a2e' },
    ],
  },
  {
    id: 'valdorian', name: 'Valdorian', theme: 'plains', region: 'Vallée du Serpent',
    description: 'Bastion agricole humain bordé de moulins. Ses garnisons forment les meilleures milices de la région.',
    compatibleRaces: ['humain'], multicultural: false, capacity: 90,
    spawnPoints: [
      { id: 'Spawn_01', x: -8, z: 10 }, { id: 'Spawn_02', x: 8, z: 10 }, { id: 'Spawn_03', x: 0, z: 14 },
      { id: 'Spawn_04', x: -14, z: 4 }, { id: 'Spawn_05', x: 14, z: 4 }, { id: 'Spawn_06', x: 0, z: -2 },
    ],
    scenery: {
      groundColor: '#7c9c46', pathColor: '#d4bd8c', treeStyle: 'oak', treeColor: '#5a8c3a',
      houseStyle: 'wood', houseColor: '#c4a077', roofColor: '#96482e',
      skyTop: '#82bce8', skyBottom: '#e0ecf4', fogColor: '#ccdce8', lightColor: '#fff8e8', ambientColor: '#90b0c8',
    },
    props: ['well', 'mill', 'hay', 'fence'],
    npcs: [
      { id: 'ancien', name: 'Doyenne Marthe', role: 'ancien', x: 0, z: -6, color: '#9a8a7a' },
      { id: 'marchand', name: 'Marchand Osric', role: 'marchand', x: 10, z: -2, color: '#b8802e' },
      { id: 'garde', name: 'Garde Brunhild', role: 'garde', x: -6, z: 2, color: '#5c6670' },
    ],
  },
  {
    id: 'marnhaven', name: 'Marnhaven', theme: 'coastal', region: 'Côte d’Écume',
    description: 'Port-village humain aux maisons de pilotis. Départ des navires d’exploration vers les terres inconnues.',
    compatibleRaces: ['humain'], multicultural: false, capacity: 80,
    spawnPoints: [
      { id: 'Spawn_01', x: -8, z: 12 }, { id: 'Spawn_02', x: 6, z: 12 }, { id: 'Spawn_03', x: 0, z: 16 },
      { id: 'Spawn_04', x: -14, z: 6 }, { id: 'Spawn_05', x: 12, z: 6 }, { id: 'Spawn_06', x: -2, z: 0 },
    ],
    scenery: {
      groundColor: '#8ca86b', pathColor: '#d8c8a0', treeStyle: 'palm', treeColor: '#4a8c5a',
      houseStyle: 'wood', houseColor: '#a8946a', roofColor: '#3d6b7c',
      skyTop: '#6ab0e0', skyBottom: '#e8f0f0', fogColor: '#d0e0e8', lightColor: '#fff8ec', ambientColor: '#98b8c8',
    },
    props: ['dock', 'boat', 'barrel', 'rope'],
    npcs: [
      { id: 'ancien', name: 'Capitaine Aldren', role: 'ancien', x: 0, z: -6, color: '#7a8a9a' },
      { id: 'marchand', name: 'Marchande Sabine', role: 'marchand', x: 10, z: -2, color: '#c8983a' },
      { id: 'garde', name: 'Vigie Talia', role: 'garde', x: -6, z: 2, color: '#5c6c7c' },
    ],
  },
  {
    id: 'bastion_haut', name: 'Bastion-Haut', theme: 'mountain', region: 'Contreforts de Fer',
    description: 'Avant-poste fortifié co-gouverné par humains et nains. Ses forges ne s’éteignent jamais.',
    compatibleRaces: ['humain', 'nain'], multicultural: true, capacity: 85,
    spawnPoints: [
      { id: 'Spawn_01', x: -8, z: 10 }, { id: 'Spawn_02', x: 8, z: 10 }, { id: 'Spawn_03', x: 0, z: 13 },
      { id: 'Spawn_04', x: -13, z: 4 }, { id: 'Spawn_05', x: 13, z: 4 }, { id: 'Spawn_06', x: 0, z: -2 },
    ],
    scenery: {
      groundColor: '#8c8c78', pathColor: '#b0a890', treeStyle: 'pine', treeColor: '#3a5c3a',
      houseStyle: 'stone', houseColor: '#9a9488', roofColor: '#5c4a3a',
      skyTop: '#8ca8c0', skyBottom: '#d8e0e8', fogColor: '#c0ccd4', lightColor: '#fff0d8', ambientColor: '#8898a8',
    },
    props: ['forge', 'banner', 'cart', 'well'],
    npcs: [
      { id: 'ancien', name: 'Sénéchal Godric', role: 'ancien', x: 0, z: -6, color: '#8a8070' },
      { id: 'forgeron', name: 'Forgeron Bram', role: 'forgeron', x: 10, z: -2, color: '#6b4a2e' },
      { id: 'garde', name: 'Garde Elric', role: 'garde', x: -6, z: 2, color: '#667080' },
    ],
  },
  {
    id: 'port_neant', name: 'Port-du-Néant', theme: 'wasteland', region: 'Rivages Gris',
    description: 'Comptoir lugubre où aboutissent les routes sans espoir. Ouvert à tous ceux que nulle part n’attend.',
    compatibleRaces: ['humain', 'elfe_noir', 'abyssien'], multicultural: true, capacity: 70,
    spawnPoints: [
      { id: 'Spawn_01', x: -8, z: 10 }, { id: 'Spawn_02', x: 8, z: 10 }, { id: 'Spawn_03', x: 0, z: 13 },
      { id: 'Spawn_04', x: -13, z: 4 }, { id: 'Spawn_05', x: 13, z: 4 }, { id: 'Spawn_06', x: 0, z: -2 },
    ],
    scenery: {
      groundColor: '#6b6b60', pathColor: '#8c8878', treeStyle: 'dead', treeColor: '#4a4640',
      houseStyle: 'darkwood', houseColor: '#5c5448', roofColor: '#3a342c',
      skyTop: '#5c6470', skyBottom: '#9aa0a8', fogColor: '#788088', lightColor: '#e8e0d0', ambientColor: '#687078',
    },
    props: ['barrel', 'lantern', 'rope', 'cart'],
    npcs: [
      { id: 'ancien', name: 'Intendant Vorh', role: 'ancien', x: 0, z: -6, color: '#5a5a54' },
      { id: 'marchand', name: 'Brocanteur Fenn', role: 'marchand', x: 10, z: -2, color: '#8c7440' },
      { id: 'garde', name: 'Garde Murne', role: 'garde', x: -6, z: 2, color: '#4a4a44' },
    ],
  },

  // ============ ELFES ============
  {
    id: 'sylvarien', name: 'Sylvarien', theme: 'forest', region: 'Forêt-Mère d’Ellonwyn',
    description: 'Cité arboricole elfe tissée dans les branches des arbres-mères. Les lanternes de sève éclairent les passerelles.',
    compatibleRaces: ['elfe'], multicultural: false, capacity: 85,
    spawnPoints: [
      { id: 'Spawn_01', x: -7, z: 10 }, { id: 'Spawn_02', x: 7, z: 10 }, { id: 'Spawn_03', x: 0, z: 14 },
      { id: 'Spawn_04', x: -13, z: 4 }, { id: 'Spawn_05', x: 13, z: 4 }, { id: 'Spawn_06', x: 0, z: -2 },
    ],
    scenery: {
      groundColor: '#4a7c3a', pathColor: '#a8b88a', treeStyle: 'oak', treeColor: '#2e6b2e',
      houseStyle: 'wood', houseColor: '#8ca05a', roofColor: '#3a7c4a',
      skyTop: '#7ac8b8', skyBottom: '#d8f0dc', fogColor: '#b8d8c0', lightColor: '#f0ffe0', ambientColor: '#88b898',
    },
    props: ['lantern', 'archway', 'flowers', 'totem'],
    npcs: [
      { id: 'ancien', name: 'Archonte Sylwen', role: 'ancien', x: 0, z: -6, color: '#b8c890' },
      { id: 'marchand', name: 'Herboriste Naia', role: 'marchand', x: 10, z: -2, color: '#7cb85a' },
      { id: 'garde', name: 'Sentinelle Thalion', role: 'garde', x: -6, z: 2, color: '#4a7c5a' },
    ],
  },
  {
    id: 'val_lunaire', name: 'Val-Lunaire', theme: 'forest', region: 'Clairières d’Argent',
    description: 'Village elfe bâti autour d’un lac qui reflète la lune même en plein jour. Centre d’études des arts lunaires.',
    compatibleRaces: ['elfe', 'astreen'], multicultural: true, capacity: 80,
    spawnPoints: [
      { id: 'Spawn_01', x: -8, z: 12 }, { id: 'Spawn_02', x: 6, z: 12 }, { id: 'Spawn_03', x: 0, z: 15 },
      { id: 'Spawn_04', x: -14, z: 5 }, { id: 'Spawn_05', x: 12, z: 5 }, { id: 'Spawn_06', x: -2, z: -1 },
    ],
    scenery: {
      groundColor: '#5a8c4a', pathColor: '#c8d0b8', treeStyle: 'oak', treeColor: '#3a7c46',
      houseStyle: 'crystal', houseColor: '#b8c8d8', roofColor: '#8ca8c8',
      skyTop: '#88b8d8', skyBottom: '#e8f0f8', fogColor: '#c8d8e8', lightColor: '#f4f0ff', ambientColor: '#98a8c8',
    },
    props: ['pond', 'lantern', 'crystal', 'flowers'],
    npcs: [
      { id: 'ancien', name: 'Prêtresse Elenwe', role: 'ancien', x: 0, z: -6, color: '#c8d0e8' },
      { id: 'marchand', name: 'Marchande Ithil', role: 'marchand', x: 10, z: -2, color: '#a8b8d8' },
      { id: 'garde', name: 'Sentinelle Curufin', role: 'garde', x: -6, z: 2, color: '#5a7c8c' },
    ],
  },
  {
    id: 'cerisaie_perdue', name: 'Cerisaie-Perdue', theme: 'forest', region: 'Bosquets Rose',
    description: 'Village elfe dissimulé dans une cerisaie millénaire. On n’y entre qu’en suivant le chant des rossignols.',
    compatibleRaces: ['elfe', 'sylphide'], multicultural: true, capacity: 70,
    spawnPoints: [
      { id: 'Spawn_01', x: -7, z: 11 }, { id: 'Spawn_02', x: 7, z: 11 }, { id: 'Spawn_03', x: 0, z: 14 },
      { id: 'Spawn_04', x: -13, z: 4 }, { id: 'Spawn_05', x: 13, z: 4 }, { id: 'Spawn_06', x: 0, z: -2 },
    ],
    scenery: {
      groundColor: '#5a8c46', pathColor: '#d8b8c8', treeStyle: 'oak', treeColor: '#8c4a5a',
      houseStyle: 'wood', houseColor: '#c8a8b8', roofColor: '#a85868',
      skyTop: '#98c8d8', skyBottom: '#f8e0e8', fogColor: '#e0c8d0', lightColor: '#fff0f4', ambientColor: '#a8b8b0',
    },
    props: ['flowers', 'lantern', 'archway'],
    npcs: [
      { id: 'ancien', name: 'Gardienne Liriel', role: 'ancien', x: 0, z: -6, color: '#c8a8b8' },
      { id: 'marchand', name: 'Apiariste Vael', role: 'marchand', x: 10, z: -2, color: '#d8a878' },
      { id: 'garde', name: 'Sentinelle Faelan', role: 'garde', x: -6, z: 2, color: '#7c5a68' },
    ],
  },

  // ============ ELFES NOIRS ============
  {
    id: 'umbrafaille', name: 'Umbrafaille', theme: 'dark', region: 'Cavernes d’Obsidienne',
    description: 'Village elfe noir taillé dans l’obsidienne vivante. Les champignons-lanternes y remplacent le soleil.',
    compatibleRaces: ['elfe_noir'], multicultural: false, capacity: 80,
    spawnPoints: [
      { id: 'Spawn_01', x: -7, z: 10 }, { id: 'Spawn_02', x: 7, z: 10 }, { id: 'Spawn_03', x: 0, z: 13 },
      { id: 'Spawn_04', x: -13, z: 4 }, { id: 'Spawn_05', x: 13, z: 4 }, { id: 'Spawn_06', x: 0, z: -2 },
    ],
    scenery: {
      groundColor: '#3a3040', pathColor: '#5c4a68', treeStyle: 'mushroom', treeColor: '#8c5aa8',
      houseStyle: 'darkwood', houseColor: '#48405c', roofColor: '#8c5aa8',
      skyTop: '#241c2e', skyBottom: '#48405c', fogColor: '#30283c', lightColor: '#c8a8e8', ambientColor: '#4a3c5c',
    },
    props: ['lantern', 'spider_web', 'crystal', 'totem'],
    npcs: [
      { id: 'ancien', name: 'Matriarche Vexahlia', role: 'ancien', x: 0, z: -6, color: '#6b5a7c' },
      { id: 'marchand', name: 'Courtier Zaren', role: 'marchand', x: 10, z: -2, color: '#8c5aa8' },
      { id: 'garde', name: 'Lame Nyx', role: 'garde', x: -6, z: 2, color: '#3c3048' },
    ],
  },
  {
    id: 'creuset_sombre', name: 'Creuset-Sombre', theme: 'cavern', region: 'Forges d’En-bas',
    description: 'Village elfe noir minier. Ses alchimistes transforment les minerais interdits en merveilles violettes.',
    compatibleRaces: ['elfe_noir', 'abyssien'], multicultural: true, capacity: 75,
    spawnPoints: [
      { id: 'Spawn_01', x: -7, z: 10 }, { id: 'Spawn_02', x: 7, z: 10 }, { id: 'Spawn_03', x: 0, z: 13 },
      { id: 'Spawn_04', x: -13, z: 4 }, { id: 'Spawn_05', x: 13, z: 4 }, { id: 'Spawn_06', x: 0, z: -2 },
    ],
    scenery: {
      groundColor: '#40384c', pathColor: '#685c7c', treeStyle: 'crystal', treeColor: '#a878c8',
      houseStyle: 'troglodyte', houseColor: '#544a64', roofColor: '#7c58a0',
      skyTop: '#2a2234', skyBottom: '#544a64', fogColor: '#362e42', lightColor: '#d0b0f0', ambientColor: '#504458',
    },
    props: ['forge', 'crystal', 'barrel', 'lantern'],
    npcs: [
      { id: 'ancien', name: 'Surintendant Malrik', role: 'ancien', x: 0, z: -6, color: '#7c6c8c' },
      { id: 'forgeron', name: 'Alchimiste Sable', role: 'forgeron', x: 10, z: -2, color: '#a878c8' },
      { id: 'garde', name: 'Veilleuse Onyx', role: 'garde', x: -6, z: 2, color: '#443a54' },
    ],
  },
  {
    id: 'voile_pourpre', name: 'Voile-Pourpre', theme: 'dark', region: 'Brumes de Sable',
    description: 'Village elfe noir marchand sous dômes de soie. Tout s’y vend, excepté la vérité.',
    compatibleRaces: ['elfe_noir'], multicultural: false, capacity: 70,
    spawnPoints: [
      { id: 'Spawn_01', x: -7, z: 10 }, { id: 'Spawn_02', x: 7, z: 10 }, { id: 'Spawn_03', x: 0, z: 13 },
      { id: 'Spawn_04', x: -13, z: 4 }, { id: 'Spawn_05', x: 13, z: 4 }, { id: 'Spawn_06', x: 0, z: -2 },
    ],
    scenery: {
      groundColor: '#5c4a5c', pathColor: '#8c7888', treeStyle: 'dead', treeColor: '#5c4858',
      houseStyle: 'nomad', houseColor: '#7c5a7c', roofColor: '#a84878',
      skyTop: '#3c3044', skyBottom: '#7c6880', fogColor: '#4c4054', lightColor: '#e8c8f0', ambientColor: '#584c60',
    },
    props: ['market', 'banner', 'lantern', 'cart'],
    npcs: [
      { id: 'ancien', name: 'Voilereine Serai', role: 'ancien', x: 0, z: -6, color: '#8c6c8c' },
      { id: 'marchand', name: 'Marchande Sable-Pourpre', role: 'marchand', x: 10, z: -2, color: '#c86890' },
      { id: 'garde', name: 'Ombre Karsh', role: 'garde', x: -6, z: 2, color: '#443854' },
    ],
  },

  // ============ LYCANS ============
  {
    id: 'meute_du_cendre', name: 'Meute-du-Cendre', theme: 'wild', region: 'Landes de Braise',
    description: 'Village lycan organisé en longues chaumières autour du Feu-du-Conseil. La meute y forme ses petits.',
    compatibleRaces: ['lycan'], multicultural: false, capacity: 85,
    spawnPoints: [
      { id: 'Spawn_01', x: -8, z: 10 }, { id: 'Spawn_02', x: 8, z: 10 }, { id: 'Spawn_03', x: 0, z: 13 },
      { id: 'Spawn_04', x: -14, z: 4 }, { id: 'Spawn_05', x: 14, z: 4 }, { id: 'Spawn_06', x: 0, z: -2 },
    ],
    scenery: {
      groundColor: '#7c6b4a', pathColor: '#a89878', treeStyle: 'pine', treeColor: '#4a5c3a',
      houseStyle: 'wood', houseColor: '#8c7454', roofColor: '#5c4a34',
      skyTop: '#a89878', skyBottom: '#e8d8b8', fogColor: '#c0b090', lightColor: '#ffe8c0', ambientColor: '#a89878',
    },
    props: ['campfire', 'totem', 'rack', 'fence'],
    npcs: [
      { id: 'ancien', name: 'Ancien Garroh', role: 'ancien', x: 0, z: -6, color: '#8c7858' },
      { id: 'marchand', name: 'Dépeceuse Rhea', role: 'marchand', x: 10, z: -2, color: '#a87848' },
      { id: 'entraineur', name: 'Pisteuse Kara', role: 'entraineur', x: 12, z: 8, color: '#6b5c3a' },
    ],
  },
  {
    id: 'val_orage', name: 'Val-d’Orage', theme: 'wild', region: 'Bastions Balayés',
    description: 'Village lycan perché sur des falaises battues par les tempêtes. On y apprend à hurler avant de marcher.',
    compatibleRaces: ['lycan'], multicultural: false, capacity: 75,
    spawnPoints: [
      { id: 'Spawn_01', x: -8, z: 10 }, { id: 'Spawn_02', x: 8, z: 10 }, { id: 'Spawn_03', x: 0, z: 13 },
      { id: 'Spawn_04', x: -14, z: 4 }, { id: 'Spawn_05', x: 14, z: 4 }, { id: 'Spawn_06', x: 0, z: -2 },
    ],
    scenery: {
      groundColor: '#6b7058', pathColor: '#94988c', treeStyle: 'pine', treeColor: '#3a5038',
      houseStyle: 'stone', houseColor: '#7c8074', roofColor: '#484c44',
      skyTop: '#68788c', skyBottom: '#a8b8c0', fogColor: '#8894a0', lightColor: '#f0ece0', ambientColor: '#788898',
    },
    props: ['totem', 'rack', 'fence', 'campfire'],
    npcs: [
      { id: 'ancien', name: 'Ancienne Skadi', role: 'ancien', x: 0, z: -6, color: '#8c9084' },
      { id: 'marchand', name: 'Tanneur Urg', role: 'marchand', x: 10, z: -2, color: '#9a7c58' },
      { id: 'garde', name: 'Sentinelle Fenrir', role: 'garde', x: -6, z: 2, color: '#5c6054' },
    ],
  },
  {
    id: 'pierres_hurlantes', name: 'Pierres-Hurlantes', theme: 'wild', region: 'Mégalithes du Vent',
    description: 'Village lycan-multiracial autour de menhirs qui sifflent au vent. Les voyageurs y trouvent toujours une place au feu.',
    compatibleRaces: ['lycan', 'humain', 'nain'], multicultural: true, capacity: 80,
    spawnPoints: [
      { id: 'Spawn_01', x: -8, z: 10 }, { id: 'Spawn_02', x: 8, z: 10 }, { id: 'Spawn_03', x: 0, z: 13 },
      { id: 'Spawn_04', x: -14, z: 4 }, { id: 'Spawn_05', x: 14, z: 4 }, { id: 'Spawn_06', x: 0, z: -2 },
    ],
    scenery: {
      groundColor: '#6b7058', pathColor: '#98988c', treeStyle: 'pine', treeColor: '#44583a',
      houseStyle: 'wood', houseColor: '#847c64', roofColor: '#544c3c',
      skyTop: '#8898a8', skyBottom: '#c8d0d0', fogColor: '#a0a8b0', lightColor: '#f8f0dc', ambientColor: '#888890',
    },
    props: ['totem', 'campfire', 'market', 'fence'],
    npcs: [
      { id: 'ancien', name: 'Voix-des-Vents Oren', role: 'ancien', x: 0, z: -6, color: '#94907c' },
      { id: 'marchand', name: 'Troqueur Braka', role: 'marchand', x: 10, z: -2, color: '#a88448' },
      { id: 'garde', name: 'Garde Howl', role: 'garde', x: -6, z: 2, color: '#5c5c50' },
    ],
  },

  // ============ DRAKÉENS ============
  {
    id: 'drakmor', name: 'Drakmor', theme: 'mountain', region: 'Cratère-du-Sang-Neuf',
    description: 'Village drakéen construit dans les gradins d’un cratère éteint. La chaleur y nourrit les forges et les œufs.',
    compatibleRaces: ['drakeen'], multicultural: false, capacity: 80,
    spawnPoints: [
      { id: 'Spawn_01', x: -7, z: 10 }, { id: 'Spawn_02', x: 7, z: 10 }, { id: 'Spawn_03', x: 0, z: 13 },
      { id: 'Spawn_04', x: -13, z: 4 }, { id: 'Spawn_05', x: 13, z: 4 }, { id: 'Spawn_06', x: 0, z: -2 },
    ],
    scenery: {
      groundColor: '#7c5a4a', pathColor: '#a07868', treeStyle: 'dead', treeColor: '#5c4438',
      houseStyle: 'stone', houseColor: '#6b5448', roofColor: '#8c3a2e',
      skyTop: '#a86848', skyBottom: '#e0a888', fogColor: '#c08870', lightColor: '#ffd8a8', ambientColor: '#a07868',
    },
    props: ['forge', 'egg', 'banner', 'cart'],
    npcs: [
      { id: 'ancien', name: 'Gardien Vermithor', role: 'ancien', x: 0, z: -6, color: '#8c6448' },
      { id: 'forgeron', name: 'Forge-écaille Draza', role: 'forgeron', x: 10, z: -2, color: '#a04830' },
      { id: 'garde', name: 'Garde Karrax', role: 'garde', x: -6, z: 2, color: '#5c4438' },
    ],
  },
  {
    id: 'ailes_de_pierre', name: 'Ailes-de-Pierre', theme: 'mountain', region: 'Escarpements-du-Souffle',
    description: 'Village drakéen suspendu aux falaises. Les jeunes y apprennent le vol plané avant l’écriture.',
    compatibleRaces: ['drakeen'], multicultural: false, capacity: 70,
    spawnPoints: [
      { id: 'Spawn_01', x: -7, z: 10 }, { id: 'Spawn_02', x: 7, z: 10 }, { id: 'Spawn_03', x: 0, z: 13 },
      { id: 'Spawn_04', x: -13, z: 4 }, { id: 'Spawn_05', x: 13, z: 4 }, { id: 'Spawn_06', x: 0, z: -2 },
    ],
    scenery: {
      groundColor: '#8c8468', pathColor: '#b0a888', treeStyle: 'pine', treeColor: '#44603a',
      houseStyle: 'troglodyte', houseColor: '#7c7460', roofColor: '#4c4438',
      skyTop: '#88a8c0', skyBottom: '#d0d8d8', fogColor: '#b0b8b8', lightColor: '#fff0d0', ambientColor: '#9098a0',
    },
    props: ['banner', 'totem', 'fence'],
    npcs: [
      { id: 'ancien', name: 'Ancien Ozev', role: 'ancien', x: 0, z: -6, color: '#948c74' },
      { id: 'marchand', name: 'Troqueuse Ssara', role: 'marchand', x: 10, z: -2, color: '#a88c48' },
      { id: 'garde', name: 'Garde Tharos', role: 'garde', x: -6, z: 2, color: '#605848' },
    ],
  },
  {
    id: 'sanctuaire_cendre', name: 'Sanctuaire-des-Cendres', theme: 'wasteland', region: 'Terres-Bannies',
    description: 'Monastère drakéen où l’on vénère les os des anciens Dragons. Les pèlerins de toutes races y sont tolérés.',
    compatibleRaces: ['drakeen', 'humain'], multicultural: true, capacity: 65,
    spawnPoints: [
      { id: 'Spawn_01', x: -7, z: 10 }, { id: 'Spawn_02', x: 7, z: 10 }, { id: 'Spawn_03', x: 0, z: 13 },
      { id: 'Spawn_04', x: -13, z: 4 }, { id: 'Spawn_05', x: 13, z: 4 }, { id: 'Spawn_06', x: 0, z: -2 },
    ],
    scenery: {
      groundColor: '#6b584c', pathColor: '#8c7c6c', treeStyle: 'dead', treeColor: '#50443c',
      houseStyle: 'stone', houseColor: '#5c5048', roofColor: '#7c3c30',
      skyTop: '#786058', skyBottom: '#b09880', fogColor: '#8c7c70', lightColor: '#ffe8c0', ambientColor: '#807068',
    },
    props: ['totem', 'lantern', 'egg', 'fence'],
    npcs: [
      { id: 'ancien', name: 'Prieur Ashkar', role: 'ancien', x: 0, z: -6, color: '#807468' },
      { id: 'marchand', name: 'Reliqueuse Ssiva', role: 'marchand', x: 10, z: -2, color: '#a07848' },
      { id: 'garde', name: 'Garde Vhorr', role: 'garde', x: -6, z: 2, color: '#504440' },
    ],
  },

  // ============ SYLPHIDES ============
  {
    id: 'zephyra', name: 'Zephyra', theme: 'coastal', region: 'Falaises-du-Souffle',
    description: 'Village sylphide fait de plateformes flottantes reliées par des ponts de vent. On y accède en lâchant prise.',
    compatibleRaces: ['sylphide'], multicultural: false, capacity: 75,
    spawnPoints: [
      { id: 'Spawn_01', x: -7, z: 10 }, { id: 'Spawn_02', x: 7, z: 10 }, { id: 'Spawn_03', x: 0, z: 13 },
      { id: 'Spawn_04', x: -13, z: 4 }, { id: 'Spawn_05', x: 13, z: 4 }, { id: 'Spawn_06', x: 0, z: -2 },
    ],
    scenery: {
      groundColor: '#8cb8a0', pathColor: '#d8e8e0', treeStyle: 'palm', treeColor: '#58a878',
      houseStyle: 'crystal', houseColor: '#d8e8f0', roofColor: '#a8c8d8',
      skyTop: '#a0d0e8', skyBottom: '#f0f8f8', fogColor: '#d0e8e8', lightColor: '#ffffff', ambientColor: '#a8c8d0',
    },
    props: ['lantern', 'crystal', 'flowers', 'pond'],
    npcs: [
      { id: 'ancien', name: 'Brise-Mère Aura', role: 'ancien', x: 0, z: -6, color: '#c8e0e8' },
      { id: 'marchand', name: 'Vendeuse de Nuages Lumi', role: 'marchand', x: 10, z: -2, color: '#a8d8e0' },
      { id: 'garde', name: 'Sentinelle Zeph', role: 'garde', x: -6, z: 2, color: '#78a8b8' },
    ],
  },
  {
    id: 'aile_du_matin', name: 'Aile-du-Matin', theme: 'plains', region: 'Prairies-d’Aurore',
    description: 'Village sylphide-humain au cœur de prairies à fleurs sonores. Le vent y est récolté comme une récolte.',
    compatibleRaces: ['sylphide', 'humain'], multicultural: true, capacity: 70,
    spawnPoints: [
      { id: 'Spawn_01', x: -7, z: 10 }, { id: 'Spawn_02', x: 7, z: 10 }, { id: 'Spawn_03', x: 0, z: 13 },
      { id: 'Spawn_04', x: -13, z: 4 }, { id: 'Spawn_05', x: 13, z: 4 }, { id: 'Spawn_06', x: 0, z: -2 },
    ],
    scenery: {
      groundColor: '#7ca85a', pathColor: '#d0d8b8', treeStyle: 'oak', treeColor: '#5a8c48',
      houseStyle: 'wood', houseColor: '#e0d8c0', roofColor: '#88b8c8',
      skyTop: '#a8d0e0', skyBottom: '#f8f0e0', fogColor: '#dce8e0', lightColor: '#fff8e8', ambientColor: '#a0b8a8',
    },
    props: ['mill', 'flowers', 'fence', 'well'],
    npcs: [
      { id: 'ancien', name: 'Semeuse Aelis', role: 'ancien', x: 0, z: -6, color: '#c8d8b0' },
      { id: 'marchand', name: 'Meunier Theo', role: 'marchand', x: 10, z: -2, color: '#b8a868' },
      { id: 'garde', name: 'Garde Vent-Verdelet', role: 'garde', x: -6, z: 2, color: '#688068' },
    ],
  },

  // ============ NAINS ============
  {
    id: 'kharzum', name: 'Kharzum', theme: 'mountain', region: 'Barbe-du-Mont',
    description: 'Village nain frontal taillé à même la roche. Les trottoirs sont gravés des noms de tous les ancêtres.',
    compatibleRaces: ['nain'], multicultural: false, capacity: 85,
    spawnPoints: [
      { id: 'Spawn_01', x: -7, z: 10 }, { id: 'Spawn_02', x: 7, z: 10 }, { id: 'Spawn_03', x: 0, z: 13 },
      { id: 'Spawn_04', x: -13, z: 4 }, { id: 'Spawn_05', x: 13, z: 4 }, { id: 'Spawn_06', x: 0, z: -2 },
    ],
    scenery: {
      groundColor: '#8c7c64', pathColor: '#b0a088', treeStyle: 'pine', treeColor: '#3a5038',
      houseStyle: 'stone', houseColor: '#8c8070', roofColor: '#5c4a38',
      skyTop: '#88a0b8', skyBottom: '#d8e0e0', fogColor: '#b0b8b8', lightColor: '#ffe8c0', ambientColor: '#889098',
    },
    props: ['forge', 'cart', 'banner', 'well'],
    npcs: [
      { id: 'ancien', name: 'Thane Durgan', role: 'ancien', x: 0, z: -6, color: '#94846c' },
      { id: 'forgeron', name: 'Maître-forge Borin', role: 'forgeron', x: 10, z: -2, color: '#6b4a2e' },
      { id: 'garde', name: 'Garde Grim', role: 'garde', x: -6, z: 2, color: '#5c5448' },
    ],
  },
  {
    id: 'profonde_griffe', name: 'Profonde-Griffe', theme: 'cavern', region: 'Galerie-de-la-Taupe',
    description: 'Village nain souterrain éclairé de cristaux-résonateurs. Les marteaux y battent la mesure des journées.',
    compatibleRaces: ['nain'], multicultural: false, capacity: 75,
    spawnPoints: [
      { id: 'Spawn_01', x: -7, z: 10 }, { id: 'Spawn_02', x: 7, z: 10 }, { id: 'Spawn_03', x: 0, z: 13 },
      { id: 'Spawn_04', x: -13, z: 4 }, { id: 'Spawn_05', x: 13, z: 4 }, { id: 'Spawn_06', x: 0, z: -2 },
    ],
    scenery: {
      groundColor: '#6b5c4c', pathColor: '#8c7c68', treeStyle: 'crystal', treeColor: '#88b8c8',
      houseStyle: 'troglodyte', houseColor: '#746458', roofColor: '#4c4034',
      skyTop: '#3c3428', skyBottom: '#6b5c4c', fogColor: '#443c30', lightColor: '#ffd8a0', ambientColor: '#584c40',
    },
    props: ['forge', 'crystal', 'barrel', 'cart'],
    npcs: [
      { id: 'ancien', name: 'Ancienne Helga', role: 'ancien', x: 0, z: -6, color: '#94846c' },
      { id: 'forgeron', name: 'Forgeron Ulric', role: 'forgeron', x: 10, z: -2, color: '#6b4a2e' },
      { id: 'garde', name: 'Garde Torvald', role: 'garde', x: -6, z: 2, color: '#544a40' },
    ],
  },
  {
    id: 'fourche_ardee', name: 'Fourche-Ardée', theme: 'mountain', region: 'Confluents-de-Fer',
    description: 'Village nain-humain où trois routes minières se rejoignent. Sa taverne, la Tête-de-Marteau, est célèbre.',
    compatibleRaces: ['nain', 'humain', 'lycan'], multicultural: true, capacity: 80,
    spawnPoints: [
      { id: 'Spawn_01', x: -7, z: 10 }, { id: 'Spawn_02', x: 7, z: 10 }, { id: 'Spawn_03', x: 0, z: 13 },
      { id: 'Spawn_04', x: -13, z: 4 }, { id: 'Spawn_05', x: 13, z: 4 }, { id: 'Spawn_06', x: 0, z: -2 },
    ],
    scenery: {
      groundColor: '#847c64', pathColor: '#a89878', treeStyle: 'pine', treeColor: '#3e5438',
      houseStyle: 'wood', houseColor: '#a08860', roofColor: '#684834',
      skyTop: '#90a4b0', skyBottom: '#dcdcd0', fogColor: '#b8b4a8', lightColor: '#fff0d0', ambientColor: '#8c9088',
    },
    props: ['forge', 'market', 'cart', 'well'],
    npcs: [
      { id: 'ancien', name: 'Bailli Orim', role: 'ancien', x: 0, z: -6, color: '#8c8068' },
      { id: 'marchand', name: 'Tavernière Freya', role: 'marchand', x: 10, z: -2, color: '#a87848' },
      { id: 'garde', name: 'Garde Baldric', role: 'garde', x: -6, z: 2, color: '#58544a' },
    ],
  },

  // ============ ABYSSIENS ============
  {
    id: 'naufrage_lunaire', name: 'Naufrage-Lunaire', theme: 'coastal', region: 'Baie-des-Sirènes-Muètes',
    description: 'Village abyssien construit dans et autour d’un vaisseau-ancien échoué. Les marées y obéissent à d’autres lois.',
    compatibleRaces: ['abyssien'], multicultural: false, capacity: 75,
    spawnPoints: [
      { id: 'Spawn_01', x: -7, z: 10 }, { id: 'Spawn_02', x: 7, z: 10 }, { id: 'Spawn_03', x: 0, z: 13 },
      { id: 'Spawn_04', x: -13, z: 4 }, { id: 'Spawn_05', x: 13, z: 4 }, { id: 'Spawn_06', x: 0, z: -2 },
    ],
    scenery: {
      groundColor: '#5c7a70', pathColor: '#88a89c', treeStyle: 'palm', treeColor: '#3c6b5c',
      houseStyle: 'darkwood', houseColor: '#4c6460', roofColor: '#2c4440',
      skyTop: '#48687c', skyBottom: '#88a8a8', fogColor: '#68787c', lightColor: '#c8f0e0', ambientColor: '#5c7c7c',
    },
    props: ['dock', 'boat', 'lantern', 'rope'],
    npcs: [
      { id: 'ancien', name: 'Profonde-Voix Nereza', role: 'ancien', x: 0, z: -6, color: '#5c847c' },
      { id: 'marchand', name: 'Perleuse Thalassa', role: 'marchand', x: 10, z: -2, color: '#3ca89c' },
      { id: 'garde', name: 'Garde Ulmoss', role: 'garde', x: -6, z: 2, color: '#44605c' },
    ],
  },
  {
    id: 'fosse_echo', name: 'Fosse-Écho', theme: 'cavern', region: 'Sous-Marais-Éternel',
    description: 'Village abyssien de puits et de passerelles suspendues au-dessus d’un gouffre qui répond quand on parle.',
    compatibleRaces: ['abyssien', 'elfe_noir'], multicultural: true, capacity: 70,
    spawnPoints: [
      { id: 'Spawn_01', x: -7, z: 10 }, { id: 'Spawn_02', x: 7, z: 10 }, { id: 'Spawn_03', x: 0, z: 13 },
      { id: 'Spawn_04', x: -13, z: 4 }, { id: 'Spawn_05', x: 13, z: 4 }, { id: 'Spawn_06', x: 0, z: -2 },
    ],
    scenery: {
      groundColor: '#48585c', pathColor: '#68807c', treeStyle: 'mushroom', treeColor: '#48c8b8',
      houseStyle: 'troglodyte', houseColor: '#546460', roofColor: '#2c4440',
      skyTop: '#2c3c40', skyBottom: '#48585c', fogColor: '#344444', lightColor: '#48e8d8', ambientColor: '#44585c',
    },
    props: ['lantern', 'rope', 'crystal', 'pond'],
    npcs: [
      { id: 'ancien', name: 'Écho-Mère Ssila', role: 'ancien', x: 0, z: -6, color: '#68847c' },
      { id: 'marchand', name: 'Fossoyeur des Perles Morv', role: 'marchand', x: 10, z: -2, color: '#3c9c90' },
      { id: 'garde', name: 'Garde Voidreaver', role: 'garde', x: -6, z: 2, color: '#3c5054' },
    ],
  },

  // ============ ASTRÉENS ============
  {
    id: 'astrielle', name: 'Astrielle', theme: 'celestial', region: 'Plateau-des-Fragments',
    description: 'Village astréen bâti autour du cratère de la plus grosse étoile tombée. La nuit, le sol scintille.',
    compatibleRaces: ['astreen'], multicultural: false, capacity: 75,
    spawnPoints: [
      { id: 'Spawn_01', x: -7, z: 10 }, { id: 'Spawn_02', x: 7, z: 10 }, { id: 'Spawn_03', x: 0, z: 13 },
      { id: 'Spawn_04', x: -13, z: 4 }, { id: 'Spawn_05', x: 13, z: 4 }, { id: 'Spawn_06', x: 0, z: -2 },
    ],
    scenery: {
      groundColor: '#7c78a0', pathColor: '#b0a8d0', treeStyle: 'crystal', treeColor: '#b8a8e8',
      houseStyle: 'crystal', houseColor: '#d0c8e8', roofColor: '#8878c8',
      skyTop: '#585088', skyBottom: '#a898c8', fogColor: '#786c98', lightColor: '#e8e0ff', ambientColor: '#8078a8',
    },
    props: ['crystal', 'lantern', 'pond', 'archway'],
    npcs: [
      { id: 'ancien', name: 'Constellation-Mère Selene', role: 'ancien', x: 0, z: -6, color: '#c0b8e0' },
      { id: 'marchand', name: 'Comète Andar', role: 'marchand', x: 10, z: -2, color: '#a898e8' },
      { id: 'garde', name: 'Sentinelle Vega', role: 'garde', x: -6, z: 2, color: '#686098' },
    ],
  },
  {
    id: 'observatoire_perdu', name: 'Observatoire-Perdu', theme: 'celestial', region: 'Rooftops-du-Vide',
    description: 'Village astréen-sylphide perché sur des tours abandonnées. Les savants y écoutent les étoiles mortes.',
    compatibleRaces: ['astreen', 'sylphide'], multicultural: true, capacity: 70,
    spawnPoints: [
      { id: 'Spawn_01', x: -7, z: 10 }, { id: 'Spawn_02', x: 7, z: 10 }, { id: 'Spawn_03', x: 0, z: 13 },
      { id: 'Spawn_04', x: -13, z: 4 }, { id: 'Spawn_05', x: 13, z: 4 }, { id: 'Spawn_06', x: 0, z: -2 },
    ],
    scenery: {
      groundColor: '#6c7890', pathColor: '#a0a8c0', treeStyle: 'crystal', treeColor: '#a8c8e0',
      houseStyle: 'stone', houseColor: '#8890a8', roofColor: '#505888',
      skyTop: '#485888', skyBottom: '#8888b8', fogColor: '#586898', lightColor: '#d8e8ff', ambientColor: '#7078a0',
    },
    props: ['crystal', 'lantern', 'archway'],
    npcs: [
      { id: 'ancien', name: 'Astronome Kalim', role: 'ancien', x: 0, z: -6, color: '#a0a8c8' },
      { id: 'marchand', name: 'Cartographe Oriane', role: 'marchand', x: 10, z: -2, color: '#8898d0' },
      { id: 'garde', name: 'Sentinelle Altair', role: 'garde', x: -6, z: 2, color: '#585880' },
    ],
  },
]

export const VILLAGE_MAP: Record<string, VillageDef> = Object.fromEntries(
  VILLAGES.map((v) => [v.id, v])
)

export function getVillage(id: string): VillageDef | undefined {
  return VILLAGE_MAP[id]
}

export function getVillagesForRace(raceId: string): VillageDef[] {
  return VILLAGES.filter((v) => v.compatibleRaces.includes(raceId as never))
}
