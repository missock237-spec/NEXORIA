# NEXORIA — 10 · Les 10 Suprêmes et leurs territoires (ÉTAPE 13)

> Données : `WorldData/supremes.json` · Météo forcée : `WorldData/weather.json`
> (section `supreme_overrides`) · Exposition des régions : `WorldData/regions.json`.

## Principe de design

Un territoire de Suprême doit être **reconnaissable avant la rencontre** :
le monde se dégrade/mutile progressivement dans un rayon de 1,7–2,9 km
(champ d'exposition linéaire × 2,2 au bord de carte). La corruption agit sur
8 canaux : climat, lumière, végétation, monstres, musique, architecture,
météo, comportement des PNJ. Chaque antre est reliée au donjon le plus proche
(champ `lair_dungeon`).

## Les dix territoires

| ID | Suprême | Élément | Diff. | Antre | Signes avant-coureurs (extrait) |
|---|---|---|---|---|---|
| SUP_01 | **IGNAROTH**, Braises Éternelles | feu | 8 | REGION_212 | arbres calcinés alignés, verres fondus en larmes |
| SUP_02 | **KRYOS**, l'Hiver Sans Fin | glace | 7 | REGION_025 | fleurs de givre géométriques, lacs miroirs |
| SUP_03 | **YGGVARN**, Racine du Monde | sylve | 6 | REGION_063 | arbres fusionnés en arches, routes de racines |
| SUP_04 | **NAKH'THUL**, l'Abysse Éveillé | océan | 9 | REGION_002 | vagues à contre-pente, cloches qui sonnent seules |
| SUP_05 | **AREKH**, Roi des Sables | désert | 8 | REGION_156 | sable en escaliers, heures qui durent des jours |
| SUP_06 | **MORVANE**, Reine des Ombres | ombre | 9 | REGION_113 | ombres pointant le nord, miroirs recouverts |
| SUP_07 | **STRYGOR**, Tempête Vivante | orage | 7 | REGION_239 | arbres foudroyés dressés, air qui craque |
| SUP_08 | **LITHARION**, Dormeur de Pierre | tectonique | 8 | REGION_021 | rivières de biais, menhirs couchés |
| SUP_09 | **VESPERA**, Voix du Vide | vide | 10 | REGION_234 | portails qui s'ouvrent seuls, souvenirs manquants |
| SUP_10 | **AURATHAL**, Jugement Doré | lumière | 10 | REGION_090 | clepsydres inversées, faux soleils à midi |

## Progression de l'exposition (implémentée dans les données)

- `supreme_exposure` ∈ [0, 1] par région (0 au bord ×2,2, 1 au centre).
- Niveau recommandé rehaussé : `+round(exposition × 4)` (plafonné à 10).
- Météo forcée dans le rayon (poids 10 contre poids naturels 0,5–5).
- Familles de monstres remplacées progressivement par la cour du Suprême.

## Direction artistique de la corruption

Chaque territoire a une teinte signature (`corruption_color`) pour le
grading/le brouillard : braises #c2452e, givre #9fd8e8, sylve #2f8f4e,
abysse #1a5f7a, sable #d9a441, ombre #5a4a7a, orage #6f7fd8, minéral
#8a6f52, vide #b08fd8, jugement #e8c85a. La musique bascule vers le
`music_hint` du territoire (données prêtes pour l'audio middleware).

## Indices narrative

30 % des ruines portent un `supreme_hint` : inscriptions, fresques ou
artefacts qui racontent l'ascension du Suprême local. Les Pérégrins
reconstituent ainsi la Grande Ascension morceau par morceau.
