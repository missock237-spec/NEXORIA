# BUILDING_SYSTEM — Bâtiments

## Modèle

`Building` (base) + `ConstructionProject` (chantier) + entités runtime `BuildingEnt` /
`ProjectEnt`. Chaque bâtiment est un **vrai objet 3D** composé de murs, toit, porte —
et chaque état est **visible dans le monde** (aucune variable cachée).

11 bâtiments nommés (forge, 3 maisons, auberge, marché, poste de garde, tour de guet,
comptoir, caserne, entrepôt) + 12 remparts + 1 porte de ville. Chacun a : id, type,
label, position, rotation, PV max, fonction économique (`forge`, `marche`, `garde`,
`auberge`, `ferme`, `entrepot`, `logement`, `none`).

## Les 7 états (visibles côté client)

| État | Condition | Rendu 3D |
|---|---|---|
| `INTACT` | PV pleins | Murs + toit + porte complets |
| `DAMAGED` | PV ≤ 66 % | Toit légèrement abîmé (85 %) |
| `HEAVILY_DAMAGED` | PV ≤ 33 % | Toit réduit (55 %), murs abîmés |
| `DESTROYED` | PV = 0 | Murs à 35 %, toit disparu, gravats |
| `RUINS` | 2 min après DESTROYED | Murs à 22 %, cendres (noirci), gravats |
| `RECONSTRUCTION` | Chantier actif | Échafaudage + paliers (voir RECONSTRUCTION_SYSTEM) |
| `RESTORED` | Chantier à 100 % | Intact (teinte neuve) |

## Règles serveur

- Seuls les monstres/raiders (et l'outil GM de test) infligent des dégâts aux
  bâtiments : `damageBuilding(id, dmg, by)` — jamais un client.
- Une destruction a un **coût économique durable** (-8 prospérité si le bâtiment a
  une fonction économique) et est annoncée à tout le monde.
- L'état est persisté à chaque cycle de sauvegarde ; une forge détruite reste
  détruite au redémarrage (testé).

## API socket (intentions client)

| Émission | Validation serveur | Effet |
|---|---|---|
| `deposit {buildingId, material, amount}` | distance ≤ 7 m, inventaire serveur, plafond 50/émission | Dépose bois/pierre/fer sur le chantier |
| `work {buildingId}` | distance ≤ 7 m, cooldown 1 s | +0,9 % de progression (plafonnée au ratio matériaux) |

## Limitations

- Destruction par les joueurs non permise (siège PvP à venir).
- Pas de pièces intérieures interactives (les bâtiments sont des enveloppes).
- Les remparts ne sont pas encore assiégeables par les raiders (cible future).
