"""Gen3ia.worldgen — étages 1-3 : planète, tectonique, continents, montagnes.

Modèle d'élévation global (GLOBAL_RES=2048, 32 m/px) :
  base fBm à déformation de domaine (côtes organiques)
+ champs tectoniques (plaques de Voronoï, convergence -> ceintures montagneuses)
+ bruit ridged masqué par l'uplift (crêtes réalistes)
+ affaiblissement radial de bordure (l'Océan Primordial entoure le monde).
Tout est déterministe via WORLD_SEED.
"""
from __future__ import annotations
import numpy as np
from .core import (WORLD_SIZE, GLOBAL_RES, HYDRO_RES, rng, make_name, save_json,
                   wdir, wfile, map_to_world, region_id, world_to_region, region_center)
from .noise import fbm, domain_warp, smoothstep, map_coords, bilinear_sample

MIN_ALT, MAX_ALT = -3200.0, 4600.0


# ---------------------------------------------------------------------------
# TECTONIQUE — plaques de Voronoï + vecteurs de dérive
# ---------------------------------------------------------------------------
def generate_plates(n_plates: int = 9):
    """Retourne (centers_px, velocities, uplift, rift) à la résolution 512."""
    res = 512
    r = rng("tectonics", "plates")
    centers = r.random((n_plates, 2)) * res
    vels = r.normal(0.0, 1.0, (n_plates, 2)) * r.random((n_plates, 1)) + 0.15
    px, py, _, _ = map_coords(res)
    d = np.stack([np.hypot(px - c[0], py - c[1]) for c in centers])   # (n, res, res)
    order = np.argsort(d, axis=0)
    nearest, second = order[0], order[1]
    d1 = np.take_along_axis(d, nearest[None], 0)[0]
    d2 = np.take_along_axis(d, second[None], 0)[0]
    edge = np.exp(-((d2 - d1) / 46.0) ** 2)          # proximité de frontière
    p1 = centers[nearest]; p2 = centers[second]
    axis = p2 - p1
    axis = axis / (np.linalg.norm(axis, axis=-1, keepdims=True) + 1e-9)
    v1 = vels[nearest]; v2 = vels[second]
    conv = -np.sum((v2 - v1) * axis, axis=-1)         # >0 : collision
    uplift = edge * np.clip(conv, 0.0, None)
    rift = edge * np.clip(-conv, 0.0, None)
    vnorm = np.linalg.norm(v2 - v1, axis=-1)
    shear = edge * vnorm * 0.5                        # frontières transformantes
    meta = [{"plate": i, "center_world": list(map_to_world(centers[i][0], centers[i][1], res)),
             "velocity": [float(vels[i][0]), float(vels[i][1])]} for i in range(n_plates)]
    return {"centers": centers, "vels": vels, "uplift": uplift, "rift": rift,
            "shear": shear, "meta": meta, "res": res}


def _upsample(img: np.ndarray, res_in: int, res_out: int) -> np.ndarray:
    """Suréchantillonnage bilinéaire simple (resize sans dépendance PIL)."""
    px, py, _, _ = map_coords(res_out)
    sx = px * (res_in / res_out) - 0.5
    sy = py * (res_in / res_out) - 0.5
    x0 = np.clip(sx.astype(np.int64), 0, res_in - 1)
    y0 = np.clip(sy.astype(np.int64), 0, res_in - 1)
    x1 = np.minimum(x0 + 1, res_in - 1); y1 = np.minimum(y0 + 1, res_in - 1)
    fx = np.clip(sx - x0, 0, 1); fy = np.clip(sy - y0, 0, 1)
    a = img[y0, x0]; b = img[y0, x1]; c = img[y1, x0]; d = img[y1, x1]
    return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy


