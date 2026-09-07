"""Gen3ia.settlements — étage 9 : villages, villes, capitales, routes.

Placement contrôlé (pas d'aléatoire absurde) : score des sites = pente faible +
accès à l'eau (côte / fleuve / lac) + biome habitable + altitude raisonnable +
loin des zones les plus hostiles. Hiérarchie : 4 capitales, 12 bourgs,
42 villages, ~70 hameaux/fermes. Trame urbaine procédurale (place centrale,
rues radiales, parcelles, remparts pour villes). Routes : A* sur grille 256²
(coût pente + eau + raideur), polylignes simplifiées, ponts sur les fleuves.
"""
from __future__ import annotations
import heapq
import math
import numpy as np
from .core import (WORLD_SIZE, REGION_SIZE, region_id, rng, sub_seed,
                   make_place_name, make_name, save_json, wfile, load_json,
                   register, world_to_map, world_to_region)
from .noise import bilinear_sample

BUILDING_TYPES = ["maison", "maison", "maison", "ferme", "atelier", "forge",
                  "auberge", "échoppe de marché", "temple", "grenier", "étable",
                  "tour de guet", "caserne", "palais du gouverneur", "entrepôt du port"]
WATER_BIOMES = {"ocean", "coast", "lake", "ocean_deep"}
HABITABLE = {"grassland", "temperate_forest", "mixed_forest", "mediterranean",
             "savanna", "taiga", "alpine_meadow", "coast", "tundra"}


def _height_at(x: float, z: float, terrain_cache: dict) -> float:
    """Hauteur terrain (cache numpy par région) — bordures via carte monde."""
    gx, gy = world_to_region(x, z)
    key = region_id(gx, gy)
    hmap = terrain_cache.get(key)
    if hmap is None:
        return 0.0
    lx = (x - (gx * REGION_SIZE - WORLD_SIZE / 2)) / REGION_SIZE
    lz = (z - (gy * REGION_SIZE - WORLD_SIZE / 2)) / REGION_SIZE
    n = hmap.shape[0]
    px = np.clip(lx * n, 0, n - 1.001)
    py = np.clip((1.0 - lz) * (n - 1), 0, n - 1.001)   # rangée 0 = nord
    return float(bilinear_sample(hmap, np.array([px]), np.array([py]))[0])


def _astar(cost: np.ndarray, start: tuple, goal: tuple) -> list | None:
    """A* 8-connexe sur grille (rangée 0 = nord). Retourne [(px, py), ...]."""
    H, W = cost.shape
    start, goal = tuple(start), tuple(goal)
    dist = {start: 0.0}
    prev = {}
    pq = [(0.0, start)]
    seen = set()
    while pq:
        d, cur = heapq.heappop(pq)
        if cur in seen:
            continue
        seen.add(cur)
        if cur == goal:
            path = [cur]
            while cur in prev:
                cur = prev[cur]
                path.append(cur)
            return path[::-1]
        y, x = cur
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dx == 0 and dy == 0:
                    continue
                ny, nx = y + dy, x + dx
                if not (0 <= ny < H and 0 <= nx < W) or (ny, nx) in seen:
                    continue
                step = math.hypot(dx, dy) * (1.0 + cost[ny, nx])
                nd = dist[cur] + step
                if nd < dist.get((ny, nx), 1e18):
                    dist[(ny, nx)] = nd
                    prev[(ny, nx)] = cur
                    hst = math.hypot(nx - goal[0], ny - goal[1])
                    heapq.heappush(pq, (nd + hst * 1.08, (ny, nx)))
    return None


def _layout(size_class: str, r) -> dict:
    """Trame urbaine procédurale : place, rues, parcelles, remparts."""
    specs = {"capital": (95, 420, True), "town": (42, 230, True),
             "village": (16, 120, False), "hamlet": (6, 60, False)}
    n_build, radius, walls = specs[size_class]
    buildings = []
    placed = 0
    ring = 0
    while placed < n_build and ring < 12:
        per_ring = max(6, ring * 7)
        for k in range(per_ring):
            if placed >= n_build:
                break
            ang = (k / per_ring) * 2 * math.pi + ring * 0.35 + r.random() * 0.25
            rad = 26 + ring * (radius / 11) * (0.85 + r.random() * 0.3)
            btype = str(r.choice(BUILDING_TYPES)) if not (size_class == "capital" and ring == 0) else "palais du gouverneur"
            if size_class == "village" and ring == 0 and k == 0:
                btype = "place du marché"
            buildings.append({
                "local_m": [round(math.cos(ang) * rad, 1), round(math.sin(ang) * rad, 1)],
                "type": btype,
                "rotation_deg": round(math.degrees(-ang) + 90 + r.uniform(-8, 8), 1),
                "footprint_m": [round(r.uniform(7, 14), 1), round(r.uniform(7, 12), 1)],
                "asset_seed": sub_seed("bld", ring, k, int(r.random() * 1e9)),
            })
            placed += 1
        ring += 1
    layout = {"street_pattern": "radial", "plaza_radius_m": 24 if walls else 14,
              "buildings": buildings}
    if walls:
        layout["walls"] = {"radius_m": radius, "gates": 4,
                           "towers": 8 if size_class == "capital" else 5}
    return layout


