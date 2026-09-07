"""Gen3ia.poi — étage 14 : points d'intérêt et secrets.

Règles de placement intelligentes (pas d'aléatoire absurde) :
  cascade = fleuve + forte pente ; source chaude = zone volcanique ;
  mine = montagne ; épave = côte ; camp de bandits = biais des routes ;
  arbre-monde = 5 monuments uniques ; autels/portails = proches des ruines ;
  ponts = croisement route/fleuve. Hauteurs snapées sur les terrains réels.
"""
from __future__ import annotations
import math
import numpy as np
from .core import (WORLD_SIZE, region_id, rng, sub_seed, make_name,
                   save_json, wfile, load_json, register, world_to_region)
from .noise import bilinear_sample
from .mysteries import _load_terrain_cache, _snap_h


def run_poi_stage():
    print("[Gen3ia] Points d'intérêt...")
    regions_meta = load_json(wfile("regions.json"))["regions"]
    biome_idx = np.load(wfile("cache", "biome.npy"))
    from .climate import BIOME_LIST
    biome_map = np.array(BIOME_LIST, dtype=object)[biome_idx]
    res = biome_map.shape[0]
    land = np.load(wfile("cache", "land_hydro.npy"))
    l5 = land.reshape(res, land.shape[0] // res, res, land.shape[0] // res).mean(axis=(1, 3)) > 0.5
    elev = np.load(wfile("cache", "elev_hydro.npy"))
    e5 = elev.reshape(res, elev.shape[0] // res, elev.shape[0] // 512 if False else res, elev.shape[0] // res).mean(axis=(1, 3)) if False else None
    e5 = elev.reshape(res, elev.shape[0] // res, res, elev.shape[0] // res).mean(axis=(1, 3))
    g5z, g5x = np.gradient(e5)
    slope5 = np.hypot(g5x, g5z) / 128.0
    terrain_cache = _load_terrain_cache()
    rivers = load_json(wfile("rivers.json"))["rivers"]
    volcanoes = load_json(wfile("volcanoes.json"))["volcanoes"]
    ruins = load_json(wfile("ruins.json"))["ruins"]
    routes = load_json(wfile("routes.json"))["routes"]
    supremes = load_json(wfile("supremes.json"))["supremes"]
    settlements = load_json(wfile("settlements.json"))["settlements"]

    poi = []

    def add(kind, name, x, z, biome, extra=None, hidden=False, loot=None):
        gx, gy = world_to_region(x, z)
        rid_r = region_id(gx, gy)
        h = _snap_h(x, z, terrain_cache)
        poi.append({
            "id": f"POI_{len(poi)+1:03d}", "type": kind, "name": name,
            "world": [round(x, 1), round(z, 1), round(h, 1)], "region": rid_r,
            "biome": biome, "hidden_secret": bool(hidden), "loot_hint": loot,
            "supreme_exposure": round(max((max(0.0, 1.0 - math.hypot(x - s["lair_world"][0],
                                                                 z - s["lair_world"][1]) / (s["territory_radius_m"] * 2.2))
                                            for s in supremes), default=0.0), 2),
            "seed": sub_seed("poi", len(poi)), **(extra or {}),
        })

    r_world = rng("poi", "global")
    # 1) cascades : fleuves + pente
    n_wf = 0
    for rv in rivers:
        pts = rv["points_xyz"]
        for i in range(2, len(pts) - 2, max(1, len(pts) // 8)):
            x, z = pts[i][0], pts[i][1]
            gx, gy = world_to_region(x, z)
            b = biome_map[min(int((1 - (z + WORLD_SIZE / 2) / WORLD_SIZE) * res), res - 1),
                          min(int((x + WORLD_SIZE / 2) / WORLD_SIZE * res), res - 1)]
            if slope5[min(int((1 - (z + WORLD_SIZE / 2) / WORLD_SIZE) * res), res - 1),
                      min(int((x + WORLD_SIZE / 2) / WORLD_SIZE * res), res - 1)] > 0.22 and n_wf < 26:
                add("cascade", f"Cascade {make_name('commun', 1, f'wf{n_wf}')}", x, z, str(b),
                    {"water_source": rv["id"]})
                n_wf += 1
    # 2) sources chaudes près des volcans
    for v in volcanoes:
        for k in range(int(r_world.integers(1, 3))):
            ang = float(r_world.random()) * 2 * math.pi
            d = float(r_world.uniform(600, 1600))
            add("source chaude", f"Source de {make_name('kharn', 1, f'hs{v['id']}')}",
                v["world"][0] + math.cos(ang) * d, v["world"][1] + math.sin(ang) * d, "volcanic",
                {"volcano": v["id"]})
    # 3) mines en montagne
    ok_mine = l5 & np.isin(biome_map, ["alpine_rock", "badlands", "volcanic", "taiga", "alpine_meadow"])
    cand = np.argwhere(ok_mine)
    r_world.shuffle(cand)
    n_mine = 0
    for cy, cx in cand:
        if n_mine >= 24:
            break
        if slope5[cy, cx] > 0.55:
            continue
        x = (cx + 0.5) / res * WORLD_SIZE - WORLD_SIZE / 2
        z = (1.0 - (cy + 0.5) / res) * WORLD_SIZE - WORLD_SIZE / 2
        add("mine", f"Mine de {make_name('kharn', 1, f'm{n_mine}')}", x, z, str(biome_map[cy, cx]),
            {"resource": str(r_world.choice(["fer", "cuivre", "argent", "gemmes", "charbon"]))})
        n_mine += 1
    # 4) épaves sur les côtes
    ok_wreck = ~l5 & (biome_map == "coast") & (e5 > -60)
    cand = np.argwhere(ok_wreck)
    r_world.shuffle(cand)
    for cy, cx in cand[:16]:
        x = (cx + 0.5) / res * WORLD_SIZE - WORLD_SIZE / 2
        z = (1.0 - (cy + 0.5) / res) * WORLD_SIZE - WORLD_SIZE / 2
        add("épave", f"Épave du {make_name('commun', 2, f'w{cx}')}", x, z, "coast",
            hidden=bool(r_world.random() < 0.5), loot="cargaison scellée")
    # 5) camps de bandits le long des routes (biais)
    for rt in routes[::3]:
        pts = rt["points"]
        p = pts[int(r_world.integers(1, len(pts) - 1))]
        off = 180.0
        ang = float(r_world.random()) * 2 * math.pi
        x, z = p[0] + math.cos(ang) * off, p[1] + math.sin(ang) * off
        add("camp de bandits", f"Camp {make_name('commun', 1, f'b{rt['id']}')}", x, z,
            "proche route", {"route": rt["id"]})
    # 6) autels et portails proches des ruines (civilisations)
    for ru in ruins[::2]:
        ang = float(r_world.random()) * 2 * math.pi
        d = float(r_world.uniform(120, 500))
        kind = "portail dormant" if ru["civilization"] == "CIV_04" else "autel ancien"
        add(kind, f"{kind.capitalize()} de {make_name('voal' if ru['civilization'] == 'CIV_04' else 'aetheris', 1, f'a{ru['id']}')}",
            ru["world"][0] + math.cos(ang) * d, ru["world"][1] + math.sin(ang) * d,
            "proche ruine", {"linked_ruin": ru["id"]}, hidden=bool(r_world.random() < 0.35))
    # 7) Arbres-Monde (5 monuments uniques)
    ok_forest = l5 & np.isin(biome_map, ["jungle", "temperate_forest", "taiga", "magic_glade"])
    cand = np.argwhere(ok_forest)
    r_world.shuffle(cand)
    step = max(1, len(cand) // 5)
    for k, (cy, cx) in enumerate(cand[::step][:5]):
        x = (cx + 0.5) / res * WORLD_SIZE - WORLD_SIZE / 2
        z = (1.0 - (cy + 0.5) / res) * WORLD_SIZE - WORLD_SIZE / 2
        add("arbre-monde", f"Arbre-Monde {make_name('ssil' if k % 2 else 'aetheris', 2, f'wt{k}')}",
            x, z, str(biome_map[cy, cx]),
            {"height_m": round(float(r_world.uniform(180, 420)), 0),
             "lore": "Un monstre ancien dort dans ses racines ; sa canopée est un écosystème."},
            loot="écorce-lumière")
    # 8) tours de guet aux carrefours (établissements en bord de route)
    for s in settlements:
        if s["size_class"] == "village" and r_world.random() < 0.3:
            add("tour de guet", f"Tour {make_name(s['culture'], 1, f'w{s['id']}')}",
                s["world"][0] + float(r_world.uniform(-400, 400)),
                s["world"][1] + float(r_world.uniform(-400, 400)), "proche village",
                {"linked_settlement": s["id"]})
    # 9) sanctuaires cachés (secrets purs)
    ok_land = l5 & (slope5 < 0.4)
    cand = np.argwhere(ok_land)
    r_world.shuffle(cand)
    for cy, cx in cand[::max(1, len(cand) // 30)][:30]:
        x = (cx + 0.5) / res * WORLD_SIZE - WORLD_SIZE / 2
        z = (1.0 - (cy + 0.5) / res) * WORLD_SIZE - WORLD_SIZE / 2
        add("sanctuaire caché", f"Sanctuaire {make_name('voal', 1, f'sh{cy}')}", x, z,
            str(biome_map[cy, cx]), hidden=True,
            loot=str(r_world.choice(["fragment de voile", "clef du seuil", "cœur de golem",
                                     "masque de muée", "clé-aether"])))
    save_json(wfile("poi.json"), {"poi": poi}, compact=True)
    kinds = {}
    for p in poi:
        kinds[p["type"]] = kinds.get(p["type"], 0) + 1
    n_hidden = sum(1 for p in poi if p["hidden_secret"])
    print(f"  {len(poi)} POI ({kinds}) — {n_hidden} secrets cachés")
    for p in poi:
        register(p["id"], "poi", {"type": p["type"], "name": p["name"], "region": p["region"]})
    return {"poi": poi}
