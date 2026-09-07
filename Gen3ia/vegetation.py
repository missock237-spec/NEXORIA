"""Gen3ia.vegetation — étage 8 : forêts et végétation.

Approche data-driven (compatible instancing GPU Unity et budgets Android) :
  - catalogue d'espèces (densité au m², échelles, variantes, biomes autorisés)
  - par région : carte de densité 32×32 (0..255) par grande famille,
    + recette par biome (le runtime échantillonne déterministement)
  - spécimens remarquables (arbres-monument, formations rocheuses) -> POI
La génération runtime utilise la même seed par chunk (déterministe).
"""
from __future__ import annotations
import numpy as np
from .core import (REGION_SIZE, region_id, rng, sub_seed, save_json, wfile,
                   load_json, register)
from .noise import fbm

SPECIES = {
    "tree_oak":      {"fr": "Chêne",            "biomes": ["temperate_forest", "mixed_forest"], "density_m2": 0.006, "h_m": [8, 18], "lod_tris": [420, 180, 40]},
    "tree_pine":     {"fr": "Pin sylvestre",    "biomes": ["taiga", "mixed_forest", "alpine_meadow"], "density_m2": 0.008, "h_m": [10, 22], "lod_tris": [380, 160, 36]},
    "tree_spruce":   {"fr": "Épicéa noir",      "biomes": ["taiga", "tundra"], "density_m2": 0.005, "h_m": [9, 20], "lod_tris": [360, 150, 34]},
    "tree_palm":     {"fr": "Palmier",          "biomes": ["savanna", "mediterranean", "coast"], "density_m2": 0.002, "h_m": [6, 12], "lod_tris": [340, 140, 30]},
    "tree_banyan":   {"fr": "Banyan-jungle",    "biomes": ["jungle"], "density_m2": 0.010, "h_m": [12, 30], "lod_tris": [900, 320, 60]},
    "tree_dead":     {"fr": "Arbre mort",       "biomes": ["swamp", "badlands", "tundra"], "density_m2": 0.003, "h_m": [5, 12], "lod_tris": [240, 100, 24]},
    "tree_magic":    {"fr": "Arbre luminescent","biomes": ["magic_glade", "jungle"], "density_m2": 0.004, "h_m": [10, 26], "lod_tris": [760, 300, 56]},
    "bush_common":   {"fr": "Buisson",          "biomes": ["temperate_forest", "mixed_forest", "grassland", "savanna"], "density_m2": 0.02, "h_m": [0.8, 2.2], "lod_tris": [90, 40, 12]},
    "grass_tuft":    {"fr": "Touffe d'herbe",   "biomes": ["grassland", "savanna", "temperate_forest", "alpine_meadow"], "density_m2": 0.30, "h_m": [0.3, 0.9], "lod_tris": [24, 12, 6]},
    "flower_patch":  {"fr": "Fleurs",           "biomes": ["grassland", "alpine_meadow", "magic_glade"], "density_m2": 0.06, "h_m": [0.2, 0.5], "lod_tris": [20, 10, 6]},
    "mushroom":      {"fr": "Champignon",       "biomes": ["temperate_forest", "swamp", "jungle", "taiga"], "density_m2": 0.01, "h_m": [0.2, 0.8], "lod_tris": [40, 18, 8]},
    "cactus":        {"fr": "Cactus barbelé",   "biomes": ["desert", "badlands"], "density_m2": 0.002, "h_m": [1.5, 4], "lod_tris": [140, 60, 16]},
    "rock_small":    {"fr": "Rocher",           "biomes": ["__all_land__"], "density_m2": 0.004, "h_m": [0.5, 3], "lod_tris": [120, 60, 20]},
    "rock_peak":     {"fr": "Bloc d'altitude",  "biomes": ["alpine_rock", "alpine_meadow", "glacier_peak", "volcanic"], "density_m2": 0.006, "h_m": [2, 8], "lod_tris": [260, 110, 30]},
    "reed":          {"fr": "Roseaux",          "biomes": ["swamp", "lake"], "density_m2": 0.08, "h_m": [1, 2.4], "lod_tris": [28, 14, 8]},
}
FAMILY = {  # regroupement pour les cartes de densité
    "trees": ["tree_oak", "tree_pine", "tree_spruce", "tree_palm", "tree_banyan", "tree_dead", "tree_magic"],
    "bushes": ["bush_common", "cactus", "reed"],
    "grass": ["grass_tuft", "flower_patch", "mushroom"],
    "rocks": ["rock_small", "rock_peak"],
}
DENSITY_BY_BIOME = {   # multiplicateur de densité global du biome
    "temperate_forest": 1.0, "mixed_forest": 0.9, "taiga": 0.95, "jungle": 1.15,
    "magic_glade": 0.9, "swamp": 0.8, "alpine_meadow": 0.6, "grassland": 0.5,
    "savanna": 0.45, "mediterranean": 0.5, "tundra": 0.25, "taiga_x": 0.9,
    "badlands": 0.2, "desert": 0.08, "alpine_rock": 0.15, "glacier_peak": 0.05,
    "ice_sheet": 0.02, "volcanic": 0.1, "coast": 0.3, "lake": 0.4, "ocean": 0.0, "ocean_deep": 0.0,
}


