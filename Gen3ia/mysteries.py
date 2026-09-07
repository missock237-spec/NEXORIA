"""Gen3ia.mysteries — étages 10-12 : civilisations anciennes, ruines, grottes, donjons.

Civilisations (architectures distinctes, utilisées par les générateurs de ruines
et donjons) ; ruines placées dans les coeur historiques de chaque civilisation ;
grottes = graphes 3D (entrée -> tunnels -> chambres -> secrets) avec variantes
(volcanique, glacée, subaquatique, magique) ; donjons = graphes de salles
(entrée -> combat -> puzzle -> mini-boss -> trésor -> boss, sorties alternatives).
"""
from __future__ import annotations
import math
import numpy as np
from .core import (WORLD_SIZE, REGION_SIZE, region_id, rng, sub_seed,
                   make_name, save_json, wfile, load_json, register,
                   world_to_region)

# ---------------------------------------------------------------------------
# CIVILISATIONS ANCIENNES
# ---------------------------------------------------------------------------
CIVILIZATIONS = [
    {"id": "CIV_01", "name": "Empire d'Aetheris", "culture": "aetheris",
     "era": " Premier Âge (-4 200 à -1 900)",
     "architecture": "cités de pierre blanche suspendues, arches flottantes, anneaux gravés",
     "materials": ["marbre blanc", "or froid", "alliage aether"],
     "symbols": ["soleil à huit rais", "spirale ascendante", "œil ouvert"],
     "language": "aetherique — alphabet circulaire, lu de l'intérieur vers l'extérieur",
     "technology": "lévitation par cristaux résonants, aqueducs anti-gravité",
     "religion": "culte des Douze Lumières, ascension promise aux justes",
     "artefacts": ["clés-aether", "cœur d'arche", "miroirs de mémoire"],
     "fall": "la Grande Ascension : les Douze devinrent les premiers Suprêmes — ou disparurent",
     "preferred_biomes": ["grassland", "mediterranean", "temperate_forest", "alpine_meadow"]},
    {"id": "CIV_02", "name": "Clans de Kharn-Dhur", "culture": "kharn",
     "era": "Deuxième Âge (-3 100 à -800)",
     "architecture": "forteresses troglodytes, machines à vapeur, runes carrées incandescentes",
     "materials": ["basalte", "bronze sombre", "pierre chantante"],
     "symbols": ["marteau sur enclume", "carré brisé", "chauve-souris de forge"],
     "language": "kharnide — syllabaire gravé, se frappe sur la pierre pour être lu",
     "technology": "vapeur alchimique, rails de mine auto-porteurs, golems ouvriers",
     "religion": "le Grand Feu Forge-Tout, ancêtres-dans-la-roche",
     "artefacts": ["sceaux de forge", "cœurs de golem", "tables des Clans"],
     "fall": "l'Éboulement Sans Fin — leurs cités profondes ont réveillé quelque chose",
     "preferred_biomes": ["alpine_rock", "taiga", "badlands", "volcanic"]},
    {"id": "CIV_03", "name": "Confrérie du Serpent (Ssil-Vareth)", "culture": "ssil",
     "era": "Deuxième Âge (-2 700 à -400)",
     "architecture": "pyramides à degrés noyées de jungle, pontons de jade, salles d'écho",
     "materials": ["jade", "grès rouge", "écailles dorées"],
     "symbols": ["serpent ondoyant", "croissant noyé", " spirale d'écailles"],
     "language": "ssilvareth — glyphes sifflés, s'écrivent avec des mues de serpent",
     "technology": "chimie de plantes, jets d'eau monumentaux, outils d'obsidienne",
     "religion": "le Serpent-Monde endormi sous la jungle, nourri de souvenirs",
     "artefacts": ["masques de muée", "cloches d'eau", "cartes de sèves"],
     "fall": "la Grande Muée : la civilisation a 'mue' et n'est jamais revenue",
     "preferred_biomes": ["jungle", "swamp", "savanna"]},
    {"id": "CIV_04", "name": "Les Voilés (Orden Voal)", "culture": "voal",
     "era": "Inconnue — antérieure à tous les calendriers",
     "architecture": "monolithes d'obsidienne, portails silencieux, escaliers qui montent des deux côtés",
     "materials": ["obsidienne noire", "verre d'ombre", "os blancs"],
     "symbols": ["œil fermé", "porte entrouverte", "main sans paume"],
     "language": "voalique — non vocal ; se grave dans les rêves des voyageurs",
     "technology": "passerelles dimensionnelles, scellés du vide, horloges de silence",
     "religion": "le Vide Bienveillant — prier pour être oublié par lui",
     "artefacts": ["clefs du seuil", "lanternes d'absence", "fragments de voile"],
     "fall": "aucune chute enregistrée : ils ont simplement cessé d'avoir existé",
     "preferred_biomes": ["__all__"]},
]
RUIN_TYPES = ["temple", "cité ensevelie", "champ d'obélisques", "portail dormant",
              "monolithe", "tombeau royal", "aqueduc brisé", "sanctuaire d'anneaux"]
