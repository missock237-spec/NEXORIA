"""Gen3ia.climate — étage climat/biomes : latitude, vents, ombre pluviométrique.

Température : gradient de latitude (sud tempéré -60° -> nord polaire +70°)
moins le gradient thermique d'altitude (6.5 °C/km), plus bruit.
Humidité : distance à l'eau + ombre pluviométrique (vents dominants d'ouest,
maximum d'altitude cumulé au vent) + bruit.
Biomes : classification de type Whittaker + overrides (alpin, volcanique,
marécage, clairière magique, falaises). Stocké à CLIMATE_RES (512, 128 m/px).
"""
from __future__ import annotations
import numpy as np
from collections import deque
from .core import WORLD_SIZE, CLIMATE_RES, rng, save_json, wdir, wfile
from .noise import fbm, map_coords, bilinear_sample

# Biomes terrestres + marins (ids stables, utilisés par tout le projet)
BIOMES = {
    "ocean_deep":     {"fr": "Océan profond",      "color": "#0a1d3a", "water": True},
    "ocean":          {"fr": "Océan",              "color": "#123a63", "water": True},
    "coast":          {"fr": "Eaux côtières",      "color": "#1f6fa8", "water": True},
    "lake":           {"fr": "Lac",                "color": "#2b86c5", "water": True},
    "ice_sheet":      {"fr": "Inlandsis",          "color": "#e8f2f7"},
    "glacier_peak":   {"fr": "Pics glaciaires",    "color": "#cfe0ea"},
    "tundra":         {"fr": "Toundra",            "color": "#9fb8a4"},
    "taiga":          {"fr": "Taïga",              "color": "#3e6b4f"},
    "temperate_forest":{"fr": "Forêt tempérée",    "color": "#3f7d3a"},
    "mixed_forest":   {"fr": "Forêt mixte",        "color": "#57894a"},
    "grassland":      {"fr": "Prairies",           "color": "#8fae4e"},
    "mediterranean":  {"fr": "Garrigue méditerranéenne", "color": "#a8a84f"},
    "savanna":        {"fr": "Savane",             "color": "#c2b45a"},
    "desert":         {"fr": "Désert",             "color": "#e0c98f"},
    "badlands":       {"fr": "Badlands",           "color": "#b07850"},
    "jungle":         {"fr": "Jungle",             "color": "#1f6b33"},
    "swamp":          {"fr": "Marécage",           "color": "#4f6b44"},
    "alpine_meadow":  {"fr": "Prairies alpines",   "color": "#7ba05f"},
    "alpine_rock":    {"fr": "Rocs alpins",        "color": "#8a8a86"},
    "volcanic":       {"fr": "Terres volcaniques", "color": "#5a3038"},
    "magic_glade":    {"fr": "Clairière magique",  "color": "#7fe0c8"},
}
BIOME_LIST = list(BIOMES.keys())


def _distance_to_water(water: np.ndarray, max_iter: int = 220) -> np.ndarray:
    """Distance approx. (BFS par dilations successives) à l'eau, en pixels."""
    res = water.shape[0]
    dist = np.full((res, res), max_iter, dtype=np.float32)
    frontier = water.copy()
    dist[frontier] = 0.0
    for d in range(1, max_iter):
        if not (~water & (dist >= d)).any():
            break
        grow = frontier.copy()
        grow[1:, :] |= frontier[:-1, :]; grow[:-1, :] |= frontier[1:, :]
        grow[:, 1:] |= frontier[:, :-1]; grow[:, :-1] |= frontier[:, 1:]
        new = grow & (dist >= d) & ~water
        dist[new] = d
        frontier = grow & ~water
    return dist