def run_vegetation_stage():
    print("[Gen3ia] Végétation (recettes + cartes de densité 32×32)...")
    regions_meta = load_json(wfile("regions.json"))["regions"]
    n = 0
    for rg in regions_meta:
        if rg["land_fraction"] < 0.04:
            continue
        rid = rg["id"]
        gx, gy = rg["grid"]
        r = rng("vegetation", rid)
        dom = rg["dominant_biome"]
        mult = DENSITY_BY_BIOME.get(dom, 0.5)
        # carte de densité 32×32 : bruit + multiplicateur biome
        gyv, gxv = np.meshgrid(np.arange(32) * 0.21 + 0.7, np.arange(32) * 0.21 - 0.3)
        d = fbm(gxv, gyv, sub_seed("vegmap", rid), octaves=3) * 0.5 + 0.5
        d = np.clip(d * (0.45 + mult), 0, 1)
        # espèces autorisées pour le biome dominant (+ 1 biome voisin probable)
        allowed = [s for s, v in SPECIES.items()
                   if dom in v["biomes"] or "__all_land__" in v["biomes"]]
        mix = {s: round(float(r.random()), 2) for s in allowed}
        # spécimens remarquables (≤ 30) : grands arbres / rochers monumentaux
        n_spec = int(np.clip(rg["land_fraction"] * 26 * r.random() + 4, 4, 30))
        specimens = []
        for i in range(n_spec):
            lx = float(r.random()) * REGION_SIZE
            lz = float(r.random()) * REGION_SIZE
            specimens.append({
                "local_m": [round(lx, 1), round(lz, 1)],
                "world_hint": [round(gx * REGION_SIZE - 32768 + lx, 1),
                               round(gy * REGION_SIZE - 32768 + lz, 1)],
                "kind": str(r.choice(["arbre-monument", "rocher-équilibré", "souche colossale",
                                      "arbre-créature", "rangée de pierres dressées"])),
                "species": str(r.choice(allowed)) if allowed else "rock_peak",
                "height_m": round(float(r.uniform(18, 42)), 1),
                "seed": sub_seed("specimen", rid, i),
            })
        save_json(wfile("vegetation", f"{rid}.json"), {
            "region": rid, "dominant_biome": dom, "density_multiplier": mult,
            "density_map_32": np.round(d * 255).astype(int).tolist(),
            "species_mix": mix, "runtime": "échantillonnage déterministe par chunk (même seed Gen3ia)",
            "specimens": specimens,
        }, compact=True)
        n += 1
    save_json(wfile("vegetation.json"), {"species": SPECIES, "family": FAMILY,
                                         "density_by_biome": DENSITY_BY_BIOME})
    print(f"  {n} régions terrestres traitées, {len(SPECIES)} espèces au catalogue")
    return {"regions": n}