# ---------------------------------------------------------------------------
# ÉLÉVATION GLOBALE
# ---------------------------------------------------------------------------
def build_elevation():
    """Construit l'élévation mondiale (mètres) et le masque terre/mer.

    Séparation stricte des échelles (indispensable à une hydrologie crédible) :
      - continents : fBm très basses fréquences (wavelengths > 2,5 km)
      - montagnes  : bruit ridged moyen (4-14 km) masqué par l'uplift tectonique
      - collines   : faible amplitude (le détail fin est ajouté par région)
    """
    res = GLOBAL_RES
    px, py, wx, wz = map_coords(res)
    # 1) Côtes organiques : fBm basse fréquence + warp de domaine
    k = 2.0 * np.pi / WORLD_SIZE
    xw, yw = domain_warp(wx * k * 1.35, wz * k * 1.35, 0x4E455001, strength=1.15)
    base = fbm(xw, yw, 0x4E455002, octaves=5, gain=0.55)
    # 2) Tectonique (calculée à 512, suréchantillonnée)
    tec = generate_plates()
    uplift = _upsample(tec["uplift"], tec["res"], res)
    rift = _upsample(tec["rift"], tec["res"], res)
    # 3) Crêtes montagneuses masquées par l'uplift
    ridg = fbm(wx * k * 8.0 + 3.1, wz * k * 8.0 - 7.4, 0x4E455003, octaves=3, ridged=True)
    mountains = np.clip(uplift, 0, 1.5) * (0.30 + ridg.clip(0, 1) * 1.0)
    # 4) Fossés d'effondrement + collines douces
    hills = fbm(wx * k * 26.0 + 9.9, wz * k * 26.0 - 4.2, 0x4E455005, octaves=3) * 0.03
    elev = base * 0.95 + mountains * 0.62 + hills - rift * 0.18
    # 5) Océan Primordial en bordure de carte (affaiblissement radial)
    edge = np.minimum(np.minimum(px, res - px), np.minimum(py, res - py)) / res
    fall = smoothstep(0.0, 0.075, edge)
    elev = elev * fall - (1.0 - fall) * 1.4
    # 6) Calibrage : ~46 % de terres émergées, niveau 0 = mer
    flat = np.sort(elev.ravel())
    sea_q = flat[int(0.54 * flat.size)]
    elev = elev - sea_q
    land = elev > 0
    # 7) Échelles réalistes : plaines vastes (0-600 m), montagnes rares (jusqu'à 4 600 m)
    pos = elev.clip(0, None)
    emax = np.percentile(pos[pos > 0], 99.7) if land.any() else 1.0
    alt = np.where(land, 4600.0 * np.power(pos / max(emax, 1e-6), 2.2)
                   + uplift * 380.0, 0.0)
    alt = np.clip(alt, 0, 4600.0)
    neg = elev.clip(None, 0)
    dmin = max(abs(neg.min()), 1e-6)
    depth = MIN_ALT * np.power(np.abs(neg) / dmin, 0.72)
    depth = np.clip(depth, MIN_ALT, 0.0)
    elev_m = np.where(land, alt, depth).astype(np.float32)
    return {"elev": elev_m, "land": land, "plates": tec, "res": res}


