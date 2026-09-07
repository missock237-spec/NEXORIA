"""Gen3ia.core — constantes du monde, déterminisme, coordonnées, noms procéduraux.

Toutes les grandeurs sont en MÈTRES. Axes : X = Est, Y = Altitude, Z = Nord.
Origine (0,0,0) = centre de la carte monde. La bordure du monde est l'Océan
Primordial (barrière naturelle jouable en bordure de carte).
"""
from __future__ import annotations
import hashlib
import json
import os
import numpy as np

# ---------------------------------------------------------------------------
# CONSTANTES MONDE (source unique de vérité, partagée avec le runtime Unity)
# ---------------------------------------------------------------------------
WORLD_NAME = "NEXORIA"
WORLD_SEED = 0x4E455852          # 1313167442 — "NEXR" en hexadécimal (ASCII)
WORLD_SIZE = 65536               # 64 km × 64 km de monde explorable
SEA_LEVEL = 0.0
REGION_SIZE = 4096               # une région = 4 km × 4 km
CHUNK_SIZE = 256                 # un chunk = 256 m × 256 m
REGIONS_PER_AXIS = WORLD_SIZE // REGION_SIZE      # 16 -> 256 régions
CHUNKS_PER_AXIS = WORLD_SIZE // CHUNK_SIZE        # 256 -> 65 536 chunks

# Résolutions de génération
GLOBAL_RES = 2048                # carte monde (32 m/pixel)
HYDRO_RES = 1024                 # hydrologie (64 m/pixel)
CLIMATE_RES = 512                # climats (128 m/pixel)
REGION_MAP_RES = 256             # heightmap par région (16 m/pixel)
GLOBAL_MPP = WORLD_SIZE / GLOBAL_RES
HYDRO_MPP = WORLD_SIZE / HYDRO_RES
REGION_MPP = REGION_SIZE / REGION_MAP_RES

# Encodage des hauteurs (PNG16 / RAW Unity) : 0..65535 <-> HEIGHT_MIN..HEIGHT_MAX
HEIGHT_MIN, HEIGHT_MAX = -4096.0, 6144.0
HEIGHT_STEP = (HEIGHT_MAX - HEIGHT_MIN) / 65535.0

# Chemins
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
WORLD_DATA = os.path.join(ROOT, "WorldData")


def wdir(*parts) -> str:
    """Retourne (et crée) un sous-dossier de WorldData/."""
    p = os.path.join(WORLD_DATA, *parts)
    os.makedirs(p, exist_ok=True)
    return p


def wfile(*parts) -> str:
    """Retourne (et crée le dossier parent de) un chemin de fichier WorldData/."""
    p = os.path.join(WORLD_DATA, *parts)
    os.makedirs(os.path.dirname(p) or WORLD_DATA, exist_ok=True)
    return p


def save_json(path: str, obj, compact: bool = False) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        if compact:
            json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
        else:
            json.dump(obj, f, ensure_ascii=False, indent=1)


def load_json(path: str):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# DÉTERMINISME — hiérarchie de seeds stable entre les exécutions
# ---------------------------------------------------------------------------
def _stable_hash(text: str) -> int:
    h = hashlib.md5(text.encode("utf-8")).hexdigest()
    return int(h[:12], 16)


def rng(*parts) -> np.random.Generator:
    """Générateur déterministe dérivé de WORLD_SEED et d'un nom de subsystem."""
    key = "|".join(str(p) for p in parts)
    seq = np.random.SeedSequence([WORLD_SEED & 0xFFFFFFFF, _stable_hash(key)])
    return np.random.default_rng(seq)


def sub_seed(*parts) -> int:
    """Seed entière dérivée, pour les entités (régions, donjons, POI...)."""
    return _stable_hash("|".join(str(p) for p in parts)) & 0x7FFFFFFF


