"""Gen3ia.supremes — étage 13 : les 10 Suprêmes et leurs territoires.

Chaque Suprême possède un territoire reconnaissable AVANT la rencontre :
corruption progressive (climat, lumière, végétation, monstres, musique,
architecture, météo, PNJ). Le rayon d'influence modifie les données régions
(champ d'exposition) et les cartes. Placement : sites éloignés des capitales,
biome d'affinité, distances minimales entre Suprêmes.
"""
from __future__ import annotations
import math
import numpy as np
from .core import (WORLD_SIZE, region_id, rng, sub_seed, make_name,
                   save_json, wfile, load_json, register, world_to_region)

SUPREMES = [
    {"key": "IGNAROTH", "title": "Suprême des Braises Éternelles", "element": "feu",
     "affinity": ["volcanic", "badlands"], "biome_override": "volcanic",
     "corruption_color": "#c2452e", "weather": ["cendres", "canicule", "vent de braise"],
     "monsters": ["élémentaires de feu", "magma-bêtes", "salamandres d'acier"],
     "light": "lueur orangée constante, ombres rouges", "music_hint": "tambours sourds sous la lave",
     "npc_behaviour": "fuite ou fanatisme : certains clans le vénèrent",
     "signs": ["arbres calcinés alignés vers le centre", "verres fondus en larmes", "thermiques d'air brûlant"],
     "lore": "Né dans la première forge kharnide, IGNAROTH a bu le feu du monde. "
             "Son territoire est un avertissement : là où il marche, le sol se souvient de la lave.",
     "difficulty": 8},
    {"key": "KRYOS", "title": "l'Hiver Sans Fin", "element": "glace",
     "affinity": ["ice_sheet", "glacier_peak", "tundra"], "biome_override": "ice_sheet",
     "corruption_color": "#9fd8e8", "weather": ["blizzard", "silence gelé", "éclipse froide"],
     "monsters": ["élémentaires de givre", "loups des glaces", "revenants gelés"],
     "light": "lumière blanche sans ombre", "music_hint": "cristal fêlé, souffle polaire",
     "npc_behaviour": "villages vides, portes murées de l'intérieur",
     "signs": ["fleurs de givre géométriques", "lacs figés en miroir", "cadres de portes retirés"],
     "lore": "KRYOS ne hait personne. L'hiver n'est qu'une patience, et votre chaleur une erreur de calendrier.",
     "difficulty": 7},
    {"key": "YGGVARN", "title": "Racine du Monde", "element": "sylve",
     "affinity": ["jungle", "temperate_forest"], "biome_override": "jungle",
     "corruption_color": "#2f8f4e", "weather": ["brume verte", "pluie de spores", "calme écrasant"],
     "monsters": ["treants enragés", "essaims-mémoire", "gardes-racines"],
     "light": "rayons verts, sous-bois cathédrale", "music_hint": "chœur de feuilles, bouche d'orgue végétale",
     "npc_behaviour": "druides en transe, villageois récitants de la Graine",
     "signs": ["arbres fusionnés en arches", "racines pavant les routes", "fonts de sève claire"],
     "lore": "YGGVARN était la première graine plantée par les Aetheris. La forêt est son corps ; les voyageurs, son pollen.",
     "difficulty": 6},
    {"key": "NAKH'THUL", "title": "l'Abysse Éveillé", "element": "océan",
     "affinity": ["ocean_deep", "ocean", "coast"], "biome_override": "coast",
     "corruption_color": "#1a5f7a", "weather": ["tempête cyclonique", "marées impossibles", "pluie de sel"],
     "monsters": ["krakens mineurs", "aberrations abyssales", "naufrageurs"],
     "light": "lumière noire-bleue, halo de profondeur", "music_hint": "cloche noyée, chœur marin",
     "npc_behaviour": "ports en quarantaine, pêcheurs muets",
     "signs": ["vagues figées à contre-pente", "cloches de plage sonnant seules", "mouettes sans yeux"],
     "lore": "Ce que la mer rend toujours, elle le rend changé. NAKH'THUL est le changement.",
     "difficulty": 9},
    {"key": "AREKH", "title": "le Roi des Sables", "element": "désert",
     "affinity": ["desert", "badlands", "savanna"], "biome_override": "desert",
     "corruption_color": "#d9a441", "weather": ["mirages meurtriers", "tempête de sable", "soleil double"],
     "monsters": ["ver des sables", "momies de cour", "spectres de caravane"],
     "light": "miroitement doré, horizon liquide", "music_hint": "flûte de désert, sablier immense",
     "npc_behaviour": "oasis occupées par sa cour momifiée",
     "signs": ["sable en escaliers parfaits", "os de basilic dressés en bornes", "heures qui durent des jours"],
     "lore": "AREKH a conquis la mort comme on conquiert une province. Sa cour l'attend, et le sable avance.",
     "difficulty": 8},
    {"key": "MORVANE", "title": "la Reine des Ombres", "element": "ombre",
     "affinity": ["swamp", "taiga", "mixed_forest"], "biome_override": "swamp",
     "corruption_color": "#5a4a7a", "weather": ["nuit prolongée", "brume basse", "silence d'oracle"],
     "monsters": ["spectres des marais", "doubles voleurs", "araignées de mémoire"],
     "light": "contre-jour permanent, torches bleues", "music_hint": "berceuse inversée",
     "npc_behaviour": "PNJ aux ombres détachées, refusent de prononcer leur nom",
     "signs": ["ombres pointant le nord", "miroirs recouverts", "chandelles jamais consumées"],
     "lore": "MORVANE collectionne les reflets des rois. Le vôtre lui plaît déjà.",
     "difficulty": 9},
    {"key": "STRYGOR", "title": "Tempête Vivante", "element": "orage",
     "affinity": ["alpine_rock", "alpine_meadow", "grassland"], "biome_override": "alpine_rock",
     "corruption_color": "#6f7fd8", "weather": ["orages en chaîne", "tourbes d'éclairs", "grêle de verre"],
     "monsters": ["élémentaires de foudre", "harpyies-tempête", "bêtes énergisées"],
     "light": "éclairs permanents, ombres sautantes", "music_hint": "cordes frottées, tonnerre rythmé",
     "npc_behaviour": "villages paratonnerres, prêtres de l'arc",
     "signs": ["arbres foudroyés dressés vers le ciel", "tours à cages", "air qui craque sous les doigts"],
     "lore": "STRYGOR n'a jamais eu de forme deux fois. La dernière avait la vôtre.",
     "difficulty": 7},
    {"key": "LITHARION", "title": "le Dormeur de Pierre", "element": "tectonique",
     "affinity": ["alpine_rock", "badlands", "volcanic"], "biome_override": "badlands",
     "corruption_color": "#8a6f52", "weather": ["séismes lents", "poussière suspendue", "calme de tombe"],
     "monsters": ["golems de pierre", "vers de faille", "statues éveillées"],
     "light": "ombres de montagnes, crépuscule minéral", "music_hint": "grognement de plaques, luth de roche",
     "npc_behaviour": "villages bâtis sur pilotis anti-sismiques, culte du sommeil",
     "signs": ["rivières qui coulent en biais", "menhirs couchés comme des dormeurs", "routes qui se froncent"],
     "lore": "LITHARION rêve le relief du monde. Le réveiller, c'est redessiner les cartes.",
     "difficulty": 8},
    {"key": "VESPERA", "title": "la Voix du Vide", "element": "vide",
     "affinity": ["magic_glade", "mixed_forest", "tundra"], "biome_override": "magic_glade",
     "corruption_color": "#b08fd8", "weather": ["zones d'absence", "étoiles nouvelles", "météore silencieux"],
     "monsters": ["wispillons", "passerelles vivantes", "chose-sans-nom"],
     "light": "aurae violettes, angles de lumière impossibles", "music_hint": "note tenue, absence de réverb",
     "npc_behaviour": "PNJ qui répètent vos phrases, oublient leur métier",
     "signs": ["portails de l'Orden Voal qui s'ouvrent seuls", "pierres qui montent", "souvenirs manquants"],
     "lore": "Les Voilés n'ont pas disparu : ils ont été prononcés. VESPERA est la voix qui les a dits.",
     "difficulty": 10},
    {"key": "AURATHAL", "title": "le Jugement Doré", "element": "lumière",
     "affinity": ["grassland", "mediterranean", "savanna"], "biome_override": "mediterranean",
     "corruption_color": "#e8c85a", "weather": ["clair de juge", "chaleur accusatrice", "pluie de plumes"],
     "monsters": ["séraphins déchus", "statues-prophètes", "lions de verdict"],
     "light": "(projecteurs célestes, aucune ombre ne vous appartient", "music_hint": "orgue triomphal, chœur accusateur",
     "npc_behaviour": "tribunaux de village, aveux spontanés",
     "signs": ["clepsydres inversées", "sentiers droits à travers les montagnes", "faux soleils à midi"],
     "lore": "AURATHAL juge depuis la chute d'Aetheris. Personne n'a encore survécu à son acquittement.",
     "difficulty": 10},
]


