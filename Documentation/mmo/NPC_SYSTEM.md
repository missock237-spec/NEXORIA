# NPC_SYSTEM — PNJ persistants

## Modèle

Chaque PNJ possède (modèle `Npc` + entité runtime `NpcEnt`) :
ID, nom, race, âge, profession, lieu de travail (bâtiment), domicile, famille
(ids), personnalité (brave/bavard/prudent), position + foyer + travail, PV, niveau,
faction, **LIFE_STATE** (`ALIVE | INJURED | DEAD`), mémoire Gen3ia (40 derniers
événements vécus), statut de garde.

Les 16 PNJ de Solmère : forgeron + femme + apprenti (famille), apothicaire, fermier +
fils, capitaine + 2 gardes, aubergiste, maire, marchand, tisserande, gardien et
commerçant de Pierrefont, ermite des ruines.

## Comportement (serveur, 15 Hz)

- **Civils** : routine horloge (travail/pause/maison/sommeil), errance douce autour
  du poste, **fuite** vers le domicile devant un monstre (< 11 m), état `INJURED`
  sous 45 % PV (au sol, convalescence, récupération), deuil (`grief`) 2 jours si un
  proche meurt.
- **Gardes** : patrouille autour du poste, engagement des monstres < 20 m, combat
  (attaque 1,2 s), retour au poste après menace dissipée.
- Les PNJ endormis ou à l'intérieur sont exclus des snapshots (intéressement).

## API socket (intentions client)

| Émission | Effet serveur |
|---|---|
| `interact {kind:'npc', id}` | Dialogue Gen3ia (personnalité + mémoire + contexte) à < 4,5 m |

Aucun client ne peut blesser un PNJ : seuls les monstres (et le monde) le peuvent.
La mort d'habitant est donc toujours une conséquence du monde, jamais d'un cheat.

## Mémoire

`memoryJson` conserve jusqu'à 40 faits vécus (« jour X : attaque près de… »,
« a crié à l'aide… », « a pleuré ses morts »). Ces souvenirs alimentent les dialogues
(les PNJ bavards partagent leur dernier souvenir avec les joueurs proches).

## Limitations

- Pas de déplacements multi-chunks (la province tient en mémoire).
- Les relations/factions sont des données du schéma ; leur simulation fine (guerres de
  factions) viendra avec l'extension du monde.
- Aucun PNJ n'est encore vendeur (l'économie de boutique est à venir).