# ---------------------------------------------------------------------------
# MONTAGNES — extraction des chaînes (identification, pics, passes)
# ---------------------------------------------------------------------------
def extract_mountains(elev: np.ndarray, land: np.ndarray):
    """Détecte les ceintures montagneuses (clusters de hauts sommets) par
    grappes de maxima locaux puis regroupement par bassin d'attraction."""
    res = elev.shape[0]
    r = rng("mountains", "ranges")
    # maxima locaux > 900 m
    e = np.where(land, elev, -1.0)
    pad = np.pad(e, 1, mode="edge")
    neigh = np.stack([pad[0:-2, 0:-2], pad[0:-2, 1:-1], pad[0:-2, 2:],
                      pad[1:-1, 0:-2], pad[1:-1, 2:],
                      pad[2:, 0:-2], pad[2:, 1:-1], pad[2:, 2:]])
    is_peak = (e > 900) & (e >= neigh.max(axis=0) - 1e-3)
    peaks = np.argwhere(is_peak)
    # regroupement glouton par proximité (rayon d'influence 90 px = 2.9 km)
    order = np.argsort(-e[is_peak])
    peaks = peaks[order]
    assigned = np.full(res * res, -1, dtype=np.int64)
    ranges = []
    for yy, xx in peaks:
        idx = yy * res + xx
        if assigned[idx] != -1:
            continue
        rid = len(ranges)
        y0, y1 = max(0, yy - 90), min(res, yy + 90)
        x0, x1 = max(0, xx - 90), min(res, xx + 90)
        sub = e[y0:y1, x0:x1]
        near = np.argwhere((sub > 0.55 * e[yy, xx]) & (sub > 900)) + [y0, x0]
        assigned[near[:, 0] * res + near[:, 1]] = rid
        ranges.append(near)
    ranges = [rg for rg in ranges if len(rg) >= 6]
    ranges.sort(key=len, reverse=True)
    ranges = ranges[:14]                      # 14 grandes chaînes max
    cultures = ["kharn", "commun", "aetheris", "voal", "kharn", "ssil"]
    out = []
    for i, rg in enumerate(ranges):
        ys, xs = rg[:, 0], rg[:, 1]
        wxs = (xs + 0.5) / res * WORLD_SIZE - WORLD_SIZE / 2
        wzs = (1.0 - (ys + 0.5) / res) * WORLD_SIZE - WORLD_SIZE / 2
        alts = elev[ys, xs]
        top = np.argsort(-alts)[:6]
        name = make_name(cultures[i % len(cultures)], 2, f"range{i}")
        out.append({
            "id": f"RANGE_{i+1:02d}",
            "name": f"Chaîne des {name}" if i % 2 else f"Monts {name}",
            "peak_count": int(len(rg)),
            "bbox_world": [float(wxs.min()), float(wzs.min()),
                           float(wxs.max()), float(wzs.max())],
            "length_km": round(float(np.hypot(wxs.max() - wxs.min(), wzs.max() - wzs.min()) / 1000), 1),
            "highest_peak": {"world": [float(wxs[top[0]]), float(wzs[top[0]]), float(alts[top[0]])],
                             "name": f"Pic {make_name('kharn', 1, f'peak{i}')}",
                             "altitude_m": round(float(alts[top[0]]), 1)},
            "peaks": [{"world": [round(float(wxs[t]), 1), round(float(wzs[t]), 1), round(float(alts[t]), 1)]}
                      for t in top],
            "visual_identity": str(r.choice([
                "crêtes dentelées granit + glaciers suspendus",
                "mesas stratifiées ocre et canyons",
                "dômes volcaniques sombres striés de lave",
                "aiguilles karstiques couvertes de nuages bas",
                "massifs arrondis érodés, forêts en escaliers",
            ])),
        })
    return out


# ---------------------------------------------------------------------------
# VOLCANS — sites de caldeira (pour l'étage POI / Suprêmes)
# ---------------------------------------------------------------------------
def place_volcanoes(elev, land, n=6):
    res = elev.shape[0]
    r = rng("volcanoes")
    e = np.where(land, elev, -1.0)
    pad = np.pad(e, 1, mode="edge")
    neigh = np.stack([pad[0:-2, 0:-2], pad[0:-2, 1:-1], pad[0:-2, 2:],
                      pad[1:-1, 0:-2], pad[1:-1, 2:],
                      pad[2:, 0:-2], pad[2:, 1:-1], pad[2:, 2:]])
    is_peak = (e > 1200) & (e >= neigh.max(axis=0) - 1e-3)
    cand = np.argwhere(is_peak)
    r.shuffle(cand)
    chosen = []
    for yy, xx in cand:
        if all(np.hypot(yy - cy, xx - cx) > res * 0.09 for cy, cx, _ in chosen):
            chosen.append((yy, xx, e[yy, xx]))
        if len(chosen) >= n:
            break
    out = []
    for i, (yy, xx, alt) in enumerate(chosen):
        wx = (xx + 0.5) / res * WORLD_SIZE - WORLD_SIZE / 2
        wz = (1.0 - (yy + 0.5) / res) * WORLD_SIZE - WORLD_SIZE / 2
        out.append({"id": f"VOLCANO_{i+1:02d}",
                    "name": f"Volcan {make_name('kharn', 1, f'vol{i}')}",
                    "world": [round(float(wx), 1), round(float(wz), 1)],
                    "altitude_m": round(float(alt), 1),
                    "status": str(r.choice(["actif", "dormant", "endormi"]))})
    return out