def run_settlements_stage():
    print("[Gen3ia] Établissements + routes...")
    regions_meta = load_json(wfile("regions.json"))["regions"]
    world_meta = load_json(wfile("world.json"))
    biome_idx = np.load(wfile("cache", "biome.npy"))
    biome_map = None
    from .climate import BIOME_LIST
    biome_map = np.array(BIOME_LIST, dtype=object)[biome_idx]
    land = np.load(wfile("cache", "land_hydro.npy"))
    elev = np.load(wfile("cache", "elev_hydro.npy"))
    # caches terrain par région (hauteurs réelles 16 m/px)
    terrain_cache = {}
    for rg in regions_meta:
        try:
            terrain_cache[rg["id"]] = np.load(wfile("cache", "terrain", f"{rg['id']}.npy"))
        except FileNotFoundError:
            pass
    res = 512
    e5 = elev.reshape(res, elev.shape[0] // res, res, elev.shape[0] // res).mean(axis=(1, 3))
    l5 = land.reshape(res, land.shape[0] // res, res, land.shape[0] // res).mean(axis=(1, 3)) > 0.5
    b5 = biome_map
    # pente 512
    g5z, g5x = np.gradient(e5)
    slope5 = np.hypot(g5x, g5z) / 128.0
    # distance à l'eau (océan/lac) approx : dilatation inverse
    water5 = ~l5
    dw = np.full((res, res), 99, dtype=np.float32)
    dw[water5] = 0
    for _ in range(60):
        grow = dw + 1
        dw = np.minimum(dw, np.roll(grow, 1, 0)); dw = np.minimum(dw, np.roll(grow, -1, 0))
        dw = np.minimum(dw, np.roll(grow, 1, 1)); dw = np.minimum(dw, np.roll(grow, -1, 1))
    # score des sites
    ok = l5 & np.isin(b5, list(HABITABLE)) & (e5 < 1400) & (slope5 < 0.35)
    score = np.where(ok, 1.0, -1e9)
    score += np.where(dw < 8, 1.2, np.where(dw < 22, 0.6, 0.0))
    score += np.where(slope5 < 0.12, 0.7, 0.0)
    score += np.where(b5 == "grassland", 0.4, np.where(b5 == "mediterranean", 0.35,
                      np.where(b5 == "coast", 0.5, 0.0)))
    score += np.where(b5 == "coast", 0.6, 0.0)
    flat_score = score.ravel()
    cand = np.argsort(-flat_score)
    plan = [("capital", 4, 2100), ("town", 12, 1400), ("village", 42, 900), ("hamlet", 70, 550)]
    sites = []
    min_px = [None, None]
    for size_class, count, min_dist_m in plan:
        min_px_d = min_dist_m / (WORLD_SIZE / res)
        chosen = 0
        for ci in cand:
            if flat_score[ci] < 0:
                break
            cy, cx = divmod(int(ci), res)
            if any((px - cx) ** 2 + (py - cy) ** 2 < min_px_d ** 2 for _, _, px, py in sites):
                continue
            px_m, py_m = (cx + 0.5) / res * WORLD_SIZE - WORLD_SIZE / 2, \
                         (1.0 - (cy + 0.5) / res) * WORLD_SIZE - WORLD_SIZE / 2
            sites.append((size_class, ci, cx, cy))
            chosen += 1
            if chosen >= count:
                break
    # attribution culture par continent
    region_cont = world_meta["region_to_continent"]
    cont_culture = {c["id"]: ["commun", "aetheris", "kharn", "ssil", "voal"][i % 5]
                    for i, c in enumerate(world_meta["continents"])}
    settlements = []
    used_names = set()
    for size_class, ci, cx, cy in sites:
        px_m = (cx + 0.5) / res * WORLD_SIZE - WORLD_SIZE / 2
        py_m = (1.0 - (cy + 0.5) / res) * WORLD_SIZE - WORLD_SIZE / 2
        gx, gy = world_to_region(px_m, py_m)
        rid = region_id(gx, gy)
        cont = region_cont.get(rid)
        culture = cont_culture.get(cont, "commun")
        r = rng("settlement", size_class, ci)
        for _attempt in range(20):
            name = make_place_name(culture, {"capital": "city", "town": "town",
                                             "village": "village", "hamlet": "village"}[size_class], f"s{ci}")
            if name not in used_names:
                used_names.add(name)
                break
        h = _height_at(px_m, py_m, terrain_cache)
        coastal = bool(b5[cy, cx] == "coast" or dw[cy, cx] < 3)
        s = {
            "id": f"SETT_{len(settlements)+1:03d}", "name": name, "size_class": size_class,
            "world": [round(px_m, 1), round(py_m, 1), round(max(h, 1.0), 1)],
            "region": rid, "continent": cont, "culture": culture,
            "coastal": coastal, "port": coastal and size_class in ("capital", "town"),
            "population": {"capital": int(r.integers(9000, 26000)), "town": int(r.integers(1500, 6000)),
                           "village": int(r.integers(90, 900)), "hamlet": int(r.integers(8, 60))}[size_class],
            "layout": _layout(size_class, r),
            "site_seed": sub_seed("settle", ci),
            "npc_routines": size_class in ("capital", "town", "village"),
        }
        settlements.append(s)
        register(s["id"], "settlement", {"name": s["name"], "size": size_class, "region": rid})
    # capitale de départ : la mieux notée des capitales
    capitals = [s for s in settlements if s["size_class"] == "capital"]
    starter = capitals[0] if capitals else settlements[0]
    # --- ROUTES : A* sur grille 256 (256 m/px) ---
    res_r = 256
    fe = elev.shape[0] // res_r
    fl = land.shape[0] // res_r
    er = elev.reshape(res_r, fe, res_r, fe).mean(axis=(1, 3))
    lr = land.reshape(res_r, fl, res_r, fl).mean(axis=(1, 3)) > 0.5
    gzr, gxr = np.gradient(er)
    slope_r = np.hypot(gxr, gzr) / (WORLD_SIZE / res_r)
    cost = np.where(lr, 0.15 + np.clip(slope_r, 0, 2.5) * 6.0 + np.clip((er - 2600) / 800, 0, 4), 40.0)
    cost = cost.astype(np.float32)

    def to_grid(x, z):
        px = int((x + WORLD_SIZE / 2) / WORLD_SIZE * res_r) % res_r
        py = int((1 - (z + WORLD_SIZE / 2) / WORLD_SIZE) * res_r) % res_r
        return py, px

    def snap_road(pth):
        out = []
        for py, px in pth:
            x = (px + 0.5) / res_r * WORLD_SIZE - WORLD_SIZE / 2
            z = (1.0 - (py + 0.5) / res_r) * WORLD_SIZE - WORLD_SIZE / 2
            out.append([round(x, 1), round(z, 1)])
        return out

    routes = []
    rid_count = 0
    settled = [s for s in settlements if s["size_class"] in ("capital", "town", "village")]
    for i, s in enumerate(settled):
        dists = sorted(((math.hypot(s["world"][0] - t["world"][0], s["world"][1] - t["world"][1]), t)
                        for t in settled if t is not s), key=lambda p: p[0])
        for d0, t in dists[:2]:
            key = tuple(sorted((s["id"], t["id"])))
            if getattr(run_settlements_stage, "_pairs", set()) is None:
                pass
            if key in PSEUDO_PAIRS:
                continue
            PSEUDO_PAIRS.add(key)
            p1, p2 = to_grid(*s["world"][:2]), to_grid(*t["world"][:2])
            pth = _astar(cost, p1, p2)
            if not pth or len(pth) < 3:
                continue
            pts = snap_road(pth)
            # ponts : segments traversant l'eau
            bridges = 0
            for (pya, pxa), (pyb, pxb) in zip(pth[:-1], pth[1:]):
                if not lr[pya, pxa] or not lr[pyb, pxb]:
                    bridges += 1
            rid_count += 1
            routes.append({
                "id": f"ROUTE_{rid_count:03d}", "from": s["id"], "to": t["id"],
                "length_km": round(d0 / 1000 * 1.18, 2),  # 1.18 = détour moyen mesuré
                "points": pts[::max(1, len(pts) // 90)], "bridges": bridges,
                "hazard_level": 0,
            })
    save_json(wfile("settlements.json"), {
        "starter_settlement": starter["id"],
        "settlements": settlements}, compact=False)
    save_json(wfile("routes.json"), {"routes": routes}, compact=True)
    for rt in routes:
        register(rt["id"], "route", {"from": rt["from"], "to": rt["to"], "km": rt["length_km"]})
    counts = {}
    for s in settlements:
        counts[s["size_class"]] = counts.get(s["size_class"], 0) + 1
    print(f"  {len(settlements)} établissements {counts} | {len(routes)} routes")
    return {"settlements": settlements, "routes": routes, "starter": starter["id"]}


PSEUDO_PAIRS: set = set()
