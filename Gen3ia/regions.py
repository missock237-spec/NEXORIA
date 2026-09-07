"""Gen3ia.regions — étages 4-5 : les 256 régions du monde (grille 16×16).

Pour chaque région : biome dominant, statistiques d'altitude/relief, nom
procédural selon la culture du continent, niveau de danger recommandé,
ressources, familles de monstres, connexions avec les régions voisines,
climat (température/humidité moyennes), drapeaux (côtier, océanique).
Sortie : WorldData/regions.json (REGION_DATABASE).
"""
from __future__ import annotations
import numpy as np
from .core import (WORLD_SIZE, REGIONS_PER_AXIS, region_id, region_index,
                   region_center, region_bounds, make_place_name, make_name,
                   rng, save_json, wfile, load_json, register)
from .noise import bilinear_sample  # noqa: F401
from .climate import BIOME_LIST

RESOURCES_BY_BIOME = {
    "ice_sheet": ["fourrures", "cristaux de givre"], "glacier_peak": ["cristaux de givre", "gemmes d'altitude"],
    "tundra": ["fourrures", "tourbe", "fer"], "taiga": ["bois d'épicéa", "fourrures", "ambre", "fer"],
    "temperate_forest": ["bois de chêne", "champignons", "cuir", "herbes médicinales"],
    "mixed_forest": ["bois", "champignons", "cuir", "miel"],
    "grassland": ["blé", "lin", "bétail", "argile"], "mediterranean": ["olives", "vin", "cuir", "sel"],
    "savanna": ["ivoire", "bétail", "herbes sèches"], "desert": ["sel", "verre", "or", "soie du désert"],
    "badlands": ["fer rouge", "obsidienne", "soufre"], "jungle": ["bois précieux", "plantes rares", "jade", "épices"],
    "swamp": ["tourbe", "sangsues-médicinales", "champignons lumineux"], "alpine_meadow": ["laine d'altitude", "herbes médicinales"],
    "alpine_rock": ["pierre de taille", "minerais", "gemmes"], "volcanic": ["obsidienne", "soufre", "cœur de lave"],
    "magic_glade": ["essences magiques", "cristaux d'âme"], "ocean": ["poissons", "perles"],
    "ocean_deep": ["perles noires", "coraux"], "coast": ["poissons", "sel", "coraux"],
    "lake": ["poissons d'eau douce", "roseaux"],
}
MONSTERS_BY_BIOME = {
    "ice_sheet": ["loups des glaces", "élémentaires de givre"], "glacier_peak": ["wyvernes alpines", "élémentaires de givre"],
    "tundra": ["ours des neiges", "morts-vivants gelés"], "taiga": ["loups", "araignées géantes"],
    "temperate_forest": ["sangliers d'ombre", "bandits", "esprits sylvestres"],
    "mixed_forest": ["loups", "bandits", "treants"], "grassland": ["gnous sauvages", "pillards", "chimères"],
    "mediterranean": ["harpyies", "pillards"], "savanna": ["lionnes-rampantes", "pillards", "élémentaires de terre"],
    "desert": ["scorpions géants", "momies", "ver des sables"], "badlands": ["golems de pierre", "dragons mineurs"],
    "jungle": ["serpents constrictors", "insectes-essaims", "nagas"], "swamp": ["crocodiles géants", "spectres des marais"],
    "alpine_meadow": ["aigles géants", "bergers farouches"], "alpine_rock": ["harpyies", "golems", "griffons"],
    "volcanic": ["élémentaires de feu", "magma-bêtes"], "magic_glade": ["esprits arcadiens", "wispillons"],
    "ocean": ["requins prédateurs", "sirènes hostiles"], "ocean_deep": ["krakens mineurs", "aberrations abyssales"],
    "coast": ["crabes géants", "sahuagins"], "lake": ["serpents d'eau", "kelpies"],
}
HARSH = {"desert": 2, "badlands": 2, "volcanic": 3, "ice_sheet": 3, "glacier_peak": 3,
         "alpine_rock": 2, "tundra": 1, "swamp": 2, "jungle": 1, "ocean_deep": 2}
CULTURES = ["commun", "aetheris", "kharn", "ssil", "voal"]


def _region_of_maps(res: int, factor: int):
    """Retourne les tranches (gy, gx) par région à partir des cartes 512."""
    return None  # (documentation : utilisé implicitement via reshape ci-dessous)


