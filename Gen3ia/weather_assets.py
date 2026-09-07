"""Gen3ia.weather_assets — étage 15 : météo, saisons, cycle jour/nuit + catalogue d'assets.

Produit :
  - weather.json : états météo par biome (poids par saison), cycle jour/nuit,
    saisons, événements du monde vivant
  - assets.json  : nomenclature professionnelle Environment/..., LOD, collision,
    budgets par profil qualité (LOW/MEDIUM/HIGH/ULTRA)
Les valeurs alimentent directement les scripts Unity (Game/Systems/).
"""
from __future__ import annotations
import numpy as np
from .core import rng, save_json, wfile, load_json

WEATHER_STATES = {
    "clair":        {"cloud": 0.1, "rain": 0.0, "wind": 0.2, "fog": 0.0, "light_mult": 1.0},
    "nuageux":      {"cloud": 0.6, "rain": 0.0, "wind": 0.4, "fog": 0.05, "light_mult": 0.8},
    "pluie":        {"cloud": 0.85, "rain": 0.7, "wind": 0.5, "fog": 0.15, "light_mult": 0.65},
    "orage":        {"cloud": 1.0, "rain": 1.0, "wind": 0.9, "fog": 0.2, "light_mult": 0.5, "lightning": True},
    "brume":        {"cloud": 0.4, "rain": 0.0, "wind": 0.1, "fog": 0.75, "light_mult": 0.7},
    "neige":        {"cloud": 0.8, "rain": 0.0, "snow": 0.8, "wind": 0.4, "fog": 0.2, "light_mult": 0.75},
    "blizzard":     {"cloud": 1.0, "rain": 0.0, "snow": 1.0, "wind": 1.0, "fog": 0.6, "light_mult": 0.55},
    "tempête_sable":{"cloud": 0.7, "rain": 0.0, "dust": 1.0, "wind": 0.95, "fog": 0.5, "light_mult": 0.6},
    "canicule":     {"cloud": 0.05, "rain": 0.0, "wind": 0.1, "fog": 0.0, "light_mult": 1.15, "heat": 1.0},
    "cendres":      {"cloud": 0.6, "rain": 0.0, "ash": 0.7, "wind": 0.5, "fog": 0.35, "light_mult": 0.7},
}
SEASONS = {
    "printemps": {"length_days": 24, "temp_delta": +0.05, "moist_delta": +0.08},
    "été":       {"length_days": 26, "temp_delta": +0.14, "moist_delta": -0.04},
    "automne":   {"length_days": 24, "temp_delta": +0.02, "moist_delta": +0.05},
    "hiver":     {"length_days": 26, "temp_delta": -0.2, "moist_delta": +0.02, "snowline_drop_m": 900},
}
DAY_NIGHT = {
    "day_cycle_minutes_real": 36,          # 24 h de jeu = 36 min réelles
    "sunrise_hour": 6.2, "sunset_hour": 19.4,
    "night_ambient": [0.10, 0.12, 0.22],
    "dawn_dusk_color": [1.0, 0.55, 0.3],
    "moon_light": 0.18, "stars": True,
}
WORLD_EVENTS = [
    {"id": "EVT_INVASION", "name": "Marée Abyssale", "trigger": "pleine lune de printemps",
     "effect": "NAKH'THUL pousse ses monstres sur toutes les côtes pendant 2 jours"},
    {"id": "EVT_CARAVANE", "name": "Caravane Dorée", "trigger": "chaque 12 jours",
     "effect": "caravanes marchandes entre capitales, prix -15 %"},
    {"id": "EVT_EBLOUEMENT", "name": "Éboulement Sans Fin", "trigger": "aléatoire (mines kharnides)",
     "effect": "une grotte s'effondre, une autre s'ouvre — donjons régénérés (pondéré)"},
    {"id": "EVT_JUGEMENT", "name": "Passage du Jugement", "trigger": "saison de l'été, 1×/an",
     "effect": "AURATHAL traverse les plaines : PNJ confessent, crimes exposés"},
    {"id": "EVT_GEL", "name": "Souffle de KRYOS", "trigger": "hiver, 2×/an",
     "effect": "la limite des neiges descend de 1 400 m pendant 3 jours"},
]


