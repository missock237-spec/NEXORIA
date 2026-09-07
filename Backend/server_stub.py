"""NEXORIA — server_stub.py : prototype de gateway MMO (pédagogique).

Autorité minimale : positions joueurs validées par vitesse max, abonnement
par région (les clients ne reçoivent que leur région + voisines).
Production : voir ARCHITECTURE_MMO.md — ceci n'est PAS un serveur de jeu.

Usage : pip install websockets && python3 server_stub.py
"""
import asyncio
import json
import math
import time

import websockets

WORLD_SIZE = 65536
REGION_SIZE = 4096
MAX_SPEED_MPS = 12.0           # anti-teleport
TICK_SEND = 0.1                # 10 Hz


def region_id(x: float, z: float) -> str:
    gx = max(0, min(15, int((x + WORLD_SIZE / 2) // REGION_SIZE)))
    gy = max(0, min(15, int((z + WORLD_SIZE / 2) // REGION_SIZE)))
    return f"REGION_{gy * 16 + gx + 1:03d}"


def neighbor_ids(rid: str):
    idx = int(rid.split("_")[1]) - 1
    gy, gx = divmod(idx, 16)
    out = []
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            ny, nx = gy + dy, gx + dx
            if 0 <= ny < 16 and 0 <= nx < 16:
                out.append(f"REGION_{ny * 16 + nx + 1:03d}")
    return out


class Player:
    def __init__(self, ws, name):
        self.ws = ws
        self.name = name
        self.x = 0.0
        self.z = 0.0
        self.entity_id = id(ws) & 0xFFFFFF
        self.region = region_id(0, 0)
        self.last_move = 0.0


PLAYERS: dict = {}


async def broadcast_regions():
    """Envoie à chaque joueur les entités de sa région + voisines (10 Hz)."""
    while True:
        try:
            for p in list(PLAYERS.values()):
                visible = [q for q in PLAYERS.values()
                           if q.region in neighbor_ids(p.region) or q is p]
                msg = json.dumps({"op": "state", "t": round(time.time(), 2), "ents": [
                    {"id": q.entity_id, "name": q.name, "x": round(q.x, 1),
                     "z": round(q.z, 1), "region": q.region} for q in visible]})
                await p.ws.send(msg)
        except Exception:
            pass
        await asyncio.sleep(TICK_SEND)


async def handler(ws):
    player = None
    try:
        async for raw in ws:
            try:
                m = json.loads(raw)
            except json.JSONDecodeError:
                continue
            op = m.get("op")
            if op == "join":
                player = Player(ws, str(m.get("name", "Anonyme"))[:24])
                PLAYERS[ws] = player
                await ws.send(json.dumps({"op": "welcome", "seed": 0x4E455852,
                                          "you": {"entityId": player.entity_id,
                                                  "region": player.region}}))
                print(f"[+] {player.name} (#{player.entity_id})")
            elif op == "move" and player:
                now = time.time()
                dx, dz = float(m["x"]) - player.x, float(m["z"]) - player.z
                dt = max(now - player.last_move, 0.001)
                speed = math.hypot(dx, dz) / dt
                if speed <= MAX_SPEED_MPS * 2.5:          # tolérance réseau
                    player.x, player.z = float(m["x"]), float(m["z"])
                player.region = region_id(player.x, player.z)
                player.last_move = now
            elif op == "ping":
                await ws.send(json.dumps({"op": "pong"}))
    except websockets.ConnectionClosed:
        pass
    finally:
        if player:
            print(f"[-] {player.name} quitte")
            PLAYERS.pop(ws, None)


async def main():
    async with websockets.serve(handler, "0.0.0.0", 8765, ping_interval=20):
        print("NEXORIA gateway (stub) — ws://0.0.0.0:8765")
        await broadcast_regions()


if __name__ == "__main__":
    asyncio.run(main())