# ---------------------------------------------------------------------------
# CONTINENTS — composantes connexes de terres -> continents nommés
# ---------------------------------------------------------------------------
def _components(mask: np.ndarray, min_area: int):
    """Étiquetage en composantes connexes 4-connexes (BFS numpy-friendly)."""
    res = mask.shape[0]
    labels = np.zeros((res, res), dtype=np.int32)
    cur = 0
    areas = {}
    from collections import deque
    for sy, sx in zip(*np.nonzero(mask & (labels == 0))):
        if labels[sy, sx]:
            continue
        cur += 1
        q = deque([(sy, sx)])
        labels[sy, sx] = cur
        n = 0
        while q:
            y, x = q.popleft()
            n += 1
            if y > 0 and mask[y - 1, x] and not labels[y - 1, x]:
                labels[y - 1, x] = cur; q.append((y - 1, x))
            if y < res - 1 and mask[y + 1, x] and not labels[y + 1, x]:
                labels[y + 1, x] = cur; q.append((y + 1, x))
            if x > 0 and mask[y, x - 1] and not labels[y, x - 1]:
                labels[y, x - 1] = cur; q.append((y, x - 1))
            if x < res - 1 and mask[y, x + 1] and not labels[y, x + 1]:
                labels[y, x + 1] = cur; q.append((y, x + 1))
        areas[cur] = n
    return labels, areas


def extract_continents(land: np.ndarray, elev: np.ndarray):
    """Détection des continents majeurs (>1.5 % du monde) et des îles."""
    res = land.shape[0]
    small = land[::4, ::4]                    # 512×512 pour la vitesse
    labels, areas = _components(small, min_area=0)
    world_cells = small.size
    big_ids = [l for l, a in areas.items() if a > world_cells * 0.012]
    big_ids.sort(key=lambda l: -areas[l])
    cultures = ["aetheris", "kharn", "ssil", "commun", "voal", "ssil"]
    out = []
    isl_count = 0
    isl_areas = [a for l, a in areas.items() if l not in big_ids and a > 12]
    for rank, l in enumerate(big_ids[:6]):
        m = labels == l
        ys, xs = np.nonzero(m)
        wxs = (xs * 4 + 2) / res * WORLD_SIZE - WORLD_SIZE / 2
        wzs = (1.0 - (ys * 4 + 2) / res) * WORLD_SIZE - WORLD_SIZE / 2
        # altitude moyenne du continent (échantillonnée)
        alt = elev[(ys * 4).clip(0, res - 1), (xs * 4).clip(0, res - 1)]
        name = make_name(cultures[rank], 2, f"cont{rank}")
        out.append({
            "id": f"CONT_{rank+1:02d}",
            "name": name,
            "area_km2": round(float(areas[l] * (128.0 ** 2) / 1e6), 0),
            "bbox_world": [float(wxs.min()), float(wzs.min()), float(wxs.max()), float(wzs.max())],
            "centroid_world": [float(np.median(wxs)), float(np.median(wzs))],
            "mean_altitude_m": round(float(alt.mean()), 1),
            "max_altitude_m": round(float(alt.max()), 1),
            "geology": str(np.random.default_rng(rank).choice([
                "socle granitique ancien, bouclier stable",
                "marge active : jeunes montagnes et volcans",
                "plateau basaltique fissuré de failles magiques",
                "plateforme calcaire karstique, grottes multiples",
            ])),
            "population": str(np.random.default_rng(rank + 9).choice([
                "dense (cités, routes, agriculture)", "moyenne (villes-relais, tribus)",
                "faible (frontière sauvage)", "quasi nulle (zones interdites)",
            ])),
            "civilisations": [], "history": "",
        })
    return out, len(isl_areas), labels