def _weather_table(r):
    base = [("clair", 5.0), ("nuageux", 2.6), ("pluie", 1.4), ("brume", 1.0), ("orage", 0.5)]
    out = {}
    for season in SEASONS:
        rows = {}
        for state, w in base:
            rows[state] = round(w * (0.6 + r.random() * 0.8), 2)
        out[season] = rows
    return out


def run_weather_stage():
    print("[Gen3ia] Météo / saisons / jour-nuit + catalogue d'assets...")
    r = rng("weather")
    # tables par grande famille de biome (pas biome par biome, pour la cohérence)
    families = {
        "tropique": ["jungle", "savanna", "swamp"],
        "tempéré": ["temperate_forest", "mixed_forest", "grassland", "mediterranean"],
        "froid": ["taiga", "tundra", "ice_sheet", "glacier_peak", "alpine_meadow", "alpine_rock"],
        "aride": ["desert", "badlands", "volcanic"],
        "maritime": ["coast", "ocean", "lake", "ocean_deep"],
        "magique": ["magic_glade"],
    }
    tables = {}
    for fam in families:
        tbl = _weather_table(r)
        if fam == "aride":
            for s in tbl:
                tbl[s]["tempête_sable"] = 1.8; tbl[s]["pluie"] *= 0.15
        if fam == "froid":
            for s in tbl:
                tbl[s]["neige"] = 1.6; tbl[s]["blizzard"] = 0.8; tbl[s]["pluie"] *= 0.2
        if fam == "tropique":
            for s in tbl:
                tbl[s]["orage"] *= 2.0
        tables[fam] = {"biomes": families[fam], "weights_per_season": tbl}
    # zones Suprêmes : override météo (état forcé, poids 10)
    supremes = []
    import os
    if os.path.exists(wfile("supremes.json")):
        for s in load_json(wfile("supremes.json"))["supremes"]:
            states = s["corruption"]["weather"]
            supremes.append({"supreme": s["id"], "lair_world": s["lair_world"],
                             "radius_m": s["territory_radius_m"] * 2.2,
                             "forced_states": {st: 10.0 for st in states},
                             "severity_curve": "linéaire : 0 au bord -> 1 au centre"})
    save_json(wfile("weather.json"), {
        "weather_states": WEATHER_STATES, "seasons": SEASONS,
        "day_night": DAY_NIGHT, "families": tables,
        "supreme_overrides": supremes, "world_events": WORLD_EVENTS,
        "transition_seconds": 12, "update_interval_s": 30,
    })

    # ---------------- CATALOGUE D'ASSETS ----------------
    def A(cat, name, tris, lods=(1.0, 0.45, 0.12), coll="box", mats=None, tags=None):
        return {"path": f"Environment/{cat}/{name}", "name": name,
                "lod_tris": [int(tris * l) for l in lods], "collision": coll,
                "materials": mats or [f"M_{name.split('_')[-1]}"],
                "tags": tags or []}
    assets = [
        A("Mountains", "MTN_CliffWall_A", 2400), A("Mountains", "MTN_PeakJagged_A", 3600, coll="mesh"),
        A("Mountains", "MTN_Plateau_Mesa", 2800), A("Mountains", "MTN_VolcanoCone", 5200, coll="mesh"),
        A("Rocks", "RCK_Boulder_L", 620), A("Rocks", "RCK_Boulder_M", 320),
        A("Rocks", "RCK_CliffStep", 480), A("Rocks", "RCK_StandingStones", 540, tags=["poi"]),
        A("Trees", "TRE_Oak_L", 420, coll="capsule"), A("Trees", "TRE_Pine_L", 380, coll="capsule"),
        A("Trees", "TRE_Spruce_L", 360, coll="capsule"), A("Trees", "TRE_Banyan_XL", 900, coll="mesh"),
        A("Trees", "TRE_Dead_Bare", 240), A("Trees", "TRE_Monument_WorldTree", 9000, coll="mesh", tags=["poi"]),
        A("Vegetation", "VEG_Bush_A", 90, coll=None), A("Vegetation", "VEG_GrassTuft_A", 24, coll=None),
        A("Vegetation", "VEG_Flowers_A", 20, coll=None), A("Vegetation", "VEG_Reeds", 28, coll=None),
        A("Vegetation", "VEG_Mushroom_Glow", 40, tags=["magic"]),
        A("Buildings", "BLD_House_A", 1800, coll="mesh"), A("Buildings", "BLD_House_B", 1600, coll="mesh"),
        A("Buildings", "BLD_Farm_Barn", 2400, coll="mesh"), A("Buildings", "BLD_Inn", 3200, coll="mesh"),
        A("Buildings", "BLD_Market_Stall", 600), A("Buildings", "BLD_Temple_Small", 4200, coll="mesh"),
        A("Buildings", "BLD_Wall_Segment", 900, coll="mesh"), A("Buildings", "BLD_Watchtower", 2600, coll="mesh"),
        A("Buildings", "BLD_Keep_Capital", 12000, coll="mesh"), A("Buildings", "BLD_Port_Warehouse", 3400, coll="mesh"),
        A("Ruins", "RUI_AetherArch_Floating", 2800, tags=["civ_01"]),
        A("Ruins", "RUI_AetherColumn", 700, tags=["civ_01"]),
        A("Ruins", "RUI_KharnForgeGate", 3400, tags=["civ_02"]),
        A("Ruins", "RUI_SsilPyramidStep", 6800, tags=["civ_03"]),
        A("Ruins", "RUI_VoalMonolith", 1900, tags=["civ_04"]),
        A("Ruins", "RUI_GenericBrokenWall", 420),
        A("Caves", "CAV_RockWall_Module", 800, coll="mesh"), A("Caves", "CAV_Stalagmite", 300),
        A("Caves", "CAV_CrystalCluster", 420, tags=["magic"]), A("Caves", "CAV_Bridge_Wood", 640),
        A("Dungeons", "DGN_Hall_Module", 1400, coll="mesh"), A("Dungeons", "DGN_Door_Iron", 380),
        A("Dungeons", "DGN_Throne_Supreme", 5200, tags=["boss"]),
        A("Props", "PRP_Campfire", 220, tags=["light"]), A("Props", "PRP_ShipWreck", 3200, coll="mesh"),
        A("Props", "PRP_Waystone", 480, tags=["fast_travel"]), A("Props", "PRP_Bridge_Stone", 1500, coll="mesh"),
        A("VFX", "VFX_PortalVoal", 600, tags=["civ_04"]), A("VFX", "VFX_CorruptionAura", 200, tags=["supreme"]),
    ]
    profiles = {
        "LOW":    {"view_distance_m": 768,  "active_chunks": 12, "lod_bias": 1.6, "max_draw_calls": 220,
                   "texture_memory_mb": 220, "realtime_shadows": "off", "vegetation_density": 0.45,
                   "water_quality": "basic", "particles": 0.4, "target_fps_android": 30},
        "MEDIUM": {"view_distance_m": 1536, "active_chunks": 25, "lod_bias": 1.2, "max_draw_calls": 380,
                   "texture_memory_mb": 420, "realtime_shadows": "40m cascade", "vegetation_density": 0.7,
                   "water_quality": "reflections_low", "particles": 0.7, "target_fps_android": 30},
        "HIGH":   {"view_distance_m": 3072, "active_chunks": 49, "lod_bias": 1.0, "max_draw_calls": 700,
                   "texture_memory_mb": 900, "realtime_shadows": "80m cascade", "vegetation_density": 0.9,
                   "water_quality": "reflections", "particles": 1.0, "target_fps_pc": 60},
        "ULTRA":  {"view_distance_m": 6144, "active_chunks": 81, "lod_bias": 0.8, "max_draw_calls": 1200,
                   "texture_memory_mb": 1800, "realtime_shadows": "200m cascades", "vegetation_density": 1.0,
                   "water_quality": "full", "particles": 1.0, "target_fps_pc": 60},
    }
    save_json(wfile("assets.json"), {
        "nomenclature": "Environment/<Catégorie>/<PREFIXE>_<Nom>_<Variante>",
        "lod_scheme": "LOD0 100 % / LOD1 45 % / LOD2 12 % des triangles + impostors au-delà de 300 m",
        "assets": assets, "quality_profiles": profiles,
    })
    print(f"  weather.json (météo {len(WEATHER_STATES)} états, {len(SEASONS)} saisons, "
          f"{len(WORLD_EVENTS)} événements) + assets.json ({len(assets)} assets, 4 profils)")
    return {"ok": True}