CAVE_KINDS = ["calcaire", "volcanique", "glacée", "subaquatique", "magique", "ancienne (tailée)", "abysse"]
DUNGEON_THEMES = {
    "CIV_01": "temple aetherien effondré", "CIV_02": "forge-forteresse kharnide",
    "CIV_03": "pyramide ssilvareth", "CIV_04": "seuil du vide voalique",
    "NATURE": "nid de monstres / caverne-monde", "SUPREME": "antre de Suprême",
}


def _snap_h(x, z, terrain_cache):
    from .settlements import _height_at
    return _height_at(x, z, terrain_cache)


def _load_terrain_cache():
    cache = {}
    for rg in load_json(wfile("regions.json"))["regions"]:
        try:
            cache[rg["id"]] = np.load(wfile("cache", "terrain", f"{rg['id']}.npy"))
        except FileNotFoundError:
            pass
    return cache


def run_mysteries_stage():
    print("[Gen3ia] Ruines, grottes, donjons...")
    regions_meta = load_json(wfile("regions.json"))["regions"]
    world_meta = load_json(wfile("world.json"))
    biome_idx = np.load(wfile("cache", "biome.npy"))
    from .climate import BIOME_LIST
    biome_map = np.array(BIOME_LIST, dtype=object)[biome_idx]
    res = biome_map.shape[0]
    land = np.load(wfile("cache", "land_hydro.npy"))
    l5 = land.reshape(res, land.shape[0] // res, res, land.shape[0] // res).mean(axis=(1, 3)) > 0.5
    terrain_cache = _load_terrain_cache()

    # ---------------- RUINES ----------------
    ruins = []
    for civ in CIVILIZATIONS:
        r = rng("ruins", civ["id"])
        pref = civ["preferred_biomes"]
        ok = l5.copy()
        if "__all__" not in pref:
            ok &= np.isin(biome_map, pref)
        cand = np.argwhere(ok)
        if cand.size == 0:
            cand = np.argwhere(l5)
        r.shuffle(cand)
        n_ruins = int(r.integers(11, 15))
        picked = []
        for cy, cx in cand:
            if all((cy - p[0]) ** 2 + (cx - p[1]) ** 2 > 22 ** 2 for p in picked):
                picked.append((cy, cx))
            if len(picked) >= n_ruins:
                break
        for k, (cy, cx) in enumerate(picked):
            x = (cx + 0.5) / res * WORLD_SIZE - WORLD_SIZE / 2
            z = (1.0 - (cy + 0.5) / res) * WORLD_SIZE - WORLD_SIZE / 2
            gx, gy = world_to_region(x, z)
            rid_r = region_id(gx, gy)
            h = _snap_h(x, z, terrain_cache)
            rtype = str(r.choice(RUIN_TYPES))
            has_secret = bool(r.random() < 0.42)
            sup_hint = bool(r.random() < 0.30)   # indice sur un Suprême
            ruins.append({
                "id": f"RUIN_{len(ruins)+1:03d}",
                "name": f"{rtype.capitalize()} {make_name(civ['culture'], 1, f'r{len(ruins)}')}",
                "type": rtype, "civilization": civ["id"],
                "world": [round(x, 1), round(z, 1), round(h, 1)],
                "region": rid_r,
                "extent_m": round(float(r.uniform(40, 260)), 0),
                "state": str(r.choice(["ruiné", "enseveli", "semi-intact", "inondé", "hanté"])),
                "has_secret": has_secret, "supreme_hint": sup_hint,
                "lore": str(r.choice([
                    "Les pierres chantent encore à l'aube.",
                    "Des glyphes interdits pulsent faiblement sous la mousse.",
                    "Un autel vide attend une offrande depuis des millénaires.",
                    "Les archères pointent vers le ciel — contre quoi se défendaient-ils ?",
                    "Chaque pleine lune, les oiseaux refusent de s'en approcher.",
                ])),
                "seed": sub_seed("ruin", len(ruins)),
            })
            register(ruins[-1]["id"], "ruin", {"name": ruins[-1]["name"], "civ": civ["id"], "region": rid_r})
    print(f"  ruines : {len(ruins)}")

    # ---------------- GROTTES ----------------
    caves = []
    for i in range(78):
        r = rng("caves", i)
        cy, cx = [int(v) for v in r.integers(24, res - 24, 2)]
        tries = 0
        while not l5[cy, cx] and tries < 24:
            cy, cx = [int(v) for v in r.integers(24, res - 24, 2)]
            tries += 1
        if not l5[cy, cx]:
            continue
        x = (cx + 0.5) / res * WORLD_SIZE - WORLD_SIZE / 2
        z = (1.0 - (cy + 0.5) / res) * WORLD_SIZE - WORLD_SIZE / 2
        gx, gy = world_to_region(x, z)
        rid_r = region_id(gx, gy)
        h = _snap_h(x, z, terrain_cache)
        kind = str(r.choice(CAVE_KINDS))
        size_class = str(r.choice(["petite", "moyenne", "vaste", "gigantesque"]))
        depth = {"petite": (12, 60), "moyenne": (40, 160), "vaste": (120, 420),
                 "gigantesque": (300, 1100)}[size_class]
        dmax = float(r.uniform(*depth))
        # graphe : entrée -> tunnel -> embranchement -> salle -> ... -> secret/boss/trésor -> sortie secondaire
        nodes, edges = [], []
        n_ch = int(np.clip(dmax / 55 + r.integers(2, 5), 3, 14))
        ang = 0.0
        px, py, pz = 0.0, 0.0, 0.0
        nodes.append({"n": 0, "type": "entrée", "local": [0, 0, 0]})
        for k in range(1, n_ch + 1):
            ang += float(r.uniform(0.4, 1.9))
            step = float(r.uniform(45, 130))
            px += math.cos(ang) * step
            py += math.sin(ang) * step
            pz -= float(r.uniform(6, max(9, dmax / n_ch)))
            ntype = "salle"
            if k == n_ch:
                ntype = str(r.choice(["antre de boss", "trésor", "secret"]))
            elif r.random() < 0.18:
                ntype = str(r.choice(["rivière souterraine", "zone dangereuse", "chambre de cristaux", "embranchement"]))
            nodes.append({"n": k, "type": ntype, "local": [round(px, 1), round(py, 1), round(pz, 1)]})
            edges.append({"from": k - 1, "to": k, "length_m": round(step, 1),
                          "width_m": round(float(r.uniform(2.5, 12)), 1),
                          "hazard": str(r.choice(["aucun", "éboulements", "chauves-souris agressives", "gaz", "aucun"]))})
        exits = [{"type": "principale", "node": 0}]
        if r.random() < 0.45:
            exits.append({"type": "secondaire cachée", "node": n_ch})
        caves.append({
            "id": f"CAVE_{len(caves)+1:03d}",
            "name": f"Grottes de {make_name(['kharn', 'ssil', 'commun'][i % 3], 1, f'c{i}')}",
            "kind": kind, "size_class": size_class, "depth_m": round(dmax, 0),
            "world_entrance": [round(x, 1), round(z, 1), round(h, 1)], "region": rid_r,
            "hidden": bool(r.random() < 0.35),
            "inhabited": str(r.choice(["loups-crans", "araignées tisseuses", "rien — encore", "murlocs", "golems dormants"])),
            "resources": str(r.choice(["cristaux", "fer", "champignons", "eau pure", "gemmes"])),
            "nodes": nodes, "edges": edges, "exits": exits,
            "seed": sub_seed("cave", i),
        })
        register(caves[-1]["id"], "cave", {"name": caves[-1]["name"], "kind": kind, "region": rid_r})
    print(f"  grottes : {len(caves)}")

    # ---------------- DONJONS ----------------
    dungeons = []
    n_target = 30
    for i in range(n_target):
        r = rng("dungeon", i)
        cy, cx = [int(v) for v in r.integers(24, res - 24, 2)]
        tries = 0
        while not l5[cy, cx] and tries < 24:
            cy, cx = [int(v) for v in r.integers(24, res - 24, 2)]
            tries += 1
        if not l5[cy, cx]:
            continue
        x = (cx + 0.5) / res * WORLD_SIZE - WORLD_SIZE / 2
        z = (1.0 - (cy + 0.5) / res) * WORLD_SIZE - WORLD_SIZE / 2
        gx, gy = world_to_region(x, z)
        rid_r = region_id(gx, gy)
        h = _snap_h(x, z, terrain_cache)
        civ = str(r.choice(["CIV_01", "CIV_02", "CIV_03", "CIV_04", "NATURE"]))
        theme = DUNGEON_THEMES[civ]
        level = int(np.clip(1 + i * 10 / n_target + r.integers(-1, 2), 1, 10))
        n_combat = int(np.clip(level, 2, 6))
        rooms = [{"id": 0, "type": "entrée", "size_m": [18, 18]}]
        rid_n = 1
        for _c in range(n_combat):
            rooms.append({"id": rid_n, "type": "salle de combat", "size_m": [int(r.integers(14, 30)), int(r.integers(14, 28))],
                          "mobs": f"palier {level}"})
            rid_n += 1
        rooms.append({"id": rid_n, "type": "salle de puzzle", "size_m": [20, 20],
                      "puzzle": str(r.choice(["dalles pondérées", "miroirs de lumière", "siphon d'eau", "énigme de glyphes", "échos à répéter"]))})
        rid_n += 1
        rooms.append({"id": rid_n, "type": "mini-boss", "size_m": [24, 24]})
        rid_n += 1
        rooms.append({"id": rid_n, "type": "trésor", "size_m": [14, 14],
                      "loot": str(r.choice(["arme de qualité", "relique civilisationnelle", "plans de recette", "coffre scellé"]))})
        rid_n += 1
        rooms.append({"id": rid_n, "type": "boss", "size_m": [34, 34]})
        boss_room = rid_n
        rid_n += 1
        rooms.append({"id": rid_n, "type": "sortie alternative", "size_m": [12, 12]})
        alt_exit = rid_n
        corridors = [{"from": rooms[k]["id"], "to": rooms[k + 1]["id"],
                      "traps": str(r.choice(["aucun", "lames murales", "dalle-piège", "fléaux oscillants"]))}
                     for k in range(len(rooms) - 1)]
        dungeons.append({
            "id": f"DUNG_{len(dungeons)+1:03d}",
            "name": f"{make_name(['aetheris', 'kharn', 'ssil', 'voal', 'commun'][i % 5], 2, f'd{i}')}",
            "theme": theme, "civilization": civ, "recommended_level": level,
            "world_entrance": [round(x, 1), round(z, 1), round(h, 1)], "region": rid_r,
            "rooms": rooms, "corridors": corridors, "boss_room": boss_room,
            "alternative_exit": bool(r.random() < 0.7), "alt_exit_room": alt_exit,
            "world_event_sensitive": bool(r.random() < 0.3),
            "secret_rooms": int(r.integers(0, 3)),
            "seed": sub_seed("dungeon", i),
        })
        register(dungeons[-1]["id"], "dungeon", {"name": dungeons[-1]["name"], "level": level, "region": rid_r})
    print(f"  donjons : {len(dungeons)}")

    save_json(wfile("civilizations.json"), {"civilizations": CIVILIZATIONS})
    save_json(wfile("ruins.json"), {"ruins": ruins}, compact=True)
    save_json(wfile("caves.json"), {"caves": caves}, compact=True)
    save_json(wfile("dungeons.json"), {"dungeons": dungeons}, compact=True)
    return {"ruins": ruins, "caves": caves, "dungeons": dungeons}
