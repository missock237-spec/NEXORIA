"""Gen3ia.terrain — étages 6-7 : terrains 3D par région (heightmaps 256×256, 16 m/px).

Pipeline par région :
  1. base = échantillonnage bilinéaire de la carte monde (32 m/px) — raccords garantis
  2. détail = fBm global (évalué en coordonnées MONDE -> aucune couture inter-régions),
     amplitude pilotée par la pente (plaines douces, montagnes rugueuses)
  3. canaux : creusement des rivières/lacs (masque d'eau global ré-échantillonné)
  4. érosion thermique vectorisée (angle de talus), sur zone avec marge
  5. régions héros : érosion hydraulique par gouttes (batch vectorisé)
  6. export PNG 16 bits + RAW16 Unity + métadonnées (chunks 16×16, min/max)
Encodage hauteur : 0..65535 <-> -4096..+6144 m (HEIGHT_STEP ≈ 0,156 m).
Grille locale : rangée 0 = NORD de la région (convention image cohérente partout).
"""
from __future__ import annotations
import numpy as np
from PIL import Image
from .core import (WORLD_SIZE, REGION_SIZE, REGION_MAP_RES, REGION_MPP,
                   GLOBAL_RES, HEIGHT_MIN, HEIGHT_MAX, region_id, sub_seed,
                   save_json, wfile, load_json)
from .noise import fbm, smoothstep, bilinear_sample

DETAIL_K = 2.0 * np.pi / WORLD_SIZE * 4096.0    # base 256 m, 4 octaves -> 32 m
GLOBAL_MPP = WORLD_SIZE / GLOBAL_RES            # 32 m/px


# ---------------------------------------------------------------------------
# Érosions
# ---------------------------------------------------------------------------
def thermal_erosion(h: np.ndarray, iters: int = 24, talus: float = 0.9, factor: float = 0.5):
    """Érosion thermique vectorisée, conservation de la masse (dépôts aux voisins)."""
    t = h.astype(np.float64).copy()
    n = t.shape[0]
    views = (np.s_[0:-2, 1:-1], np.s_[2:, 1:-1], np.s_[1:-1, 0:-2], np.s_[1:-1, 2:])
    for _ in range(iters):
        p = np.pad(t, 1, mode="edge")
        core = p[1:-1, 1:-1]
        moved = np.zeros((n, n))
        for sl in views:
            d = core - p[sl]
            mv = np.where(d > talus, (d - talus) * factor * 0.25, 0.0)
            moved += mv
            p[sl] += mv                     # le voisin reçoit (vue aliasée de p)
        p[1:-1, 1:-1] -= moved
        t = p[1:-1, 1:-1].copy()
    return t.astype(np.float32)


