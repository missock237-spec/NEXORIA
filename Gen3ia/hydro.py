"""Gen3ia.hydro — étage hydrologie : flux D8, fleuves, rivières, lacs.

À HYDRO_RES (1024 px, 64 m/px) : récepteurs D8 (plus bas voisin), accumulation
de flux triée par altitude, traçage des polylignes de fleuves (du glacier/col
jusqu'à la mer ou aux lacs), lacs dans les cuvettes d'accumulation majeure,
puis incision du lit dans la carte d'élévation globale.
"""
from __future__ import annotations
import numpy as np
from collections import deque
from .core import WORLD_SIZE, HYDRO_RES, rng, make_name, save_json, wdir, wfile, register, world_to_map
from .noise import map_coords

# Voisinage D8 (dx, dy) en pixels carte (rangée 0 = nord)
_D8 = [(-1, -1), (0, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (0, 1), (1, 1)]
_FLOW_TAU = 550          # cellules amont => rivière (≈ 2.2 km² de bassin)
_RIVER_TAU_BIG = 4000    # fleuve majeur


def _receivers(elev: np.ndarray, land: np.ndarray):
    """Récepteur D8 de chaque cellule (pente la plus forte), lui-même si cuvette."""
    res = elev.shape[0]
    e = elev
    pad = np.pad(e, 1, mode="edge")
    best = np.full(e.size, -1, dtype=np.int64)
    best_drop = np.zeros(e.size, dtype=np.float64)   # dénivelé du meilleur voisin
    H, W = res, res
    idx = np.arange(e.size).reshape(H, W)
    for dy, dx in _D8:
        sh = pad[1 + dy:1 + dy + H, 1 + dx:1 + dx + W]
        tgt = np.roll(np.roll(idx, -dy, axis=0), -dx, axis=1)
        drop = (e - sh).ravel()                       # >0 : voisin plus bas
        take = drop > best_drop + 1e-6
        best[take] = tgt.ravel()[take]
        best_drop = np.where(take, drop, best_drop)
    best[best_drop <= 0] = np.arange(e.size)[best_drop <= 0]   # cuvettes -> elles-mêmes
    return best


def _box_blur(a: np.ndarray, k: int = 4, passes: int = 2) -> np.ndarray:
    """Flou séparable (approx. gaussienne) — nécessaire pour un drainage dendritique
    crédible : le bruit fin piège l'écoulement, les vallées lissées le guident."""
    for _ in range(passes):
        p = np.pad(a, k, mode="edge")
        c = np.cumsum(p, axis=0)
        a = (c[2 * k:, :] - c[:-2 * k, :]) / (2.0 * k)
        c = np.cumsum(a, axis=1)
        a = (c[:, 2 * k:] - c[:, :-2 * k]) / (2.0 * k)
    return a


def run_hydro_stage(elev: np.ndarray, land: np.ndarray) -> dict:
    res = HYDRO_RES
    # Sur-échantillonnage de l'élévation 2048 -> 1024 (moyenne 2×2, stable)
    e = (elev[0::2, 0::2] + elev[0::2, 1::2] + elev[1::2, 0::2] + elev[1::2, 1::2]) * 0.25
    l4 = land[0::2, 0::2] & land[0::2, 1::2] & land[1::2, 0::2] & land[1::2, 1::2]
    print(f"[Gen3ia] Hydrologie à {res}×{res} (64 m/px)...")
    es = _box_blur(e, 6, 2)               # vallées lissées pour le calcul D8
    recv = _receivers(es, l4)

    # Accumulation de flux (ordre décroissant d'altitude, sur terrain lissé)
    order = np.argsort(-es.ravel())
    acc = np.ones(e.size, dtype=np.float32)
    for i in order:
        j = recv[i]
        if j != i and j >= 0:
            acc[j] += acc[i]
    acc2 = acc.reshape(e.shape)

    river_mask = l4 & (acc2 >= _FLOW_TAU)
    print(f"  cellules de rivière : {int(river_mask.sum())} ({river_mask.mean()*100:.2f} % des terres)")
    # --- Traçage des polylignes : têtes de bassin -> mer/lac/cuvette ---
    river_flat = river_mask.ravel()
    ridx = np.argwhere(river_flat).ravel()
    # amonts = cellules fluviales qui reçoivent le flux d'une autre cellule fluviale
    is_upstream_of_river = np.zeros(e.size, dtype=bool)
    for i in ridx:
        j = recv[i]
        if j != i and river_flat[j]:
            is_upstream_of_river[j] = True
    heads = ridx[~is_upstream_of_river[ridx]]
    # marche aval depuis chaque tête, en fusionnant les débits
    px_per_m = res / WORLD_SIZE
    rivers, visited_end = [], np.zeros(e.size, dtype=bool)
    for h0 in heads:
        if visited_end[h0]:
            continue
        pts, i, wmax = [], h0, float(acc2.ravel()[h0])
        while True:
            y, x = divmod(int(i), res)
            wx = (x + 0.5) / res * WORLD_SIZE - WORLD_SIZE / 2
            wz = (1.0 - (y + 0.5) / res) * WORLD_SIZE - WORLD_SIZE / 2
            pts.append([round(float(wx), 1), round(float(wz), 1), round(float(e.ravel()[i]), 1)])
            wmax = max(wmax, float(acc2.ravel()[i]))
            j = recv[i]
            if j == i or not river_flat[j] or visited_end[j]:
                visited_end[h0] = True
                break
            i = j
            if len(pts) > 900:
                break
        if len(pts) >= 6:
            rivers.append({"points": pts, "flow": round(wmax), "major": wmax >= _RIVER_TAU_BIG})
    # fusion : ne garder que les polylignes significatives, triées par débit
    rivers.sort(key=lambda r: -r["flow"])
    rivers = rivers[:90]
    named = []
    for k, rv in enumerate(rivers):
        nm = make_name("commun" if not rv["major"] else ["aetheris", "kharn", "ssil"][k % 3],
                       2, f"river{k}")
        named.append({"id": f"RIVER_{k+1:03d}",
                      "name": ("Fleuve " if rv["major"] else "Rivière ") + nm,
                      "flow_cells": rv["flow"], "major": rv["major"],
                      "length_km": round(len(rv["points"]) * 0.064, 1),
                      "points_xyz": rv["points"]})

    # --- Lacs : cuvettes terminales à fort débit ---
    self_recv = recv == np.arange(e.size)
    sinks = np.argwhere(self_recv & l4.ravel() & (acc2.ravel() > _FLOW_TAU * 6)).ravel()
    lakes = []
    taken = np.zeros(e.shape, dtype=bool)
    for i in sinks[:220]:
        y, x = divmod(int(i), res)
        if any(taken[max(0, y-28):y+28, max(0, x-28):x+28].any() for _ in [0]):
            continue
        rad = int(np.clip(np.sqrt(acc2.ravel()[i]) / 3.2, 3, 30))
        yy, xx = np.mgrid[max(0, y-rad):min(res, y+rad+1), max(0, x-rad):min(res, x+rad+1)]
        disk = (yy - y) ** 2 + (xx - x) ** 2 <= rad ** 2
        seg = l4[max(0, y-rad):min(res, y+rad+1), max(0, x-rad):min(res, x+rad+1)]
        seg[disk & seg] = False                  # le lac devient eau
        taken[max(0, y-rad):min(res, y+rad+1), max(0, x-rad):min(res, x+rad+1)] |= disk
        wx = (x + 0.5) / res * WORLD_SIZE - WORLD_SIZE / 2
        wz = (1.0 - (y + 0.5) / res) * WORLD_SIZE - WORLD_SIZE / 2
        lakes.append({"id": f"LAKE_{len(lakes)+1:03d}",
                      "name": "Lac " + make_name("aetheris" if len(lakes) % 2 else "commun", 1, f"lake{len(lakes)}"),
                      "world": [round(float(wx), 1), round(float(wz), 1)],
                      "radius_m": round(rad * 64.0, 1),
                      "surface_m2": round(float(disk.sum()) * 64 * 64, 0)})
    lakes = lakes[:40]
    print(f"  fleuves/rivières tracés : {len(named)} | lacs : {len(lakes)}")

    # --- Incision des lits dans la carte globale (2048) ---
    carve = np.zeros_like(e)
    wmap = np.zeros(e.shape, dtype=np.float32)
    wmap[river_mask] = np.sqrt(acc2[river_mask])
    wmap = np.clip(wmap / np.sqrt(_RIVER_TAU_BIG), 0, 1.4)
    for dy, dx in _D8:                # élargissement doux du lit
        wmap += np.roll(np.roll(wmap, dy, axis=0), dx, axis=1) * 0.18
    wmap = np.clip(wmap, 0, 1.6)
    carve = wmap * 14.0
    lake_field = np.zeros(e.shape, dtype=np.float32)
    for lk in lakes:
        py, px = world_to_map(lk["world"][0], lk["world"][1], res)
        y, x = int(py), int(px)
        rad = max(2, int(lk["radius_m"] / 64))
        y0, y1 = max(0, y - rad), min(res, y + rad + 1)
        x0, x1 = max(0, x - rad), min(res, x + rad + 1)
        if y1 <= y0 or x1 <= x0:
            continue
        yy, xx = np.mgrid[y0:y1, x0:x1]
        disk = ((yy - y) ** 2 + (xx - x) ** 2) <= rad ** 2
        lake_field[y0:y1, x0:x1][disk] = 1.0
    lake_depth = lake_field * 22.0
    # abaissement global 1024 -> 2048 (réplication 2×2)
    down = np.repeat(np.repeat(carve + lake_depth, 2, axis=0), 2, axis=1)[:elev.shape[0], :elev.shape[1]]
    elev2 = elev - down.astype(np.float32)
    water_global = np.repeat(np.repeat((river_mask | (lake_field > 0.5)), 2, axis=0), 2, axis=1)[:elev.shape[0], :elev.shape[1]]

    save_json(wfile("rivers.json"), {"rivers": named}, compact=True)
    save_json(wfile("lakes.json"), {"lakes": lakes})
    for rv in named:
        register(rv["id"], "river", {"name": rv["name"], "length_km": rv["length_km"]})
    np.save(wfile("cache", "elev_hydro.npy"), elev2.astype(np.float32))
    np.save(wfile("cache", "water_global.npy"), water_global)
    np.save(wfile("cache", "land_hydro.npy"), (l4 & ~(lake_field > 0.5)))
    return {"elev": elev2, "rivers": named, "lakes": lakes,
            "water_global": water_global, "land": (l4 & ~(lake_field > 0.5))}


def _bilinear(img, px, py):
    h, w = img.shape
    px = np.clip(px, 0, w - 1.001); py = np.clip(py, 0, h - 1.001)
    x0 = px.astype(np.int64); y0 = py.astype(np.int64)
    fx = px - x0; fy = py - y0
    x1 = np.minimum(x0 + 1, w - 1); y1 = np.minimum(y0 + 1, h - 1)
    a = img[y0, x0]; b = img[y0, x1]; c = img[y1, x0]; d = img[y1, x1]
    return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy
