# RECONSTRUCTION_SYSTEM — Reconstruction

## Principe

La reconstruction est un **projet serveur** (`ConstructionProject`) avec matériaux
réels déposés par les joueurs, une progression visible en 3D et un résultat permanent
(`RESTORED`). Elle peut être menée par les joueurs seuls, par les PNJ bâtisseurs, ou
par les deux — exactement comme la charte le demande.

## Coûts par type (RECONSTRUCTION_COSTS)

| Type | Bois | Pierre | Fer |
|---|---|---|---|
| forge | 40 | 25 | 10 |
| maison | 30 | 15 | 4 |
| auberge | 45 | 25 | 6 |
| marche | 25 | 10 | 2 |
| garde / caserne | 20-25 | 30-40 | 8-12 |
| tour | 15 | 50 | 10 |
| comptoir / entrepot | 40-50 | 20-30 | 6-8 |
| mur | 5 | 35 | 2 |

## Progression visible en 3D (paliers)

| Progression | Rendu |
|---|---|
| 0-24 % | Fondations (dalle + 4 poteaux d'échafaudage) |
| 25-49 % | Murs bas (40-60 % de hauteur) |
| 50-74 % | Murs complets + poutres maîtresses |
| 75-99 % | Structure + toit en cours |
| 100 % | `RESTORED` — bâtiment neuf, PV plein, prospérité +4 |

## Moteurs de progression

1. **Dépôt de matériaux** (joueurs) : `progress = dépose/total requis × 100`
   (plafonnée à 99 % — il faut travailler pour finir).
2. **Coup de main joueur** : `work` à ≤ 7 m → +0,9 %/coup (cooldown 1 s), plafonnée
   au ratio de matériaux déposés (on ne construit pas sans matériaux).
3. **Bâtisseurs PNJ** : +0,22 %/s en continu si un forgeron ou un apprenti est vivant.
   → Si Bruno ET Luka meurent, la forge détruite ne sera reconstruite que par les
   joueurs : la conséquence de la mort définitive se lit dans l'économie.

## Flux complet

```
DESTROYED/RUINS → joueur dépose du bois → projet créé (upsert) → RECONSTRUCTION
   → dépôts + coups de main (+ bâtisseurs PNJ) → 100 % → RESTORED (persistant)
```

## API socket

- `deposit {buildingId, material, amount}` — matériaux depuis l'inventaire serveur.
- `work {buildingId}` — coup de main.
- Diffusions : `project_update {id, progress, deposited, required, state}`.

## Test de référence

T6 : dépôts exacts → 99 % → 2 coups de main → RESTORED ; T10 : RESTORED conservé
après redémarrage.

## Limitations

- Pas de file de tâches PNJ visible (les bâtisseurs ne se déplacent pas encore au
  chantier — leur contribution est économique).
- Les matériaux viennent du butin monstre et des coffres (pas de récolte fine).