def droplet_erosion(h: np.ndarray, n_droplets: int = 9000, max_steps: int = 28,
                    inertia: float = 0.06, capacity_f: float = 5.2,
                    erode_k: float = 0.28, deposit_k: float = 0.28,
                    evap: float = 0.015, seed: int = 0) -> np.ndarray:
    """Érosion hydraulique par gouttes, vectorisée (toutes les gouttes en parallèle)."""
    size = h.shape[0]
    r = np.random.default_rng(seed)
    pos = r.random((n_droplets, 2)) * (size - 3.0) + 1.5
    vel = np.zeros((n_droplets, 2))
    water = np.ones(n_droplets)
    sediment = np.zeros(n_droplets)
    alive = np.ones(n_droplets, dtype=bool)
    terrain = h.astype(np.float64).copy()

    def sample(p):
        x0 = np.clip(np.floor(p[:, 0]).astype(np.int64), 0, size - 2)
        y0 = np.clip(np.floor(p[:, 1]).astype(np.int64), 0, size - 2)
        fx = np.clip(p[:, 0] - x0, 0, 1)
        fy = np.clip(p[:, 1] - y0, 0, 1)
        h00 = terrain[y0, x0]; h10 = terrain[y0, x0 + 1]
        h01 = terrain[y0 + 1, x0]; h11 = terrain[y0 + 1, x0 + 1]
        hgt = h00 * (1 - fx) * (1 - fy) + h10 * fx * (1 - fy) + h01 * (1 - fx) * fy + h11 * fx * fy
        gx = (h10 - h00) * (1 - fy) + (h11 - h01) * fy
        gy = (h01 - h00) * (1 - fx) + (h11 - h10) * fx
        return hgt, gx, gy, x0, y0, fx, fy

    for step in range(max_steps):
        idx = np.nonzero(alive)[0]
        if idx.size == 0:
            break
        p = pos[idx]
        hgt, gx, gy, x0, y0, fx, fy = sample(p)
        dirx = vel[idx, 0] * inertia - gx * (1 - inertia)
        diry = vel[idx, 1] * inertia - gy * (1 - inertia)
        norm = np.hypot(dirx, diry) + 1e-9
        dirx /= norm; diry /= norm
        p_new = p + np.stack([dirx, diry], axis=1) * 0.9
        p_new[:, 0] = np.clip(p_new[:, 0], 1.5, size - 2.5)
        p_new[:, 1] = np.clip(p_new[:, 1], 1.5, size - 2.5)
        h_new, _, _, _, _, _, _ = sample(p_new)
        dh = hgt - h_new
        speed = np.hypot(vel[idx, 0], vel[idx, 1]) + 1e-9
        capacity = np.clip(-dh, 0, None) * speed * water * capacity_f * 0.1
        # dépôt : remplissage de cuvette ou excès de sédiment
        deposit = np.where(dh > 0, dh * deposit_k,
                           np.where(sediment[idx] > capacity,
                                    (sediment[idx] - capacity) * deposit_k, 0.0))
        # érosion : capacité non saturée sur pente descendante
        erode = np.where((dh <= 0) & (sediment[idx] < capacity),
                         np.minimum((capacity - sediment[idx]) * erode_k,
                                    np.abs(dh) * 0.5 + 0.02), 0.0)
        delta = erode - deposit
        w00 = (1 - fx) * (1 - fy); w10 = fx * (1 - fy); w01 = (1 - fx) * fy; w11 = fx * fy
        np.add.at(terrain, (y0, x0), -delta * w00)
        np.add.at(terrain, (y0, x0 + 1), -delta * w10)
        np.add.at(terrain, (y0 + 1, x0), -delta * w01)
        np.add.at(terrain, (y0 + 1, x0 + 1), -delta * w11)
        sediment[idx] = np.clip(sediment[idx] + delta, 0, None)
        vel[idx, 0] = dirx * 4.0
        vel[idx, 1] = diry * 4.0
        water[idx] = np.maximum(water[idx] * (1 - evap), 0.05)
        dead = (p_new[:, 0] <= 2.0) | (p_new[:, 0] >= size - 3.0) | \
               (p_new[:, 1] <= 2.0) | (p_new[:, 1] >= size - 3.0) | \
               ((step > 2) & (np.abs(dh) < 1e-4))
        alive[idx[dead]] = False
        pos[idx] = p_new
    return terrain.astype(np.float32)


# ---------------------------------------------------------------------------
# Génération d'une région
# ---------------------------------------------------------------------------
def _region_sample_grid(gx: int, gy: int):
    """Pixels carte monde (2048) des centres d'échantillons de la région (256²)."""
    half = GLOBAL_RES // 2 // 16          # 64 px carte = 1 moitié de région ? non :
    # région = 4096 m = 128 px carte ; 256 échantillons -> pas 0,5 px carte
    px = gx * 128 + (np.arange(REGION_MAP_RES) + 0.5) * 0.5
    py = GLOBAL_RES - (gy + 1) * 128 + (np.arange(REGION_MAP_RES) + 0.5) * 0.5
    return px, py