def run_regions_stage() -> dict:
    print("[Gen3ia] Régions (16×16 = 256)...")
    res = 512
    f = res // REGIONS_PER_AXIS  # 32 px par région à 512 (128 m/px)
    elev = np.load(wfile("cache", "elev_hydro.npy"))
    land = np.load(wfile("cache", "land_hydro.npy"))
    biome_idx = np.load(wfile("cache", "biome.npy"))
    temp = np.load(wfile("cache", "temp.npy"))
    moist = np.load(wfile("cache", "moist.npy"))
    biome_map = np.array(BIOME_LIST, dtype=object)[biome_idx]
    # altitudes à la résolution 512
    e5 = elev.reshape(res, elev.shape[0] // res, res, elev.shape[0] // res).mean(axis=(1, 3))
    l5 = land.reshape(res, land.shape[0] // res, res, land.shape[0] // res).mean(axis=(1, 3)) > 0.5

    world_meta = load_json(wfile("world.json"))
    region_cont = world_meta["region_to_continent"]
    cont_culture = {c["id"]: CULTURES[i % len(CULTURES)] for i, c in enumerate(world_meta["continents"])}

    regions = []
    for gy in range(REGIONS_PER_AXIS):
        for gx in range(REGIONS_PER_AXIS):
            ys, ye = gy * f, (gy + 1) * f
            xs, xe = gx * f, (gx + 1) * f
            bm = biome_map[ys:ye, xs:xe].ravel()
            uniq, cnt = np.unique(bm, return_counts=True)
            order = np.argsort(-cnt)
            dom = str(uniq[order[0]])
            land_frac = float(l5[ys:ye, xs:xe].mean())
            alt = e5[ys:ye, xs:xe]
            rid = region_id(gx, gy)
            cx, cz = region_center(gx, gy)
            cont = region_cont.get(rid)
            culture = cont_culture.get(cont, "commun")
            r = rng("region", rid)
            if land_frac < 0.04:
                name = f"Étendue de {make_name(culture, 1, rid)}"
                kind = "ocean"
            else:
                name = make_place_name(culture, "region", rid)
                kind = "coastal" if 0.04 <= land_frac < 0.55 else "land"
            harsh = HARSH.get(dom, 0)
            dist_c = np.hypot(cx, cz) / WORLD_SIZE
            tier = int(np.clip(1 + round(harsh * 1.4 + dist_c * 4 + r.random() * 1.2), 1, 10))
            res_list = list(dict.fromkeys(RESOURCES_BY_BIOME.get(dom, ["inconnu"])))
            if harsh >= 2:
                res_list += [str(r.choice(["gemmes rares", "cristaux", "minerais profonds"]))]
            regions.append({
                "id": rid, "index": region_index(gx, gy), "name": name, "kind": kind,
                "grid": [gx, gy],
                "bounds_world": list(region_bounds(gx, gy)),
                "center_world": [round(cx, 1), round(cz, 1)],
                "continent": cont,
                "dominant_biome": dom, "biome_fractions": {str(u): round(float(c / bm.size), 3)
                                                           for u, c in zip(uniq[order[:4]], cnt[order[:4]])},
                "land_fraction": round(land_frac, 3),
                "altitude": {"min_m": round(float(alt.min()), 1), "max_m": round(float(alt.max()), 1),
                             "mean_m": round(float(alt.mean()), 1)},
                "climate": {"temp": round(float(temp[ys:ye, xs:xe].mean()), 2),
                            "moist": round(float(moist[ys:ye, xs:xe].mean()), 2)},
                "recommended_level": tier,
                "resources": res_list,
                "monsters": list(np.array(MONSTERS_BY_BIOME.get(dom, ["inconnu"]))[
                    np.argsort(rng("monsters", rid).random(len(MONSTERS_BY_BIOME.get(dom, ["inconnu"]))))][:4]),
                "dangers": ([str(r.choice(["avalanches", "bêtes prédatrices", "climat extrême",
                                           "ruines instables", "aura corrompue (à confirmer)"]))] if harsh >= 1 else ["faune sauvage"]),
                "connections": [],  # rempli plus bas
                "npc_potential": (dom in ("grassland", "mediterranean", "temperate_forest", "mixed_forest",
                                          "coast", "savanna", "taiga") and land_frac > 0.3),
            })
    # connexions : voisins 8-connexes partageant des terres
    by_grid = {tuple(rg["grid"]): rg for rg in regions}
    for rg in regions:
        gx, gy = rg["grid"]
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dx == 0 and dy == 0:
                    continue
                nb = by_grid.get((gx + dx, gy + dy))
                if nb and rg["land_fraction"] > 0.04 and nb["land_fraction"] > 0.04:
                    rg["connections"].append({"id": nb["id"], "name": nb["name"],
                                              "type": "terrestre" if min(rg["land_fraction"], nb["land_fraction"]) > 0.5 else "côtier"})
    save_json(wfile("regions.json"), {"regions": regions})
    for rg in regions:
        register(rg["id"], "region", {"name": rg["name"], "biome": rg["dominant_biome"],
                                      "level": rg["recommended_level"]})
    n_land = sum(1 for rg in regions if rg["land_fraction"] >= 0.04)
    print(f"  {n_land} régions terrestres/côtières, {len(regions)-n_land} océaniques")
    return {"regions": regions}