def run_supremes_stage():
    print("[Gen3ia] Territoires des 10 Suprêmes...")
    regions_meta = load_json(wfile("regions.json"))["regions"]
    world_meta = load_json(wfile("world.json"))
    setts = load_json(wfile("settlements.json"))["settlements"]
    biome_idx = np.load(wfile("cache", "biome.npy"))
    from .climate import BIOME_LIST
    biome_map = np.array(BIOME_LIST, dtype=object)[biome_idx]
    res = biome_map.shape[0]
    land = np.load(wfile("cache", "land_hydro.npy"))
    l5 = land.reshape(res, land.shape[0] // res, res, land.shape[0] // res).mean(axis=(1, 3)) > 0.5
    e5 = np.load(wfile("cache", "elev_hydro.npy"))
    e5 = e5.reshape(res, e5.shape[0] // res, res, e5.shape[0] // res).mean(axis=(1, 3))
    capitals = [s for s in setts if s["size_class"] == "capital"]
    towns = [s for s in setts if s["size_class"] == "town"]
    towns = towns + capitals

    # lien avec les donjons (antres)
    dungeons = load_json(wfile("dungeons.json"))["dungeons"]
    dg_by_region = {}
    for d in dungeons:
        dg_by_region.setdefault(d["region"], []).append(d["id"])

    placed = []
    out = []
    for k, sup in enumerate(SUPREMES):
        r = rng("supreme", sup["key"])
        aff = sup["affinity"]
        ok = l5.copy()
        if aff and aff[0] != "__all__":
            ok_aff = np.isin(biome_map, aff) & ok
            if ok_aff.any():                 # affinité stricte, repli si vide
                ok = ok_aff
        cand = np.argwhere(ok)
        score_best, best = -1e18, None
        step = max(1, len(cand) // 4000)
        for cy, cx in cand[::step]:
            x = (cx + 0.5) / res * WORLD_SIZE - WORLD_SIZE / 2
            z = (1.0 - (cy + 0.5) / res) * WORLD_SIZE - WORLD_SIZE / 2
            d_min_t = min((math.hypot(x - t["world"][0], z - t["world"][1]) for t in towns), default=1e9)
            d_min_s = min((math.hypot(x - p[0], z - p[1]) for p in placed), default=1e9)
            alt_bonus = e5[cy, cx] / 2000 if sup["element"] in ("glace", "tectonique", "feu") else 0
            coast_pen = -1.5 if (sup["element"] != "océan" and biome_map[cy, cx] in ("coast",)) else 0
            sc = min(d_min_t, 22000) / 1000 + min(d_min_s, 30000) / 1000 * 1.6 + alt_bonus + coast_pen \
                 + float(r.random()) * 2.0
            if sc > score_best:
                score_best, best = sc, (cy, cx, x, z)
        cy, cx, x, z = best
        placed.append((x, z))
        gx, gy = world_to_region(x, z)
        rid_r = region_id(gx, gy)
        radius = float(r.uniform(1700, 2900))
        # donjon-antre : le plus proche du lair (≤ 9 km), sinon None (à forer plus tard)
        best_d, best_dd = None, 9000.0
        for d in dungeons:
            dd = math.hypot(d["world_entrance"][0] - x, d["world_entrance"][1] - z)
            if dd < best_dd:
                best_d, best_dd = d["id"], dd
        sup_d = best_d
        out.append({
            "id": f"SUP_{k+1:02d}", "key": sup["key"], "name": f"{sup['key']}, {sup['title']}",
            "element": sup["element"], "difficulty": sup["difficulty"],
            "lair_world": [round(x, 1), round(z, 1)], "lair_region": rid_r,
            "territory_radius_m": round(radius, 0),
            "lair_dungeon": sup_d,
            "biome_override": sup["biome_override"],
            "corruption_color": sup["corruption_color"],
            "corruption": {
                "weather": sup["weather"], "monsters": sup["monsters"],
                "light": sup["light"], "music": sup["music_hint"],
                "npc_behaviour": sup["npc_behaviour"], "signs": sup["signs"],
            },
            "visual_identity": f"le paysage glisse progressivement vers : {sup['biome_override']} "
                               f"(teinte {sup['corruption_color']}) à mesure qu'on approche",
            "lore": sup["lore"],
            "seed": sub_seed("supreme", sup["key"]),
        })
        register(out[-1]["id"], "supreme", {"key": sup["key"], "region": rid_r,
                                            "difficulty": sup["difficulty"]})
    save_json(wfile("supremes.json"), {"supremes": out})
    # exposition des régions (recalcul des niveaux de danger à proximité d'un territoire)
    n_exposed = 0
    for rg in regions_meta:
        cx, cz = rg["center_world"]
        expo = 0.0
        for s in out:
            d = math.hypot(cx - s["lair_world"][0], cz - s["lair_world"][1])
            expo = max(expo, max(0.0, 1.0 - d / (s["territory_radius_m"] * 2.2)))
        rg["supreme_exposure"] = round(float(expo), 2)
        if expo > 0.15:
            n_exposed += 1
            rg["recommended_level"] = int(np.clip(rg["recommended_level"] + round(expo * 4), 1, 10))
            rg["dangers"] = rg.get("dangers", []) + [f"aura de {s['key']}" for s in out
                                                      if math.hypot(cx - s["lair_world"][0],
                                                                    cz - s["lair_world"][1]) < s["territory_radius_m"] * 2.2][:1]
    save_json(wfile("regions.json"), {"regions": regions_meta})
    print(f"  10 Suprêmes placés, {n_exposed} régions exposées à une corruption")
    return {"supremes": out}