def run_climate_stage(elev_h: np.ndarray, land_h: np.ndarray, water_global: np.ndarray) -> dict:
    res = CLIMATE_RES
    print(f"[Gen3ia] Climats à {res}×{res} (128 m/px)...")
    f_e = elev_h.shape[0] // res
    f_l = land_h.shape[0] // res
    f_w = water_global.shape[0] // res
    e = elev_h.reshape(res, f_e, res, f_e).mean(axis=(1, 3))
    l = land_h.reshape(res, f_l, res, f_l).mean(axis=(1, 3)) > 0.5
    w = water_global.reshape(res, f_w, res, f_w).mean(axis=(1, 3)) > 0.34
    water = w | ~l                                  # rivières + lacs + océan
    px, py, wx, wz = map_coords(res)

    # --- Température normalisée (0 = glacial, 1 = brûlant) ---
    lat = -60.0 + (1.0 - py / res) * 130.0                     # sud -60° -> nord +70°
    temp = 1.0 - np.abs(lat) / 72.0 - e.clip(0, None) / 4200.0
    temp = temp + fbm(wx * 0.00016, wz * 0.00016, 0x4E455101, octaves=4) * 0.10
    temp = temp.clip(0, 1)

    # --- Humidité : distance à l'eau + ombre pluviométrique (vents d'ouest) ---
    dw = _distance_to_water(water)
    dw_n = 1.0 - np.clip(dw / 260.0, 0, 1)                     # portée ~33 km
    # ombre pluviométrique : max d'altitude au vent (±24 px vers l'ouest)
    acc_max = e.copy()
    for s in range(1, 26):
        acc_max[:, s:] = np.maximum(acc_max[:, s:], e[:, :-s])
    shadow = np.clip((acc_max - e) / 1400.0, 0, 1) * 0.55
    moist = (0.16 + dw_n * 0.66
             + fbm(wx * 0.00024 + 11.3, wz * 0.00024 - 7.9, 0x4E455102, octaves=4) * 0.22
             - shadow * 0.9)
    moist = moist.clip(0, 1)

    # --- pente (pour falaises / badlands) ---
    gy, gx = np.gradient(e)
    slope = np.hypot(gx, gy) / 128.0                            # dénivelé/m

    # --- Classification des biomes ---
    r_magic = fbm(wx * 0.00009 + 3.7, wz * 0.00009 - 5.1, 0x4E455103, octaves=3)
    biome = np.empty((res, res), dtype=object)
    biome[:] = "grassland"
    # mers et océans (sous le niveau 0) ; les lacs sont hors `l` (retirés en hydro)
    ocean = (~l) & (e < 0.0)
    lake = (~l) & (e >= 0.0)
    biome[ocean & (e < -900)] = "ocean_deep"
    biome[ocean & (e >= -900) & (e < -180)] = "ocean"
    biome[ocean & (e >= -180)] = "coast"
    biome[lake] = "lake"
    lm = l
    t, m = temp[lm], moist[lm]
    sl = slope[lm]
    alt = e[lm]
    b = np.empty(t.size, dtype=object)
    b[:] = "grassland"
    b = np.where(t < 0.16, "ice_sheet", b)
    b = np.where((t >= 0.16) & (t < 0.30), "tundra", b)
    b = np.where((t >= 0.30) & (t < 0.48), np.where(m > 0.42, "taiga", "tundra"), b)
    b = np.where((t >= 0.48) & (t < 0.72),
                 np.where(m > 0.62, "temperate_forest",
                          np.where(m > 0.34, "mixed_forest", "badlands")), b)
    b = np.where(t >= 0.72,
                 np.where(m > 0.68, "jungle",
                          np.where(m > 0.45, "savanna",
                                   np.where(m > 0.28, "mediterranean", "desert"))), b)
    b = np.where((m > 0.82) & (alt < 60) & (sl < 0.35) & (t > 0.35), "swamp", b)
    b = np.where(alt > 2600, np.where(alt > 3500, "glacier_peak", "alpine_rock"), b)
    b = np.where((alt > 1900) & (alt <= 2600) & (b == "desert"), "badlands", b)
    b = np.where((alt >= 1600) & (alt <= 2600) & (m > 0.4) & (b != "glacier_peak") & (b != "alpine_rock"), "alpine_meadow", b)
    b = np.where((sl > 0.62) & (alt <= 2600), "alpine_rock", b)
    b = np.where((r_magic[lm] > 0.86) & ((b == "temperate_forest") | (b == "jungle") | (b == "mixed_forest")), "magic_glade", b)
    biome[lm] = b

    # volcans -> biome volcanique (rayon 900 m)
    import os, json
    volc_path = os.path.join(wdir(), "volcanoes.json")
    if os.path.exists(volc_path):
        for v in save_load(volc_path)["volcanoes"]:
            vx, vz = v["world"]
            d = np.hypot(wx - vx, wz - vz)
            near = (d < 950) & lm
            b2 = biome.copy()
            b2[near] = "volcanic"
            biome = b2

    # --- stats & sauvegarde ---
    uniq, cnt = np.unique(biome, return_counts=True)
    stats = {str(u): round(float(c) / biome.size, 4) for u, c in zip(uniq, cnt)}
    print("  biomes (fractions) :", {k: v for k, v in sorted(stats.items(), key=lambda x: -x[1])[:8]})
    save_json(wfile("biomes.json"), {
        "biome_table": BIOMES,
        "generation": {"climate_res": res, "latitude_span": [-60, 70],
                       "prevailing_wind": "ouest -> est (ombre pluviométrique activée)",
                       "temperature_model": "gradient latitude - 6.5°C/km d'altitude + bruit",
                       "moisture_model": "distance à l'eau + ombre pluviométrique + bruit"},
        "fractions": stats,
    })
    # cache (downsample dispo pour régions)
    np.save(wfile("cache", "biome.npy"), np.array([BIOME_LIST.index(b) if b in BIOME_LIST else 0 for b in biome.ravel()]).reshape(res, res).astype(np.uint8))
    np.save(wfile("cache", "temp.npy"), temp.astype(np.float32))
    np.save(wfile("cache", "moist.npy"), moist.astype(np.float32))
    return {"biome": biome, "temp": temp, "moist": moist, "res": res}


def save_load(path):
    from .core import load_json
    return load_json(path)
