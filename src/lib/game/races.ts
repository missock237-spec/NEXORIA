// NEXORIA — Les 9 races jouables
// Chaque race définit : morphologie, palettes autorisées, options raciales,
// capacités, lore et villages compatibles. Toutes les combinaisons race × classe sont autorisées.

import type { RaceDef, RaceId } from './types'

export const RACES: Record<RaceId, RaceDef> = {
  humain: {
    id: 'humain',
    name: 'Humain',
    tagline: "Polyvalents et ambitieux, bâtisseurs d'empires",
    description:
      "Les Humains dominent les plaines et les cités-marchandes de NEXORIA. Adaptables et résistants, ils prospèrent dans tous les environnements et excelle dans tous les styles de combat.",
    lore:
      "Nés au cœur de l'Âge des Cendres, les Humains ont reconstruit leurs royaumes sur les ruines des anciens dieux. Leur soif de découverte fit d'eux les cartographes, les diplomates et les mercenaires les plus recherchés du monde. Leurs villages, ouverts à toutes les races, sont souvent les premiers contacts qu'un aventurier a avec la civilisation.",
    statModifiers: { force: 2, agilite: 2, intelligence: 2, vitalite: 2, esprit: 2, chance: 2 },
    abilities: [
      { name: 'Adaptabilité', description: '+5% d’expérience gagnée dans tous les environnements.' },
      { name: "Ambition", description: 'Récupère 10% de vitalité supplémentaire lors d’un repos.' },
    ],
    morphology: {
      heightScale: [0.94, 1.06],
      bulkScale: [0.85, 1.15],
      skinTones: ['#f5d0b0', '#e8b98a', '#d9a06b', '#b97a4e', '#8d5a33', '#6b4226'],
      eyeColors: ['#5b3a1e', '#2e6b3a', '#3a5a8c', '#6b6b6b', '#8c6239', '#4a2c6b'],
      hairColors: ['#2b1d12', '#4a3320', '#7a5230', '#b8863b', '#d8c27a', '#8c1d1d', '#3d3d3d', '#e8e0d0'],
      hairStyles: ['court', 'mi_long', 'long', 'queue', 'chauve', 'chignon'],
      earStyle: 'human',
      tail: false,
    },
    marks: { types: ['aucune', 'cicatrice_joue', 'cicatrice_sourcil', 'tatouage_tribal', 'tatouage_rune'], colors: ['#8c1d1d', '#2b2b2b', '#3d5a3d'] },
    racialOptions: [
      { key: 'heritage', label: 'Héritage culturel', values: ['cites', 'frontiere', 'maritime', 'nomade'], default: 'cites' },
    ],
    compatibleVillages: ['asteria', 'valdorian', 'marnhaven', 'bastion_haut', 'port_neant'],
    difficulty: 'Facile — équilibré dans tous les domaines',
  },

  elfe: {
    id: 'elfe',
    name: 'Elfe',
    tagline: 'Gardiens des forêts anciennes, élégance millénaire',
    description:
      "Graciles et longévifs, les Elfes vivent en harmonie avec les forêts primaires. Leur affinité naturelle avec la magie et leur agilité légendaire en font des archers et des mages redoutables.",
    lore:
      "Les Elfes furent les premiers enfants de la Lune d'Argent. Leurs cités arboricoles, tissées dans les branches des arbres-mères, n'ont jamais connu la chute. Ils considèrent chaque forêt comme un temple et chaque arbre comme un ancêtre. Leurs oreilles effilées captent les murmures du vent, et certains disent qu'ils écoutent encore les chansons de la création.",
    statModifiers: { agilite: 4, intelligence: 4, esprit: 3, force: -1, vitalite: -1 },
    abilities: [
      { name: 'Grâce sylvestre', description: 'Immunisé aux ralentissements de la forêt dense.' },
      { name: 'Vision crépusculaire', description: 'Voyez clairement dans la pénombre des bois anciens.' },
    ],
    morphology: {
      heightScale: [1.0, 1.12],
      bulkScale: [0.75, 0.95],
      skinTones: ['#fbe8d8', '#f0d5b8', '#e3c096', '#d4ad7e'],
      eyeColors: ['#2e8b57', '#3a8c5f', '#5a8ca8', '#8ca85a', '#a89f5a', '#6b4a8c'],
      hairColors: ['#e8dcae', '#d4b86a', '#8c6b3a', '#f0ead0', '#5a4a2e', '#2e4a2e', '#8c1d1d'],
      hairStyles: ['long', 'tres_long', 'queue', 'chignon', 'mi_long'],
      earStyle: 'elfic',
      tail: false,
    },
    marks: { types: ['aucune', 'motif_vignes', 'motif_feuilles', 'motif_lune'], colors: ['#2e8b57', '#8ca85a', '#e8dcae'] },
    racialOptions: [
      { key: 'earShape', label: 'Forme des oreilles', values: ['droite', 'arquee', 'ornee'], default: 'arquee' },
      { key: 'earLength', label: 'Longueur des oreilles', values: ['courte', 'moyenne', 'longue'], default: 'moyenne' },
      { key: 'motif', label: 'Motifs naturels', values: ['aucun', 'vignes', 'feuilles', 'lune'], default: 'aucun' },
    ],
    compatibleVillages: ['sylvarien', 'val_lunaire', 'cerisaie_perdue', 'asteria'],
    difficulty: 'Facile — grâce et magie naturelle',
  },

  elfe_noir: {
    id: 'elfe_noir',
    name: 'Elfe Noir',
    tagline: 'Enfants des abysses violettes, maîtres des ombres',
    description:
      "Descendants des Elfes bannis dans les profondeurs, les Elfes Noirs portent les marques de l'ombre. Leur peau sombre et leurs yeux lustraux témoignent d'un pacte ancien avec les forces souterraines.",
    lore:
      "Lorsque la Première Reine refusa de plier devant les dieux lumineux, son peuple fut précipité dans les Cavernes d'Obsidienne. Mille ans de nuit forgèrent les Elfes Noirs : leur peau absorba les ténèbres, leurs yeux apprirent à voir dans l'impossible. Ils remontèrent enfin, non pas vaincus, mais transformés — élégants, Implacables, fidèles à des serments que personne d'autre ne comprend.",
    statModifiers: { agilite: 3, intelligence: 4, esprit: 3, force: -1, vitalite: -1, chance: 1 },
    abilities: [
      { name: 'Sang d’ombre', description: 'Régénère lentement la vitalité dans l’obscurité totale.' },
      { name: 'Mémoire des serments', description: '+10% de résistance aux effets de contrôle mental.' },
    ],
    morphology: {
      heightScale: [1.0, 1.12],
      bulkScale: [0.75, 0.95],
      skinTones: ['#4a3a5c', '#3a2c4a', '#2c2138', '#5c4a6b', '#6b5a7a', '#241c2e'],
      eyeColors: ['#c832b4', '#e8d040', '#32c8a0', '#e8e8f0', '#c84040', '#8c32e8'],
      hairColors: ['#e8e8f0', '#c8c8d8', '#d8c8e8', '#2c2138', '#8c1d1d', '#4a3a5c'],
      hairStyles: ['long', 'tres_long', 'queue', 'chignon', 'mi_long'],
      earStyle: 'elfic',
      tail: false,
    },
    marks: { types: ['aucune', 'marque_ombre', 'marque_abyssale', 'motif_toile'], colors: ['#c832b4', '#8c32e8', '#32c8a0'] },
    racialOptions: [
      { key: 'earShape', label: 'Forme des oreilles', values: ['droite', 'arquee', 'ornee'], default: 'droite' },
      { key: 'earLength', label: 'Longueur des oreilles', values: ['courte', 'moyenne', 'longue'], default: 'longue' },
      { key: 'shadowMark', label: 'Marques d’ombre', values: ['aucune', 'toile', 'croissant', 'lignes'], default: 'aucune' },
      { key: 'eyeStyle', label: 'Yeux particuliers', values: ['lustraux', 'fente', 'braise'], default: 'lustraux' },
    ],
    compatibleVillages: ['umbrafaille', 'creuset_sombre', 'voile_pourpre', 'port_neant'],
    difficulty: 'Moyen — puissant mais fragile',
  },

  lycan: {
    id: 'lycan',
    name: 'Lycan',
    tagline: 'Fièvre de la meute, cœur des terres sauvages',
    description:
      "Humanoïdes à l'héritage bestial, les Lycans possèdent une force physique brute, des sens aiguisés et une loyauté indéfectible envers leur meute. Leurs griffes et leurs instincts font d'eux des combattants redoutables.",
    lore:
      "On raconte que le Premier Hurlement réveilla les esprits-loups endormis sous les montagnes. Ceux qui entendirent l'appel devinrent les Lycans : à la fois civilisés et sauvages, porteurs d'une rage qu'ils apprivoisent chaque jour. Leurs villages, cachés dans les contrées sauvages, accueillent les âmes égarées qui cherchent une meute. Un Lycan qui vous accorde sa loyauté ne la retirera jamais.",
    statModifiers: { force: 5, vitalite: 4, agilite: 3, intelligence: -2, esprit: -1 },
    abilities: [
      { name: 'Flair bestial', description: 'Détectez les ennemis proches même invisibles.' },
      { name: 'Second souffle', description: 'Une fois par combat, récupérez 20% de vitalité.' },
    ],
    morphology: {
      heightScale: [0.98, 1.1],
      bulkScale: [0.95, 1.25],
      skinTones: ['#a8794f', '#8c6239', '#6b4a2e', '#d4b88a', '#4a3826'],
      eyeColors: ['#d4a017', '#8c1d1d', '#d47a17', '#a8c83a', '#e8b83a', '#6b8c3a'],
      hairColors: ['#5a4630', '#3a2c1e', '#8c7355', '#d4b88a', '#2c2c2c', '#a89f8a'],
      hairStyles: ['sauvage', 'court', 'mi_long', 'chauve', 'queue'],
      earStyle: 'animal',
      tail: true,
    },
    marks: { types: ['aucune', 'cicatrice_griffe', 'motif_fourrure', 'motif_meute'], colors: ['#3a2c1e', '#8c1d1d', '#2c2c2c'] },
    racialOptions: [
      { key: 'earShape', label: 'Oreilles animales', values: ['loup', 'renard'], default: 'loup' },
      { key: 'muzzleSize', label: 'Forme du museau', values: ['discret', 'moyen', 'marque'], default: 'moyen' },
      { key: 'fangs', label: 'Crocs', values: ['discrets', 'visibles', 'imposants'], default: 'visibles' },
      { key: 'furPattern', label: 'Motifs de fourrure', values: ['unie', 'rayee', 'tachetee'], default: 'unie' },
      { key: 'eyeStyle', label: 'Yeux bestiaux', values: ['ambers', 'predator', 'lune'], default: 'ambers' },
    ],
    compatibleVillages: ['meute_du_cendre', 'val_orage', 'pierres_hurlantes'],
    difficulty: 'Moyen — force brute et instincts',
  },

  drakeen: {
    id: 'drakeen',
    name: 'Drakéen',
    tagline: 'Sang de dragon, fierté éternelle des anciens serpents ailés',
    description:
      "Porteurs du sang des anciens Dragons, les Drakéens arborent des cornes, des écailles et des pupilles fendues. Leur affinité avec le souffle élémentaire et leur endurance reptilienne en font des guerriers d'exception.",
    lore:
      "Les Drakéens descendent des pactes que les anciens rois conclurent avec les Dragons-couronnes pour repousser l'Invasion du Vide. Le sang des titans coule encore dans leurs veines : quand ils s'emportent, des vapeurs élémentaires s'échappent de leurs crocs. Leurs cités creusées dans les falaises abritent les mémoires gravées de leurs ancêtres ailés — chaque écaille est considérée comme un page d'histoire.",
    statModifiers: { force: 4, vitalite: 4, esprit: 2, agilite: -1, chance: -1 },
    abilities: [
      { name: 'Sang de dragon', description: 'Réduction permanente de 10% des dégâts reçus.' },
      { name: 'Souffle ancestral', description: 'Attaque élémentaire spéciale selon votre lignée.' },
    ],
    morphology: {
      heightScale: [1.0, 1.12],
      bulkScale: [0.9, 1.2],
      skinTones: ['#8c7355', '#a8926b', '#6b8c5a', '#5a6b8c', '#8c5a4a', '#3d4a5c'],
      eyeColors: ['#d4a017', '#c84040', '#d47a17', '#32c8a0', '#e8e8f0'],
      hairColors: ['#2c2c2c', '#3d3d3d', '#5a4630', '#8c1d1d', '#5a4630'],
      hairStyles: ['chauve', 'cristale', 'crete', 'court', 'sauvage'],
      earStyle: 'none',
      tail: true,
    },
    marks: { types: ['aucune', 'motif_ecailles', 'motif_draconique', 'motif_serment'], colors: ['#d4a017', '#c84040', '#32c8a0'] },
    racialOptions: [
      { key: 'hornShape', label: 'Forme des cornes', values: ['droites', 'curbees', 'couronnees'], default: 'curbees' },
      { key: 'hornColor', label: 'Couleur des cornes', values: ['#3d3d3d', '#d4a017', '#8c1d1d', '#e8e0d0'], default: '#3d3d3d' },
      { key: 'scaleColor', label: 'Couleur des écailles', values: ['#c84040', '#d4a017', '#32a08c', '#5a6b8c', '#3d5a3d'], default: '#c84040' },
      { key: 'scaleDensity', label: 'Densité des écailles', values: ['legere', 'moyenne', 'lourde'], default: 'moyenne' },
      { key: 'pupil', label: 'Pupilles', values: ['fente', 'rond', 'lueur'], default: 'fente' },
      { key: 'lineage', label: 'Lignée draconique', values: ['braise', 'orage', 'geode', 'marais'], default: 'braise' },
    ],
    compatibleVillages: ['drakmor', 'ailes_de_pierre', 'sanctuaire_cendre'],
    difficulty: 'Facile — endurance et puissance',
  },

  sylphide: {
    id: 'sylphide',
    name: 'Sylphide',
    tagline: 'Nées du vent d’aurore, esprits de l’air incarnés',
    description:
      "Esprits du vent ayant revêtu une forme corporelle, les Sylphides flottent presque littéralement au-dessus du sol. Légères et insaisissables, elles canalisent les courants aériens et brisent les assauts lourds.",
    lore:
      "Quand le premier rayon d'aurore traversa la Brume Primordiale, il électrisa l'air en le traversant : de cette fusion naquirent les Sylphides. Elles ne respirent pas — elles glissent au fil des courants. Leurs motifs lumineux pulsent au rythme des tempêtes lointaines, et les marins disent qu'une Sylphide sur le pont garantit un vent favorable... ou une tempête, si on l'offense.",
    statModifiers: { agilite: 5, esprit: 4, intelligence: 2, force: -3, vitalite: -2 },
    abilities: [
      { name: 'Légèreté d’aurore', description: 'Vitesse de déplacement +10%, pas de dégâts de chute.' },
      { name: 'Danse des courants', description: 'Esquive supplémentaire contre les attaques lourdes.' },
    ],
    morphology: {
      heightScale: [0.9, 1.02],
      bulkScale: [0.7, 0.88],
      skinTones: ['#f5f0fa', '#e8e0f0', '#d8e8f0', '#f0e8dc', '#dce8e0'],
      eyeColors: ['#a8d8e8', '#8ca8e8', '#c8a8e8', '#a8e8d8', '#e8d8a8'],
      hairColors: ['#e8f0f8', '#d8e8f0', '#c8d8e8', '#f0f8e8', '#e8d8f0', '#b8e8e0'],
      hairStyles: ['flottant', 'long', 'queue', 'chignon', 'mi_long'],
      earStyle: 'fin',
      tail: false,
    },
    marks: { types: ['aucune', 'motif_zephyr', 'motif_eclair', 'motif_aurore'], colors: ['#a8d8e8', '#c8a8e8', '#a8e8d8'] },
    racialOptions: [
      { key: 'glowPattern', label: 'Motifs lumineux', values: ['aucun', 'spirales', 'runes', 'plumes'], default: 'spirales' },
      { key: 'glowColor', label: 'Couleur lumineuse', values: ['#a8d8e8', '#c8a8e8', '#a8e8d8', '#e8d8a8'], default: '#a8d8e8' },
      { key: 'earVariation', label: 'Variation d’oreilles', values: ['aile', 'plume', 'vapeur'], default: 'aile' },
      { key: 'aura', label: 'Effets d’air', values: ['nul', 'leger', 'tourbillon'], default: 'leger' },
    ],
    compatibleVillages: ['zephyra', 'aile_du_matin', 'asteria'],
    difficulty: 'Difficile — fragile mais insaisissable',
  },

  nain: {
    id: 'nain',
    name: 'Nain',
    tagline: 'Pierre de la montagne, cœur de la forge',
    description:
      "Trapus et coriaces, les Nains sont nés sous les montagnes de NEXORIA. Mineurs, forgerons et guerriers d'élite, leur vitalité légendaire et leur maîtrise de la pierre font d'eux des alliés inébranlables.",
    lore:
      "Les Nains furent sculptés — non pas nés — par la Main-qui-frappe dans les veines d'or des Montagnes-au-Cœur-Profond. Chaque barbe est un registre d'honneur : une tresse par serment tenu, une perle par bataille survécue. Ils disent que la pierre se souvient, et qu'un Nain qui tient un mur tient le monde entier.",
    statModifiers: { force: 4, vitalite: 5, esprit: 2, agilite: -3, chance: 1 },
    abilities: [
      { name: 'Cœur de pierre', description: 'Immunisé aux effets de recul et de projection.' },
      { name: 'Mémoire de la forge', description: '+25% de vitesse de réparation et de minage.' },
    ],
    morphology: {
      heightScale: [0.78, 0.88],
      bulkScale: [1.1, 1.4],
      skinTones: ['#e8b98a', '#d9a06b', '#b97a4e', '#8d5a33', '#f0cfa8'],
      eyeColors: ['#5b3a1e', '#2e6b3a', '#3a5a8c', '#6b6b6b', '#4a2c6b'],
      hairColors: ['#8c4a1d', '#4a3320', '#b8863b', '#d8c27a', '#e8e0d0', '#3d3d3d', '#8c1d1d'],
      hairStyles: ['chauve', 'court', 'tresses', 'crete', 'mi_long'],
      earStyle: 'human',
      tail: false,
    },
    marks: { types: ['aucune', 'cicatrice_forge', 'tatouage_runique', 'marque_clan'], colors: ['#8c1d1d', '#2b2b2b', '#d4a017'] },
    racialOptions: [
      { key: 'beard', label: 'Barbe', values: ['aucune', 'bouc', 'courte', 'longue', 'tressee'], default: 'courte' },
      { key: 'mustache', label: 'Moustache', values: ['aucune', 'epaisse', 'fourchue'], default: 'epaisse' },
      { key: 'beardOrnament', label: 'Ornement de barbe', values: ['aucun', 'anneau', 'perles'], default: 'aucun' },
    ],
    compatibleVillages: ['kharzum', 'profonde_griffe', 'fourche_ardee', 'bastion_haut'],
    difficulty: 'Facile — résistant et fiable',
  },

  abyssien: {
    id: 'abyssien',
    name: 'Abyssien',
    tagline: 'Héritiers des profondeurs muettes, entre chair et mystère',
    description:
      "Marqués par les Abysses sous-marines, les Abyssiens possèdent des caractéristiques surnaturelles : marques phosphorescentes, yeux abyssaux et affinité avec les courants profonds. Leur présence trouble les vivants.",
    lore:
      "Personne ne sait quand les premiers Abyssiens remontèrent des Fosses-Sans-Lumière. Leurs marques lumineuses — personne ne sait si ce sont des blessures, des écritures ou des choses vivantes — pulsent dans l'obscurité comme des constellations noyées. Ils parlent peu. Ils observent beaucoup. Et lorsqu'un Abyssien décide de se battre à vos côtés, les ombres elles-mêmes semblent reculer d'un pas.",
    statModifiers: { esprit: 5, intelligence: 3, vitalite: 2, force: -1, chance: -2 },
    abilities: [
      { name: 'Souffle des profondeurs', description: 'Respiration aquatique illimitée, nage rapide.' },
      { name: 'Marques abyssales', description: 'Vos ennemis proches perdent 10% de précision.' },
    ],
    morphology: {
      heightScale: [0.94, 1.08],
      bulkScale: [0.8, 1.05],
      skinTones: ['#3a4a5c', '#2c3a4a', '#4a5a6b', '#243040', '#5c6b7a', '#1c242e'],
      eyeColors: ['#32e8d8', '#32c8a0', '#8c32e8', '#e8e8f0', '#c8e832'],
      hairColors: ['#1c242e', '#2c3a4a', '#4a5a6b', '#32c8a0', '#8c32e8', '#e8e8f0'],
      hairStyles: ['flottant', 'long', 'chauve', 'mi_long', 'tresses'],
      earStyle: 'fin',
      tail: false,
    },
    marks: { types: ['aucune', 'marque_abyssale', 'motif_tentacule', 'motif_vortex'], colors: ['#32e8d8', '#32c8a0', '#8c32e8'] },
    racialOptions: [
      { key: 'abyssMark', label: 'Marques abyssales', values: ['aucune', 'runes', 'tentacules', 'vortex'], default: 'runes' },
      { key: 'markColor', label: 'Couleur des marques', values: ['#32e8d8', '#32c8a0', '#8c32e8', '#c8e832'], default: '#32e8d8' },
      { key: 'eyeGlow', label: 'Yeux particuliers', values: ['phosphore', 'fente', 'double_pupille'], default: 'phosphore' },
      { key: 'fins', label: 'Détails surnaturels', values: ['aucun', 'ouies', 'cretes'], default: 'ouies' },
    ],
    compatibleVillages: ['naufrage_lunaire', 'fosse_echo', 'port_neant'],
    difficulty: 'Difficile — mystérieux et puissant',
  },

  astreen: {
    id: 'astreen',
    name: 'Astréen',
    tagline: 'Fragment d’étoile tombé du firmament, élu des constellations',
    description:
      "Nés d'une pluie d'étoiles il y a mille ans, les Astréens portent des marques astrales lumineuses et des yeux constellationnés. Ils canalisent l'énergie du firmament et voient ce que les mortels ne peuvent qu'imaginer.",
    lore:
      "La Nuit-des-Mille-Chutes vit le firmament se briser et mille fragments d'étoiles tomber sur NEXORIA. Là où chaque fragment s'éteignit, un Astréen se leva — sans parents, sans passé, porteurs de marques célestes qui dessinent des constellations inconnues. Les sages débattent : sont-ils des messagers, des rescapés, ou les graines d'un nouveau ciel ? Les Astréens, eux, regardent les étoiles et sentent qu'ils leur manquent.",
    statModifiers: { intelligence: 5, esprit: 4, chance: 3, force: -2, vitalite: -2 },
    abilities: [
      { name: 'Bénédiction astrale', description: 'Chance critique +10% sous le ciel ouvert.' },
      { name: 'Lueur du firmament', description: 'Éclaire passivement les zones sombres autour de vous.' },
    ],
    morphology: {
      heightScale: [0.96, 1.08],
      bulkScale: [0.78, 1.0],
      skinTones: ['#e8e4f5', '#d8d4ee', '#c8c4e0', '#f0ecf8', '#b8b4d8'],
      eyeColors: ['#e8d040', '#40d0e8', '#c840e8', '#e8e8f0', '#40e878'],
      hairColors: ['#e8e8f8', '#d8d8f0', '#c8b8e8', '#e8d8b8', '#b8d8f0', '#f0f0f8'],
      hairStyles: ['flottant', 'long', 'queue', 'chignon', 'mi_long'],
      earStyle: 'elfic',
      tail: false,
    },
    marks: { types: ['aucune', 'marque_constellation', 'marque_comete', 'marque_orbe'], colors: ['#e8d040', '#40d0e8', '#c840e8'] },
    racialOptions: [
      { key: 'astralMark', label: 'Marques astrales', values: ['aucune', 'constellation', 'comete', 'halo'], default: 'constellation' },
      { key: 'markColor', label: 'Couleur des marques', values: ['#e8d040', '#40d0e8', '#c840e8', '#e8e8f0'], default: '#e8d040' },
      { key: 'eyeGlow', label: 'Yeux lumineux', values: ['astre', 'nebuleuse', 'eclipse'], default: 'astre' },
      { key: 'halo', label: 'Détails célestes', values: ['aucun', 'orbe', 'couronne'], default: 'aucun' },
    ],
    compatibleVillages: ['astrielle', 'observatoire_perdu', 'asteria'],
    difficulty: 'Moyen — magie pure et fragilité',
  },
}

export const RACE_LIST: RaceDef[] = Object.values(RACES)

export function getRace(id: string): RaceDef | undefined {
  return RACES[id as RaceId]
}
