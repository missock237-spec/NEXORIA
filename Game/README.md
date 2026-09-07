# NEXORIA — Game/ (runtime Unity)

Scripts C# du runtime. **Sources fournies, non compilées ici** (Unity absent
de l'environnement de génération) — voir Documentation/15_ROADMAP.md.

## Mise en place

1. Unity **2022.3 LTS** + URP, projet 3D.
2. Package Manager : ajouter **com.unity.nuget.newtonsoft-json** (JSON),
   **AI Navigation** (NavMesh, PNJ).
3. Copier `WorldData/` dans `Assets/StreamingAssets/WorldData/`.
4. Créer une scène vide avec :
   - un GameObject `World` : `WorldDatabase` (order -1000) + `WorldStreamer`
     (assigner Player + TerrainMaterial) ;
   - un GameObject `Sky` : `DayNightCycle` + `WeatherSystem` + `SeasonSystem` ;
   - un GameObject `Quality` : `QualityProfileManager` (lier le streamer) ;
   - une Directional Light (soleil), une seconde (lune, optionnelle) ;
   - un joueur (capsule + contrôleurs).
5. Play : le streamer construit l'anneau de chunks autour du joueur depuis
   les heightmaps RAW16 ; la météo et le jour/nuit démarrent.

## Fichiers

| Fichier | Rôle | Étape |
|---|---|---|
| `World/WorldConstants.cs` | constantes + conversions (miroir exact de Gen3ia/core.py) | 2 |
| `World/WorldDatabase.cs` | chargement JSON + heightmaps + requêtes (exposition Suprême) | 16 |
| `World/TerrainChunkBuilder.cs` | mesh de chunk depuis RAW16 (LOD0/1/2), pooling | 16 |
| `World/WorldStreamer.cs` | anneau de streaming, priorité, déchargement, LOD par distance | 16 |
| `Systems/DayNightCycle.cs` | 36 min = 24 h, aube/crépuscule, lune | 15 |
| `Systems/WeatherSystem.cs` | états pondérés, transitions, éclairs | 15 |
| `Systems/SeasonSystem.cs` | 4 saisons, ligne de neige | 15 |
| `Systems/QualityProfileManager.cs` | LOW/MEDIUM/HIGH/ULTRA + bascule auto mobile | 16 |
| `NPC/NpcDailyRoutine.cs` | dormir/travailler/marcher/commercer (NavMesh) | 15 |
| `Monsters/SpawnDirector.cs` | spawns par biome + corruption Suprême | 15 |

## Prochaines briques runtime

- Pose des props (parcelles des établissements, POI) via `ProceduralGeneration/ChunkDetailScatter.cs`
  + extension bâtiments.
- Intérieur des donjons depuis les graphes `dungeons.json` (modules DGN_*).
- Intérieur des grottes depuis les graphes `caves.json` (modules CAV_*).
