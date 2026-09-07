# Backend NEXORIA — architecture MMO + prototype

## ARCHITECTURE_MMO.md

Voir [ARCHITECTURE_MMO.md](ARCHITECTURE_MMO.md) pour l'architecture complète
(authoritative server, intérêt par régions, snapshots 10 Hz, persistance).

## Prototype

`server_stub.py` : serveur websocket asyncio (~120 lignes) qui illustre
l'intérêt par régions (les clients ne reçoivent que les positions des
joueurs de leur région + voisines). **Prototype pédagogique** — pas un
serveur de production (pas de persistance, pas de combat, pas d'auth).

```bash
pip install websockets
python3 server_stub.py            # écoute ws://0.0.0.0:8765
```

Client de test (rejoindre, bouger, voir les autres) :

```python
import asyncio, websockets, json
async def main():
    async with websockets.connect("ws://localhost:8765") as ws:
        await ws.send(json.dumps({"op": "join", "name": "Pérégrin", "x": 100, "z": 100}))
        await ws.send(json.dumps({"op": "move", "x": 120, "z": 130}))
        print(await ws.recv())
asyncio.run(main())
```

## Roadmap backend (honnête)

- [ ] Persistance (PostgreSQL : comptes, inventaires, positions)
- [ ] Combat autoritaire serveur (hit validation, cooldowns)
- [ ] Intérêt dynamique par chunks (le prototype est par régions)
- [ ] Chat de zone (région) + global
- [ ] Événements du monde synchronisés (weather.json → world_events)
- [ ] Anti-cheat (validation des déplacements par vitesse max)
