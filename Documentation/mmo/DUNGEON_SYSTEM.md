# DUNGEON_SYSTEM — Donjons persistants

## Ruines d'Ombrecime (Vertical Slice)

Donjon intégré au monde : un canyon creusé dans le terrain à l'est de la province,
une porte monumentale, un couloir, trois salles (mécanisme, coffre, arène du boss),
des pierres gravées (lore). Le donjon est **persistant** : le monde enregistre tout.

## État persistant (`DungeonState`)

| Élément | Persistance |
|---|---|
| Porte (120 PV) | `INTACT → DAMAGED (< 60) → DESTROYED` — **détruite pour toujours** |
| Mécanisme `switch_r1` | Une fois activé : actif **pour toujours** (levier baissé, halo doré) |
| Coffre `chest_r2` | Vidé une seule fois : `openedBy` + date consignés |
| Colosse de Pierre (420 PV, lv 8) | Mort pendant 8 min (`bossRespawnAt`), `bossKillCount` conservé |
| Pierres gravées | Découvertes consignées par personnage (+10 XP, une seule fois) |

## Accès au boss

La salle du Colosse n'est ouverte qu'après l'activation du mécanisme (persistant) :
un groupe futur trouvera les ruines déjà ouvertes si un autre joueur les a percées —
le monde garde la trace des exploits comme des destructions.

## Combat du mini-boss (serveur-autoritaire)

- Aggro 14 m, poursuite, attaque lourde (26 dmg base, 2 s), retour au sanctuaire si
  entraîné à > 60 m de son foyer.
- Récompenses serveur : 220 XP, 40-90 or, 3 fer, 5 pierre ; annonce mondiale avec le
  nom du vainqueur et le numéro de victoire (`bossKillCount`).
- Respawn contrôlé après 8 min avec annonce « le Colosse veille à nouveau ».

## Porte destructible

Attaquable (`attack {targetId:'dungeon_door'}`) à ≤ 4,8 m ; dégâts réduits de moitié
(matériau). Son état est diffusé et persiste — les tests T8/T10 valident la
destruction puis la persistance après redémarrage.

## Types de donjons prévus (DUNGEON, CAVE, RUIN, TEMPLE, FORTRESS, UNDERGROUND_CITY,
ANCIENT_LAB, ABYSS, TOWER, SUPREME_DOMAIN) — le gabarit Ombrecime (porte → couloir →
salles → boss) servira de patron générique.

## Limitations

- Un seul donjon livré dans le Vertical Slice.
- Pièges/puzzles non implémentés (mécanisme binaire seulement).
- Pas d'instance séparée : le donjon est partagé (persistent world assumé).
