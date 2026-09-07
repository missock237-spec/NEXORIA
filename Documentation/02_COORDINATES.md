# NEXORIA — 02 · Système de coordonnées mondial

> Référence unique partagée par Gen3ia (Python) et le runtime Unity (C#).
> Toute position du monde doit être retrouvable précisément via ce document.

## 1. Repère monde (WORLD_X, WORLD_Y, WORLD_Z)

| Axe | Direction | Plage |
|---|---|---|
| `WORLD_X` | Est | −32 768 … +32 768 m |
| `WORLD_Y` | Altitude (haut) | −4 096 … +6 144 m (océan ~−3 200, sommets ~+4 600) |
| `WORLD_Z` | Nord | −32 768 … +32 768 m |

- Origine (0, 0, 0) = **centre de la carte monde**, niveau de la mer.
- Unités : mètres. Unities : Unity est direct (X est, Y haut, Z nord) —
  **aucune conversion nécessaire** entre Gen3ia et Unity.

## 2. Conversions

```text
région (gx, gy), grille 16×16 :
  gx = floor((x + 32768) / 4096)      gy = floor((z + 32768) / 4096)
  ID   = REGION_{gy*16 + gx + 1 :03d}   (balayage sud→nord, ouest→est)
  coin SW = (gx*4096 − 32768, gy*4096 − 32768)

chunk (cgx, cgy), grille 256×256 :
  cgx = floor((x + 32768) / 256)      cgy = floor((z + 32768) / 256)
  ID   = CHUNK_{cgx:03d}_{cgy:03d}

pixel carte (rangée 0 = NORD, convention image) à résolution `res` :
  px = (x + 32768) / 65536 * res
  py = (1 − (z + 32768) / 65536) * res
```

## 3. Heightmaps de région

- Fichier : `WorldData/heightmaps/REGION_XXX.png` (PNG 16 bits) et `.raw16`
  (brut little-endian, **Unity → Terrain → Import Raw**, Depth 16, Byte Order
  Windows, Flip vertical OFF).
- Résolution : 256×256 échantillons (16 m/pixel), rangée 0 = nord de la région.
- Décodage : `h = −4096 + v/65535 × 10 240` m (précision ≈ 0,156 m).
- Métadonnées par région : `WorldData/regions/REGION_XXX.json`
  (min/max/moyenne, `chunks.avg/min/max` 16×16 pour le streaming, origine SW).

## 4. Invariants garantis par le pipeline

1. Deux régions voisines produisent des bordures **continues** (détail évalué
   en coordonnées monde + érosion sur grille étendue ; voir 14_VALIDATION_REPORT).
2. `Z` des entités (POI, grottes, donjons, établissements) est **snapé au
   terrain réel** (validation étape 17, re-snap automatique au besoin).
3. La même seed régénère exactement les mêmes coordonnées : un serveur
   autoritaire et les clients partagent la vérité sans diff de version.

## 5. Exemples

```text
Capitale de départ SETT_001  : (x, z) → voir WorldData/settlements.json
Antre d'IGNAROTH (SUP_01)    : REGION_212
Chunk sous (0, 0)            : CHUNK_128_128
Pixel de la carte 2048 de (0,0) : (1024, 1024)
```
