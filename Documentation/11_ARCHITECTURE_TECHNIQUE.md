# NEXORIA — 11 · Architecture technique (streaming MMORPG, PC + Android)

## 1. Vue d'ensemble

```
Gen3ia (hors-ligne, Python)          WorldData/            Runtime Unity (C#)
─────────────────────────────        ─────────────         ───────────────────────
tectonique → biomes → hydro    →     JSON + PNG16/RAW16 →  WorldDatabase (chargement)
régions → terrains → contenu   →     meshes OBJ (aperçu) → TerrainChunkBuilder (meshes)
validation + autocorrection    →     validation_report  →  WorldStreamer (anneau de chunks)
                                                          LODController · WeatherSystem
                                                          DayNightCycle · QualityProfiles
```

Règle d'or : **le joueur ne charge jamais la planète.** Le streaming
travaille par anneau de régions autour du joueur, avec file de priorité
et déchargement automatique.

## 2. Découpage et budgets

| Niveau | Taille | Données | Budget mémoire (LOW → ULTRA) |
|---|---|---|---|
| Monde | 64 km | `world.json` (~50 Ko) | résident |
| Région | 4 km, 256² heightmap | PNG16 ~40–120 Ko + JSON | 1–2 régions décodées |
| Chunk | 256 m, mesh LOD0 64² | ~3–8 k triangles | 12 → 81 chunks actifs |

Profils (voir `WorldData/assets.json → quality_profiles`) :

| Profil | Vue | Chunks actifs | Ombres | Végétation | Cible |
|---|---|---|---|---|---|
| LOW | 768 m | 12 | off | 45 % | Android 30 fps |
| MEDIUM | 1,5 km | 25 | cascade 40 m | 70 % | Android 30 fps |
| HIGH | 3 km | 49 | cascade 80 m | 90 % | PC 60 fps |
| ULTRA | 6 km | 81 | cascades 200 m | 100 % | PC 60 fps |

## 3. Streaming (Game/World/WorldStreamer.cs)

1. Toutes les 0,25 s : calcul de la région/chunks voulus autour du joueur
   (rayon selon profil).
2. File de priorité (distance²), chargement **asynchrone** : lecture RAW16 →
   Texture2D linéaire → `TerrainData` (ou mesh procédural) sur worker.
3. Déchargement au-delà du rayon + pool d'objets (zéro instantiation GC).
4. LOD : LODGroup par chunk (mesh 64² → 32² → impostor colorimétrique),
   culling d'occlusion par cellules de hauteur (chunks.min/max du JSON).
5. Impostors : couleurs moyennes par chunk (déjà dans `chunks.avg`).

## 4. Monde vivant (Game/Systems/)

- `DayNightCycle.cs` : cycle 36 min, aube 6h12 / crépuscule 19h24, teintes
  d'aube, lumière lunaire 0,18, étoiles.
- `WeatherSystem.cs` : machine à états pondérée par biome/saison, transitions
  12 s, overrides Suprêmes (poids 10, sévérité radiale), éclairs d'orage.
- `SeasonSystem.cs` : 4 saisons de 24–26 jours, deltas T°/humidité, ligne de
  neige descendante en hiver (−900 m, événements jusqu'à −1 400 m).
- `NpcDailyRoutine.cs` : horaires (dormir/travailler/marcher/commercer),
  ancrés aux établissements et routes JSON.
- `SpawnDirector.cs` : densités de monstres par biome/niveau + exposition
  Suprême (remplacement progressif des familles).

## 5. Multiplayer (préparation)

- Autorité serveur : positions joueurs + entités dynamiques uniquement ;
  le terrain/décor reste **déterministe par seed** (jamais transmis).
- Intérêt par régions/chunks : un joueur n'abonne que son anneau.
- Voir `Backend/ARCHITECTURE_MMO.md` et le prototype `Backend/server_stub.py`.

## 6. Qualité et CI monde

`python3 -m Gen3ia validate` est conçu pour tourner en CI : 0 erreur =
monde publiable. Toute nouvelle étape de génération doit passer les 10
familles de contrôles (NaN, coutures, inondations, graphes, budgets…).
