# NEXORIA — Architecture serveur MMO (v1, à implémenter)

> État : **document de conception**. Le prototype exécutable est
> `server_stub.py`. Aucun serveur de production n'existe encore — par honnêteté.

## 1. Principes

1. **Serveur autoritaire** : le client simule localement (prediction), le
   serveur tranche (positions, combat, loot, économie).
2. **Le monde est gratuit** : le terrain, les POI, les donjons, les biomes
   sont déterministes (seed `0x4E455852`) — le serveur ne transmet JAMAIS
   le monde, seulement les données dynamiques.
3. **Intérêt par régions/chunks** : chaque client n'abonne que son anneau
   (rayon streaming) → charge serveur O(joueurs × rayon), pas O(joueurs²).

## 2. Composants

```
┌────────────┐   wss    ┌─────────────────┐   sql   ┌────────────┐
│  Client    │◄────────►│  Gateway (ws)   │◄──────► │ PostgreSQL │
│  Unity     │          │  rooms/régions  │         │ comptes…   │
└────────────┘          ├─────────────────┤         └────────────┘
                        │  Sim worker(s)  │   tick 10 Hz positions
                        │  (zones actives)│   tick 1 Hz monstres/événements
                        └─────────────────┘
```

- **Gateway** : auth (JWT), routage par région (`regionId = f(x, z)`), backpressure.
- **Sim workers** : un worker par ensemble de régions actives (sharding
  géographique), ECS léger côté serveur.
- **Persistance** : comptes, personnages, inventaires, progression de donjons,
  états des événements du monde (`world_events`).

## 3. Ticks et messages

| Fréquence | Contenu |
|---|---|
| 10 Hz | snapshots des entités dynamiques (joueurs, PNJ visibles) — delta compressé |
| 1 Hz | monstres, météo régionale (état + transition), événements |
| à l'entrée | handshakes : seed monde + version WorldData (hash) — si diff → re-télécharger |

### Messages (JSON ligne, prototype ; binaire msgpack en prod)

```json
{"op":"join", "name":"…"}                       → {"op":"welcome","seed":1313167442,"you":{"entityId":…}}
{"op":"move", "x":120, "z":130}                 → {"op":"state","ents":[…]}  (10 Hz, région seulement)
{"op":"region", "id":"REGION_122"}              → bascule d'abonnement
```

## 4. Combat & sécurité

- Côté serveur : cooldowns, portées, LOS (heightmaps raw16 chargées côté serveur),
  validation des déplacements (vitesse max par état).
- Anti-cheat minimal : rejeu des inputs impossible (nonce), taux limité.

## 5. Scaling

1. Vertical d'abord (1 gateway + 4 workers suffit à ~2 000 CCU sur des régions
   peu denses).
2. Horizontal ensuite : sharding géographique (continents), gateway stateless
   derrière LB, Redis pub/sub pour le cross-region (chat global, événements).
