# NEXORIA — 12 · Pipeline 3D & nomenclature des assets

## 1. Nomenclature (appliquée par Gen3ia, attendue des artistes)

```
Environment/
├── Mountains/   MTN_<Forme>_<Variante>     (MTN_PeakJagged_A)
├── Rocks/       RCK_<Type>_<Taille>        (RCK_Boulder_L)
├── Trees/       TRE_<Essence>_<Taille>     (TRE_Oak_L, TRE_Monument_WorldTree)
├── Vegetation/  VEG_<Type>_<Variante>      (VEG_GrassTuft_A)
├── Buildings/   BLD_<Fonction>             (BLD_Keep_Capital)
├── Ruins/       RUI_<Civilisation>_<Pièce> (RUI_VoalMonolith)
├── Caves/       CAV_<Module>               (CAV_RockWall_Module)
├── Dungeons/    DGN_<Module>               (DGN_Throne_Supreme)
├── Props/       PRP_<Objet>                (PRP_Waystone)
└── VFX/         VFX_<Effet>                (VFX_CorruptionAura)
```

Catalogue complet (48 entrées, LOD, collision, matériaux) :
`WorldData/assets.json` → lisible aussi dans `Documentation/` une fois
`python3 -m Gen3ia docs` exécuté.

## 2. Chaque asset DOIT porter

1. **Modèle** maillé propre (normales douces aux jonctions organiques).
2. **LOD** : LOD0 100 % → LOD1 45 % → LOD2 12 % des triangles + impostor
   au-delà de 300 m (triangles par LOD déjà tabulés dans assets.json).
3. **Collision** : box / capsule / mesh (colonne `collision` du catalogue).
4. **Matériaux** : `M_<Famille>` partagés (atlas de textures par biome).
5. **Métadonnées** : tags (`poi`, `magic`, `civ_XX`, `supreme`, `boss`).

## 3. Schéma LOD des terrains

| LOD | Densité | Usage | Source |
|---|---|---|---|
| LOD0 | 4 m/vert (64²/chunk) | 0–250 m | RAW16 région |
| LOD1 | 8 m/vert (32²/chunk) | 250–800 m | RAW16 région décimé |
| LOD2 | 16 m/vert (16²/chunk) | 800 m+ | RAW16 région décimé |
| Impostor | 1 quad teinté | 800 m+ | chunks.avg (JSON) |

Exports d'aperçu livrés : `WorldData/meshes/world_preview.obj`,
`meshes/starter_lod0/` (cœur 4×4 chunks de la capitale),
`meshes/starter_lod1/` (8×8 chunks). Le runtime reconstruit les meshes
finaux depuis les RAW16 (`Game/World/TerrainChunkBuilder.cs`) — les OBJ
servent d'audit visuel et de référence d'échelle.

## 4. Anti-répétition (règles qualité visuelle)

- Chaque instanciation reçoit un `asset_seed` (déjà généré pour bâtiments,
  POI, spécimens) → variation rotation/échelle/variante déterministe.
- Interdits vérifiés en validation : arbres clonés alignés, terrain plat
  parfait (le détail fBm garantit ≥ 14 m de relief), textures étirées
  (UV planaires monde 0–1 par chunk).
- Les plaines restent *légèrement* imparfaites : l'amplitude du détail est
  pilotée par la pente (14 m en plaine → 134 m en montagne).

## 5. Flux de travail artiste

1. Récupérer les emplacements : `WorldData/settlements.json` (parcelles +
   rotations déjà calculées), `WorldData/poi.json`, `vegetation.json`.
2. Modéliser en suivant la nomenclature + budgets triangles.
3. Re-générer : `python3 -m Gen3ia full` reste déterministe — aucun placement
   ne bouge si la seed ne change pas.