def build_region_heightmap(gx: int, gy: int, elev: np.ndarray, water2048: np.ndarray,
                           hero: bool = False) -> dict:
    n = REGION_MAP_RES
    rid = region_id(gx, gy)
    px, py = _region_sample_grid(gx, gy)
    PX, PY = np.meshgrid(px, py)
    # 1) base bilinéaire depuis la carte monde (mètres)
    base = bilinear_sample(elev.astype(np.float64), PX.ravel(), PY.ravel()).reshape(n, n)
    # 2) détail fBm en coordonnées monde (continuité inter-régions)
    wx = PX * (WORLD_SIZE / GLOBAL_RES) - WORLD_SIZE / 2
    wz = (1.0 - PY / GLOBAL_RES) * WORLD_SIZE - WORLD_SIZE / 2
    gz_m, gx_m = np.gradient(base)                 # m par pas de pixel (16 m)
    slope = np.hypot(gx_m, gz_m) / REGION_MPP      # m/m
    amp = 14.0 + 120.0 * smoothstep(0.05, 0.45, slope)
    detail = fbm(wx * DETAIL_K + 13.7, wz * DETAIL_K - 8.3, sub_seed("detail", rid), octaves=4)
    h = base + detail * amp
    # 3) canaux d'eau : masque ré-échantillonné depuis water_global
    wm = bilinear_sample(water2048.astype(np.float32), PX.ravel(), PY.ravel()).reshape(n, n)
    river = wm > 0.25
    h = np.where(river & (h > -4.0), np.minimum(h, -2.5 - wm * 3.0), h)
    # 4) érosion thermique avec marge (aucune couture aux bordures)
    pad = 24
    hp = np.pad(h, pad, mode="edge")
    hp = thermal_erosion(hp, iters=26, talus=max(0.8, float(slope.max()) * 0.15), factor=0.5)
    h = hp[pad:-pad, pad:-pad]
    if hero:
        h = droplet_erosion(h, n_droplets=9000, max_steps=28, seed=sub_seed("droplet", rid))
    return {"height": h.astype(np.float32), "water": river, "slope": slope.astype(np.float32)}


def encode_png16(h: np.ndarray) -> np.ndarray:
    enc = (h - HEIGHT_MIN) / (HEIGHT_MAX - HEIGHT_MIN) * 65535.0
    return np.clip(enc, 0, 65535).astype(np.uint16)


def run_terrain_stage():
    print("[Gen3ia] Terrains 3D des 256 régions (256×256, 16 m/px)...")
    elev = np.load(wfile("cache", "elev_hydro.npy"))
    water2048 = np.load(wfile("cache", "water_global.npy"))
    regions_meta = load_json(wfile("regions.json"))["regions"]
    n_done = 0
    for rg in regions_meta:
        gx, gy = rg["grid"]
        out = build_region_heightmap(gx, gy, elev, water2048, hero=False)
        h = out["height"]
        enc = encode_png16(h)
        Image.fromarray(enc, "I;16").save(wfile("heightmaps", f"{rg['id']}.png"))
        with open(wfile("heightmaps", f"{rg['id']}.raw16"), "wb") as f:
            f.write(enc.astype("<u2").tobytes())       # Unity Import Raw : 16 bits, ordre Windows
        cavg = h.reshape(16, 16, 16, 16).mean(axis=(1, 3))
        cmin = h.reshape(16, 16, 16, 16).min(axis=(1, 3))
        cmax = h.reshape(16, 16, 16, 16).max(axis=(1, 3))
        meta = {
            "id": rg["id"], "grid": [gx, gy], "resolution": REGION_MAP_RES,
            "mpp": REGION_MPP, "size_m": REGION_SIZE,
            "height_range": [HEIGHT_MIN, HEIGHT_MAX],
            "encode": "PNG16/RAW16 : 0..65535 -> -4096..+6144 m",
            "world_corner_sw": [gx * REGION_SIZE - WORLD_SIZE / 2, gy * REGION_SIZE - WORLD_SIZE / 2],
            "row0": "nord", "chunk_grid": "chunks[cgy][cgx] 16×16",
            "min_m": round(float(h.min()), 2), "max_m": round(float(h.max()), 2),
            "mean_m": round(float(h.mean()), 2),
            "water_fraction": round(float(out["water"].mean()), 3),
            "erosion": "thermal(26 iters)",
            "chunks": {"avg": np.round(cavg, 1).tolist(), "min": np.round(cmin, 1).tolist(),
                       "max": np.round(cmax, 1).tolist()},
        }
        save_json(wfile("regions", f"{rg['id']}.json"), meta, compact=True)
        np.save(wfile("cache", "terrain", f"{rg['id']}.npy"), h)
        n_done += 1
        if n_done % 64 == 0:
            print(f"  ... {n_done}/256")
    print(f"  {n_done} heightmaps (PNG16 + RAW16 + JSON + cache) écrites")
    return {"regions": n_done}
