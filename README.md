# NEXORIA — Monde ouvert 3D anime-fantasy (MMORPG / Action-RPG)

> Planète procédurale déterministe de 64 km × 64 km, construite par étages :
> tectonique → continents → climats → biomes → hydrologie → régions → terrains 3D
> → végétation → civilisations → ruines → grottes → donjons → **10 Suprêmes**.

![Carte du monde](WorldData/maps/world_map.png)


## MONDE PERSISTANT MULTIJOUEUR — Vertical Slice « Province de Solmère » ✅

Un monde 3D **réellement multijoueur et persistant** est jouable de bout en bout :
serveur de simulation autoritaire (15 Hz), 16 PNJ à **mort définitive**, bâtiments
destructibles/reconstructibles (7 états visibles), événements mondiaux (invasions),
donjon persistant, agents **Gen3ia**, contrôles PC + Android paysage.

```bash
# Serveur de simulation du monde (port 3003) :
cd mini-services/world-sim && bun run dev
# Tests complets du monde (51 assertions) :
bun scripts/test_world_sim.mjs
```

Parcours : connexion → personnage → village → « ⚔ Province de Solmère ».
Documentation complète : `Documentation/mmo/` (ARCHITECTURE, WORLD_SYSTEM,
NPC_SYSTEM, PERMADEATH_SYSTEM, BUILDING_SYSTEM, DESTRUCTION_SYSTEM,
RECONSTRUCTION_SYSTEM, DUNGEON_SYSTEM, MULTIPLAYER, ANDROID, GEN3IA_INTEGRATION,
DATABASE, ASSET_PIPELINE, OPTIMIZATION, TESTING, REALISATION_VERTICAL_SLICE).

---

## Démarrage rapide

```bash
# Tout générer (≈ 3-6 min) :
python3 -m Gen3ia full

# Ou étage par étage :
python3 -m Gen3ia world        # planète, tectonique, continents, montagnes
python3 -m Gen3ia hydro        # fleuves, rivières, lacs, incision
python3 -m Gen3ia climate      # température, humidité, biomes
python3 -m Gen3ia regions      # 256 régions + bases de données
python3 -m Gen3ia terrain      # heightmaps 3D + érosion par région
python3 -m Gen3ia vegetation   # forêts et végétation
python3 -m Gen3ia settlements  # villages, villes, routes (A*)
python3 -m Gen3ia mysteries    # ruines, grottes, donjons
python3 -m Gen3ia supremes     # territoires des 10 Suprêmes
python3 -m Gen3ia poi          # points d'intérêt et secrets
python3 -m Gen3ia weather      # météo, saisons, cycle jour/nuit
python3 -m Gen3ia maps         # cartes PNG (biomes, relief, politique...)
python3 -m Gen3ia meshes       # meshes OBJ (région de départ, 3 LOD)
python3 -m Gen3ia validate     # validation automatique + autocorrection
python3 -m Gen3ia docs         # documentation complète générée
```

## Structure

```
NEXORIA/
├── Gen3ia/               ← moteur de génération procédurale (Python/NumPy)
├── Game/                 ← runtime Unity C# (streaming, LOD, météo, jour/nuit)
├── ProceduralGeneration/ ← composants procéduraux runtime Unity
├── Backend/              ← architecture serveur MMO + prototype
├── WorldData/            ← LE MONDE GÉNÉRÉ (JSON, PNG16, RAW, OBJ, cartes)
├── Documentation/        ← bases de données du monde (générées) + architecture
└── Tools/                ← utilitaires
```

## Caractéristiques techniques

| Élément | Valeur |
|---|---|
| Seed mondiale | `0x4E455852` ("NEXR" en ASCII) — génération 100 % déterministe |
| Étendue jouable | 65 536 m × 65 536 m (Océan Primordial en bordure) |
| Régions | 256 (grille 16×16 de 4 096 m) |
| Chunks | 65 536 (grille 256×256 de 256 m) — streaming par proximité |
| Heightmaps | PNG 16 bits + RAW Unity (Unity Import Raw compatible) |
| Coordinate system | X=Est, Y=Altitude, Z=Nord, origine au centre, unités mètres |
| Cibles | PC + Android (profils LOW/MEDIUM/HIGH/ULTRA) |

## Documentation

Voir `Documentation/` : vision du monde, carte, coordonnées, bases de données
(régions, biomes, POI, donjons, grottes, montagnes, ruines), architecture
technique, pipeline 3D, roadmap honnête de ce qui est généré vs à produire.
