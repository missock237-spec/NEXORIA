# DATABASE — Modèle de données

## Moteur

SQLite via Prisma 6 (`prisma/schema.prisma` → `prisma/db/nexoria.db`), partagé entre
l'API Next.js et le serveur de simulation. Migrations : `bun run db:push`
(push schéma) ; migrations versionnées (`prisma migrate dev`) recommandées en
production.

## Modèles du monde persistant (Vertical Slice)

| Modèle | Contenu clé | Notes |
|---|---|---|
| `WorldState` | timeOfDay, dayCount, prosperity, weather, simTicks | Une ligne (`solmere`) |
| `Npc` | identité, famille (JSON), personnalité (JSON), positions, PV, `lifeState`, mémoire (JSON) | Mort définitive |
| `NpcDeath` | npcId, tueur, cause, jour, heure | Journal irréversible |
| `Building` | type, label, position, PV, état, fonction économique | 24 lignes semées |
| `ConstructionProject` | coûts requis, déposé, progression, actif | Upsert (auto-réparation) |
| `WorldEvent` | type, titre, zone, statut, conséquences (JSON) | Invasion… |
| `DungeonState` | porte, boss, mécanismes (JSON), coffres (JSON) | Par donjon |
| `ProvinceState` | position, PV/MP, niveau, XP, or, inventaire (JSON), quêtes, découvertes, morts, kills | Par personnage |

Modèles existants (inchangés) : `Account`, `Session`, `Character`, `ArenaProfile`,
`ArenaMatch`, `SupremeProgress`, `SupremeEncounter`.

## Règles d'accès

- **Le client n'accède JAMAIS à la base.** Tout passe par l'API (auth/arbènes/
  personnages) ou la simulation (socket).
- Les listes sont sérialisées en colonnes JSON stringifiées (contrainte Prisma
  SQLite : pas de listes natives) — documented trade-off.
- Écritures de la simulation : **séquentielles**, flag `dirty` baissé seulement après
  succès, 3 tentatives avec back-off (`writeSafe`) — aucun état critique perdu en
  cas de verrou SQLite.

## Semis déterministe

Au premier démarrage : 16 PNJ, 11 bâtiments + 12 remparts + porte, état de donjon,
WorldState (jour 1, 08:00, prospérité 100). Les démarrages suivants rechargent
l'existant — jamais de doublons (IDs déterministes `npc_xxx`, `forge_solmere`…).

## Limitations

- SQLite : concurrence d'écriture limitée (2 process écrivains : API + simulation).
  PostgreSQL + Redis sont l'évolution naturelle quand la province se multipliera.
- Pas de table `chat_log` (le chat est éphémère) — journalisation future possible.
- `Npc.relationships/family` : les familles sont des listes d'IDs ; un graphe de
  relations riche viendra avec les factions.
