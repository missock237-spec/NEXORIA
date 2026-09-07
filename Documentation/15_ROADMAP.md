# NEXORIA — 15 · Roadmap honnête (généré réellement vs à produire)

> Règle absolue du projet : **ne jamais prétendre avoir créé ce qui ne l'est
> pas.** Ce document fait la part des choses, en date du pipeline v0.9.

## ✅ Réellement généré et vérifiable (WorldData/)

| Élément | Volume | Preuve |
|---|---|---|
| Planète (élévation 2048², tectonique, continents) | 3 continents + 30 îles | `world.json`, `world_map_relief.png` |
| Chaînes de montagnes / volcans | 14 / 6 | `mountains.json`, `volcanoes.json` |
| Hydrologie (D8, incision) | 86 cours d'eau, 5 lacs | `rivers.json`, `lakes.json` |
| Climats & biomes | 20 biomes causaux | `biomes.json` |
| Régions complètes | 256 (189 terrestres) | `regions.json` + JSON par région |
| Terrains 3D 16 m/px | 256 heightmaps PNG16 + RAW16 | `heightmaps/`, coutures validées |
| Érosion | thermique globale + hydraulique (gouttes) | `terrain.py`, `14_VALIDATION_REPORT.md` |
| Végétation | 15 espèces, 189 cartes de densité, spécimens | `vegetation/` |
| Établissements | 128 (4 capitales → hameaux) + trames urbaines | `settlements.json` |
| Routes A* | 75 polylignes + ponts | `routes.json` |
| Civilisations anciennes | 4 complètes (architecture, langue, chute…) | `civilizations.json` |
| Ruines | 49 sites (dont 30 % indices Suprêmes) | `ruins.json` |
| Grottes | 78 graphes 3D (7 types, entrées/branchements/secrets) | `caves.json` |
| Donjons | 30 (salles, puzzles, mini-boss, boss, sorties alt.) | `dungeons.json` |
| Suprêmes | 10 territoires + corruption 8 canaux | `supremes.json` |
| POI & secrets | 170 (45 cachés) | `poi.json` |
| Météo / saisons / jour-nuit | 10 états, 4 saisons, 5 événements | `weather.json` |
| Cartes | 5 PNG 2048 px | `maps/` |
| Meshes d'aperçu | monde + région de départ LOD0/LOD1 (~250 k tris) | `meshes/` |
| Validation | 10 familles de contrôles, autocorrections | `validation_report.json` |
| Runtime Unity (sources) | streaming, LOD, météo, jour/nuit, profils, PNJ | `Game/**/*.cs` |
| Backend | architecture MMO + prototype websocket | `Backend/` |

## ⚠️ Partiel / à produced ensuite (aucune simulaton)

1. **Assets 3D artistiques** : le catalogue définit budgets et nomenclature,
   mais AUCUN modèle/textures/animation n'est créé (hors-scope pipeline ;
   travail d'artistes à brancher sur `assets.json`).
2. **Intégration Unity** : les scripts C# sont fournis en source (non compilés
   ici — Unity n'est pas disponible dans cet environnement). Créer le projet
   Unity 2022.3 LTS + URP, importer `WorldData/`, brancher les scripts (voir
   `Game/README.md`).
3. **Cavernes 3D maillées** : les grottes existent en graphes/nœuds validés ;
   le maillage intérieur procédural (modules CAV_*) reste à implémenter côté
   moteur ou DCC.
4. **PNJ individuels** : routines génériques prêtes ; les archétypes, dialogues
   et schedules par village sont à produire (base de données à remplir).
5. **Serveur MMO de production** : prototype echo seulement ; persistence,
   comptes, combat autoritaire, instancing = chantiers backend dédiés.
6. **Audio** : `music_hint`/ambiances définis en données, aucun fichier audio.
7. **Meshes haute densité toutes régions** : le CLI exporte la région de
   départ (`python3 -m Gen3ia meshes`) ; étendre = boucle sur les régions
   (temps disque Git à arbitrer).

## 🗺️ Ordre recommandé pour la suite

1. Projet Unity + import WorldData + streaming visible en mode Play.
2. Kit d'assets "graybox" (maison, arbre, rocher) conformes au catalogue.
3. Un donjon test maillé depuis son graphe JSON (DUNG_001).
4. Deux Suprêmes entièrement jouables (IGNAROTH + KRYOS) pour valider la
   boucle territoire → antre → boss.
5. Backend : persistance + intérêt par régions.

## Reproduire / étendre

```bash
python3 -m Gen3ia full        # régénère TOUT (déterministe)
python3 -m Gen3ia meshes      # exporte les meshes de la région de départ
python3 -m Gen3ia validate    # 0 erreur = monde publiable
```
Changer `WORLD_SEED` dans `Gen3ia/core.py` produit un monde NOUVEAU mais
structuralement identique (mêmes étapes, mêmes contrôles).