# ---------------------------------------------------------------------------
# POINT D'ENTRÉE ÉTAGE MONDE
# ---------------------------------------------------------------------------
def run_world_stage() -> dict:
    """Étages 2-3 : élévation, montagnes, volcans, continents -> WorldData/."""
    print("[Gen3ia] Étage monde : élévation globale...")
    world = build_elevation()
    elev, land = world["elev"], world["land"]
    print(f"  terres émergées : {land.mean()*100:.1f} %")
    print("[Gen3ia] Chaînes de montagnes...")
    mountains = extract_mountains(elev, land)
    print(f"  {len(mountains)} chaînes identifiées")
    print("[Gen3ia] Volcans...")
    volcanoes = place_volcanoes(elev, land)
    print("[Gen3ia] Continents...")
    continents, n_islands, labels = extract_continents(land, elev)
    print(f"  {len(continents)} continents, ~{n_islands} îles/archipels")
    # Attribution régions -> continent (par centre de région)
    res = elev.shape[0]
    region_cont = {}
    for gy in range(16):
        for gx in range(16):
            cx, cz = region_center(gx, gy)
            mpx = int((cx + WORLD_SIZE / 2) / WORLD_SIZE * res) % res
            mpy = int((1 - (cz + WORLD_SIZE / 2) / WORLD_SIZE) * res) % res
            region_cont[region_id(gx, gy)] = None
            # continent dont le bbox contient le centre ET dont la cellule est terrestre
            for c in continents:
                b = c["bbox_world"]
                if b[0] <= cx <= b[2] and b[1] <= cz <= b[3] and land[mpy, mpx]:
                    region_cont[region_id(gx, gy)] = c["id"]
                    break
    world_meta = {
        "world": {"name": "NEXORIA", "seed": 0x4E455852, "seed_hex": "0x4E455852 (\"NEXR\")",
                  "size_m": WORLD_SIZE, "sea_level_m": 0.0,
                  "coordinate_system": "X=Est, Y=Altitude, Z=Nord, origine au centre, unités mètres",
                  "land_fraction": round(float(land.mean()), 3),
                  "highest_point_m": round(float(np.where(land, elev, -9e9).max()), 1),
                  "deepest_ocean_m": round(float(elev.min()), 1),
                  "regions_total": 256, "region_size_m": 4096, "chunk_size_m": 256},
        "ocean": {"name": "Océan Primordial", "lore": "Mer-mère encerclant le monde connu ; "
                  "au-delà commence l'Infini Dérouté, où les boussoles et la magie échouent."},
        "continents": continents,
        "islands_count": n_islands,
        "region_to_continent": region_cont,
    }
    save_json(wfile("world.json"), world_meta)
    save_json(wfile("mountains.json"), {"mountain_ranges": mountains})
    save_json(wfile("volcanoes.json"), {"volcanoes": volcanoes})
    # cache numpy pour les étages suivants (non versionné)
    np.save(wfile("cache", "elev.npy"), elev)
    np.save(wfile("cache", "land.npy"), land)
    np.save(wfile("cache", "uplift.npy"), _upsample(world["plates"]["uplift"], world["plates"]["res"], res).astype(np.float32))
    return {"elev": elev, "land": land, "mountains": mountains,
            "continents": continents, "volcanoes": volcanoes}
