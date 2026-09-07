# ARCHITECTURE — NEXORIA MMO (Vertical Slice « Province de Solmère »)

## Vue d'ensemble

NEXORIA est un MMORPG/action-RPG 3D multijoueur persistant. Le Vertical Slice livre une
province jouable de bout en bout : client 3D web, serveur de simulation autoritaire,
persistance SQLite, agents Gen3ia, contrôles PC + Android paysage.

```
JOUEUR PC / ANDROID (navigateur)
        │  HTTPS + WebSocket (socket.io)
        ▼
CADDY (passerelle :81, XTransformPort)
        │                                    ┌────────────────────────────┐
        ├── :3000  Next.js 16 (client 3D     │  AUTH / PERSONNAGES /      │
        │           R3F + API REST)          │  ARÈNES / SUPRÊMES (API)   │
        └── :3003  world-sim (bun +          └────────────────────────────┘
                    socket.io) — AUTORITÉ            │ Prisma
                        │                            ▼
                        ▼                        SQLite (nexoria.db)
                 SIMULATION DU MONDE 15 Hz       (fichier unique, partagé)
                 (PNJ, monstres, bâtiments,
                  événements, donjon, Gen3ia)
```

## Composants

| Composant | Chemin | Rôle |
|---|---|---|
| Client 3D province | `src/components/three/province/` | Rendu R3F, prédiction, caméra, entités |
| HUD province | `src/components/screens/ProvinceScreen.tsx` | PV/MP, minimap, chat, quêtes, actions |
| Couche réseau client | `src/lib/game/province/network.ts` | socket.io, interpolation, réconciliation |
| Données partagées | `src/lib/game/province/world-data.ts` | Source unique géographie + règles |
| Serveur de simulation | `mini-services/world-sim/` | Boucle 15 Hz, autorité totale |
| Services serveur | `mini-services/world-sim/services/` | Combat, PNJ, bâtiments, événements, donjon, Gen3ia |
| Persistance | `mini-services/world-sim/persistence.ts` | Chargement/semis + écritures sûres |
| Schéma de données | `prisma/schema.prisma` | Comptes, personnages, monde persistant |

## Principe d'autorité

Le client n'envoie que des **intentions** (`move`, `attack`, `interact`, `deposit`,
`work`, `chat`). Le serveur calcule : positions (budget anti-speed-hack), dégâts,
butin, morts, états de bâtiments, événements, temps du monde. Le client prédit son
propre déplacement localement et se réconcilie avec les snapshots (5 Hz, rayon
d'intérêt 130 m).

## Dépendances

- Next.js 16 + React 19 + TypeScript (client + API)
- Three.js 0.185 + @react-three/fiber 9 (rendu 3D)
- socket.io 4.8 (temps réel, mini-service indépendant port 3003)
- Prisma 6 + SQLite (persistance partagée API/simulation)
- bun (exécution du mini-service, hot reload `bun --hot`)

## Limitations connues (honnêtes)

- Un seul serveur de simulation (pas de cluster/instances de zones) — dimensionné pour
  des dizaines de joueurs par province, pas des centaines.
- SQLite en fichier unique : verrouillage d'écriture géré par écritures séquentielles
  + 3 tentatives (`writeSafe`). PostgreSQL est le choix naturel à l'échelle.
- Le monde est une province de 480×480 m ; les 10 continents restent à construire
  (données de génération disponibles dans `WorldData/`).
- Les rendus 3D utilisent des géométries procédurales (aucun asset externe).

## Tests

`bun scripts/test_world_sim.mjs` — 51 assertions couvrant l'auth, l'anti-triche, le
multijoueur, le combat, la mort définitive, la destruction/reconstruction, les
événements, le donjon persistant, la reconnexion et le redémarrage du serveur.
