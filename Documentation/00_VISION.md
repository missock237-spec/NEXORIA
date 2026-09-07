# NEXORIA — 00 · Vision globale du monde (ÉTAPE 1)

> Document fondateur. Décisions de conception verrouillées à l'étape 1 et
> respectées par tous les générateurs Gen3ia.

## 1. Le monde en une phrase

NEXORIA est une planète-monde de 64 km × 64 km connus, entourée par **l'Océan
Primordial**, où dix entités ascendées — **les Suprêmes** — se disputent les
ruines d'un empire disparu, sur une direction artistique **anime-fantasy 3D**
à silhouettes fortes et couleurs saturées mais crédibles.

## 2. Principes géographiques (inspirés de la Terre, jamais copiés)

La géographie suit les grands principes planétaires réels, avec des formes,
des noms et une histoire 100 % fictionnels :

- **Tectonique simulée** : 9 plaques dérivantes (champs de Voronoï + vecteurs)
  produisent des ceintures de collision (montagnes), des rifts et des
  frontières transformantes. Les 14 grandes chaînes en héritent leur
  identité visuelle propre.
- **Bandes de latitude** : le monde s'étend de −60° (sud tempéré-chaud) à
  +70° (nord polaire). Inlandsis au nord, jungle à l'équateur sud, déserts
  dans les ceintures subtropicales — comme sur notre planète.
- **Hydrologie descendance** : chaque fleuve naît d'un point haut, collecte
  un bassin versant (accumulation D8) et meurt dans la mer ou un lac. Les
  lacs occupent les cuvettes terminales à fort débit.
- **Climats causaux** : température = latitude − gradient d'altitude ;
  humidité = distance à l'eau − ombre pluviométrique (vents d'ouest). Les
  déserts apparaissent *derrière* les montagnes, les forêts au vent.
- **Le monde semble avoir 10 000 ans** : quatre civilisations anciennes ont
  laissé des ruines à leurs architectures distinctes ; l'érosion a creusé
  les vallées ; les routes contournent les reliefs ; les capitales sont
  nées là où l'eau et les plaines se rencontrent.

## 3. La Grande Ascension (lore central)

Il y a 1 900 ans, l'Empire d'Aetheris — maître de la lévitation et des
Douze Lumières — tenta l'Ascension collective. L'expérience échoua à moitié :
douze devinrent deux, puis dix **Suprêmes** (la légende se dispute les
manquants), et l'empire s'évanouit en une nuit. Depuis, chaque Suprême
règne sur un territoire qui lui ressemble : le paysage *est* sa biographie.
Le joueur est un **Pérégrin** — assez étranger au monde pour que les dix
territories ne l'aient pas encore revendiqué.

## 4. Les 10 Suprêmes

| ID | Nom | Élément | Difficulté | Territoire reconnaissable par |
|---|---|---|---|---|
| SUP_01 | IGNAROTH | feu | 8 | cendres, lave, fanatisme du feu |
| SUP_02 | KRYOS | glace | 7 | hiver permanent, villages murés |
| SUP_03 | YGGVARN | sylve | 6 | jungle-cathédrale, spores-mémoire |
| SUP_04 | NAKH'THUL | océan | 9 | tempêtes cycloniques, ports en quarantaine |
| SUP_05 | AREKH | désert | 8 | sable en escaliers, cour momifiée |
| SUP_06 | MORVANE | ombre | 9 | nuit prolongée, ombres détachées |
| SUP_07 | STRYGOR | orage | 7 | éclairs permanents, tours-paratonnerres |
| SUP_08 | LITHARION | tectonique | 8 | séismes lents, rivières de biais |
| SUP_09 | VESPERA | vide | 10 | zones d'absence, souvenirs manquants |
| SUP_10 | AURATHAL | lumière | 10 | faux soleils, tribunaux de village |

Règle de design : **le territoire raconte le boss avant le boss.** La
corruption est progressive (rayon × 2,2), visible sur la carte, dans la
météo, la faune, la musique et le comportement des PNJ.

## 5. Les 4 civilisations anciennes

1. **Empire d'Aetheris** — pierre blanche, arches flottantes, chute : la
   Grande Ascension. Leurs ruines cachent les indices sur les Suprêmes.
2. **Clans de Kharn-Dhur** — forteresses troglodytes, vapeur alchimique,
   chute : l'Éboulement Sans Fin (ils ont creusé trop profond).
3. **Confrérie du Serpent (Ssil-Vareth)** — pyramides de jade noyées de
   jungle, chute : la Grande Muée.
4. **Les Voilés (Orden Voal)** — monolithes d'obsidienne, portails du vide,
   chute : aucune — ils ont simplement *cessé d'avoir existé*.

## 6. Décisions techniques fondatrices

| Décision | Choix | Justification |
|---|---|---|
| Déterminisme | Seed unique `0x4E455852` ("NEXR"), hiérarchie de seeds par sous-système | même monde régénéré à l'identique, serveur et client |
| Échelle | 65 536 m, 256 régions de 4 096 m, 65 536 chunks de 256 m | streaming MMORPG, budgets mémoire Android |
| Hauteurs | encodage 16 bits : −4 096 → +6 144 m (pas ≈ 0,156 m) | PNG16/RAW16 natifs Unity |
| Continuité | détail fBm évalué en coordonnées monde + érosion sur grille étendue | zéro couture entre régions |
| Densité de contenu | plusieurs niveaux (biome → région → POI) | pas de remplissage artificiel uniforme |
| Cible | PC + Android, profils LOW/MEDIUM/HIGH/ULTRA | cohérence visuelle maintenue en LOW |

## 7. Ce que "monde vivant" signifie ici

La météo a des poids par biome et par saison ; le cycle jour/nuit dure
36 minutes réelles ; cinq événements du monde (Marée Abyssale, Caravane
Dorée, Éboulement Sans Fin, Passage du Jugement, Souffle de KRYOS) font
évoluer zones, prix et donjons. Les PNJ ont des routines (dormir, travailler,
voyager, commercer) pilotées par `Game/NPC/NpcDailyRoutine.cs` et les
données d'établissements.

## 8. Honnêteté du document

Tout ce qui est décrit ci-dessus est **réellement généré** dans `WorldData/`
(vérifiable : `python3 -m Gen3ia validate`). Ce qui ne l'est PAS encore est
listé sans détour dans `15_ROADMAP.md` : assets 3D artistiques (modèles,
textures), intégration Unity compilée, serveur MMO de production.