# ---------------------------------------------------------------------------
# SYSTÈME DE COORDONNÉES MONDIAL
# ---------------------------------------------------------------------------
def world_to_region(x: float, z: float):
    """Coordonnées monde -> indices de grille région (gx, gy), 0..15."""
    gx = int(np.clip((x + WORLD_SIZE / 2) // REGION_SIZE, 0, REGIONS_PER_AXIS - 1))
    gy = int(np.clip((z + WORLD_SIZE / 2) // REGION_SIZE, 0, REGIONS_PER_AXIS - 1))
    return gx, gy


def region_index(gx: int, gy: int) -> int:
    """Index 1-based, balayage sud->nord (gy) puis ouest->est (gx)."""
    return gy * REGIONS_PER_AXIS + gx + 1


def region_id(gx: int, gy: int) -> str:
    return f"REGION_{region_index(gx, gy):03d}"


def region_center(gx: int, gy: int):
    cx = -WORLD_SIZE / 2 + (gx + 0.5) * REGION_SIZE
    cz = -WORLD_SIZE / 2 + (gy + 0.5) * REGION_SIZE
    return cx, cz


def region_bounds(gx: int, gy: int):
    x0 = -WORLD_SIZE / 2 + gx * REGION_SIZE
    z0 = -WORLD_SIZE / 2 + gy * REGION_SIZE
    return x0, z0, x0 + REGION_SIZE, z0 + REGION_SIZE


def world_to_map(x: float, z: float, res: int):
    """Monde -> pixel carte. RANGÉE 0 = NORD (convention image)."""
    px = (x + WORLD_SIZE / 2) / WORLD_SIZE * res
    py = (1.0 - (z + WORLD_SIZE / 2) / WORLD_SIZE) * res
    return px, py


def map_to_world(px: float, py: float, res: int):
    x = px / res * WORLD_SIZE - WORLD_SIZE / 2
    z = (1.0 - py / res) * WORLD_SIZE - WORLD_SIZE / 2
    return x, z


def chunk_global_index(x: float, z: float):
    """Chunk global (cgx, cgy) 0..255 à partir de coordonnées monde."""
    cgx = int(np.clip((x + WORLD_SIZE / 2) // CHUNK_SIZE, 0, CHUNKS_PER_AXIS - 1))
    cgy = int(np.clip((z + WORLD_SIZE / 2) // CHUNK_SIZE, 0, CHUNKS_PER_AXIS - 1))
    return cgx, cgy


def chunk_id(cgx: int, cgy: int) -> str:
    return f"CHUNK_{cgx:03d}_{cgy:03d}"


# ---------------------------------------------------------------------------
# GÉNÉRATEUR DE NOMS PROCÉDURAL (cultures de NEXORIA)
# ---------------------------------------------------------------------------
_SYL = {
    "commun":   ["Val", "Bel", "Mor", "Cas", "El", "Gar", "Ros", "Tir", "Hal", "Oren",
                 "dor", "mir", "val", "wick", "burg", "holm", "ford", "ley", "mont", "shire"],
    "aetheris": ["Ael", "Ser", "Lum", "Cael", "Aur", "Ith", "San", "Vel", "Ori", "Ely",
                 "thia", "ris", "ndel", "riël", "ssia", "rion", "lle", "stra", "vane", "mir"],
    "kharn":    ["Khar", "Dur", "Gro", "Thra", "Bur", "Grim", "Mor", "Dra", "Krug", "Stone",
                 "gash", "dum", "grimm", "rok", "del", "zhar", "grad", "maw", "hollow", "fang"],
    "ssil":     ["Ssil", "Vare", "Xal", "Itz", "Nak", "Zte", "Qua", "Xil", "Ocel", "Teo",
                 "thil", "xan", "catl", "za", "rath", "poch", "tli", "mara", "quetz", "sum"],
    "voal":     ["Voa", "Neb", "Sol", "Umb", "Ves", "Cal", "Mni", "Zeph", "Omb", "Iri",
                 "lis", "thys", "neum", "dris", "sil", "var", "dane", "lyn", "thos", "iel"],
    "supreme":  ["Ign", "Kry", "Ygg", "Nakh", "Aur", "Mor", "Stry", "Lith", "Ves", "Ar",
                 "aroth", "os", "varn", "thul", "athal", "vane", "gor", "arion", "pera", "ekh"],
}

_TITLES = ["Marches de ", "Contée de ", "Vallée de ", "Plaines de ", "Confins de ",
           "Bassin de ", "Crêtes de ", "Duché de ", "Terres de ", "Détroits de "]


def make_name(culture: str, parts: int = 2, seed_extra: str = "") -> str:
    """Nom procédural déterministe pour une culture donnée."""
    r = rng("names", culture, seed_extra, sub_seed(culture, seed_extra))
    pool = _SYL.get(culture, _SYL["commun"])
    n = len(pool) // 2
    heads, tails = pool[:n], pool[n:]
    name = str(r.choice(heads))
    for _ in range(max(0, parts - 1)):
        name += str(r.choice(pool))
    name = name.replace("ss", "s").replace("aa", "a").replace("ii", "i")
    return name.capitalize()


def make_place_name(culture: str, kind: str, seed_extra: str = "") -> str:
    """Nom de lieu : 'Contée de Kelmorval', 'Fort de Durgrim', etc."""
    r = rng("placenames", culture, kind, seed_extra)
    base = make_name(culture, 2, seed_extra)
    if kind in ("region",):
        return str(r.choice(_TITLES)) + base
    if kind == "city":
        return base + str(r.choice(["-Capitale", " Cité", "", "", ""]))
    if kind == "town":
        return base + str(r.choice(["bourg", "ville", "", ""]))
    if kind == "village":
        return str(r.choice(["Petit-", "Haut-", "Bas-", "", "", ""])) + base
    if kind == "port":
        return base + str(r.choice(["-Port", "-sur-Mer", " Marée", ""]))
    if kind == "fort":
        return str(r.choice(["Fort ", "Garde-", "Tour de ", "Bastion de "])) + base
    return base


# ---------------------------------------------------------------------------
# REGISTRE MONDIAL — registre central de toutes les entités (traçabilité)
# ---------------------------------------------------------------------------
REGISTRY_PATH = os.path.join(WORLD_DATA, "registry.json")


def register(entity_id: str, etype: str, data: dict) -> None:
    """Enregistre une entité dans le registre mondial (id -> type + résumé)."""
    reg = {}
    if os.path.exists(REGISTRY_PATH):
        reg = load_json(REGISTRY_PATH)
    reg[entity_id] = {"type": etype, **{k: data[k] for k in list(data)[:6]}}
    save_json(REGISTRY_PATH, reg, compact=True)
