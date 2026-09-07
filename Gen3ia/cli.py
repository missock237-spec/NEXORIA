"""Gen3ia.cli — interface en ligne de commande du générateur de monde.

Usage :
  python -m Gen3ia world            # étages 2-3 : planète, continents, montagnes
  python -m Gen3ia hydro            # étage hydrologie (fleuves, lacs, incision)
  python -m Gen3ia climate          # étage climats/biomes
  python -m Gen3ia regions          # étages 4-5 : régions + biomes régionaux
  python -m Gen3ia terrain          # étage 6-7 : heightmaps 3D + érosion
  python -m Gen3ia vegetation       # étage 8 : forêts et végétation
  python -m Gen3ia settlements      # étage 9 : villages, villes, routes
  python -m Gen3ia mysteries        # étages 10-12 : ruines, grottes, donjons
  python -m Gen3ia supremes         # étage 13 : territoires des 10 Suprêmes
  python -m Gen3ia poi              # étage 14 : POI et secrets
  python -m Gen3ia weather          # étage 15 : météo / saisons (config)
  python -m Gen3ia maps             # étape 19 : cartes PNG
  python -m Gen3ia meshes           # export meshes OBJ (région héros)
  python -m Gen3ia validate         # étapes 17-18 : validation + autocorrection
  python -m Gen3ia docs             # étape 19 : documentation générée
  python -m Gen3ia report           # résumé d'état du monde
  python -m Gen3ia full             # tout le pipeline dans l'ordre
Chaque étage est idempotent et journalisé dans WorldData/manifest.json.
"""
from __future__ import annotations
import json
import os
import sys
import time
import traceback

from .core import WORLD_DATA, save_json, load_json, wdir

MANIFEST = os.path.join(WORLD_DATA, "manifest.json")


def _manifest():
    if os.path.exists(MANIFEST):
        return load_json(MANIFEST)
    return {"stages": {}}


def _mark(stage: str, extra: dict | None = None):
    m = _manifest()
    m["stages"][stage] = {"done_at": time.strftime("%Y-%m-%d %H:%M:%S"), **(extra or {})}
    save_json(MANIFEST, m)
    # journal lisible
    log = os.path.join(WORLD_DATA, "generation_log.txt")
    with open(log, "a", encoding="utf-8") as f:
        f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')}  OK  {stage}  {extra or ''}\n")


def _run(stage: str, fn):
    t0 = time.time()
    print(f"\n=== ÉTAGE {stage.upper()} ===")
    try:
        out = fn()
        _mark(stage, {"seconds": round(time.time() - t0, 1)})
        print(f"=== {stage} terminé en {time.time()-t0:.1f} s ===")
        return out
    except Exception:
        traceback.print_exc()
        print(f"!!! ÉCHEC de l'étage {stage} — voir la trace ci-dessus.")
        sys.exit(1)


def _cache(name):
    p = os.path.join(wdir("cache"), name)
    if not os.path.exists(p):
        raise SystemExit(f"Cache manquant : {p} — exécutez les étages précédents d'abord.")
    return np.load(p)


import numpy as np  # noqa: E402  (après _cache)


def cmd_world(): _run("world", lambda: __import__("Gen3ia.worldgen", fromlist=["x"]).run_world_stage())


def cmd_hydro():
    from . import worldgen, hydro
    def go():
        elev = _cache("elev.npy"); land = _cache("land.npy")
        return hydro.run_hydro_stage(elev, land)
    _run("hydro", go)


def cmd_climate():
    from . import climate
    def go():
        e = _cache("elev_hydro.npy"); l = _cache("land_hydro.npy"); w = _cache("water_global.npy")
        return climate.run_climate_stage(e, l, w)
    _run("climate", go)


def cmd_regions(): _run("regions", lambda: __import__("Gen3ia.regions", fromlist=["x"]).run_regions_stage())
def cmd_terrain(): _run("terrain", lambda: __import__("Gen3ia.terrain", fromlist=["x"]).run_terrain_stage())
def cmd_vegetation(): _run("vegetation", lambda: __import__("Gen3ia.vegetation", fromlist=["x"]).run_vegetation_stage())
def cmd_settlements(): _run("settlements", lambda: __import__("Gen3ia.settlements", fromlist=["x"]).run_settlements_stage())
def cmd_mysteries(): _run("mysteries", lambda: __import__("Gen3ia.mysteries", fromlist=["x"]).run_mysteries_stage())
def cmd_supremes(): _run("supremes", lambda: __import__("Gen3ia.supremes", fromlist=["x"]).run_supremes_stage())
def cmd_poi(): _run("poi", lambda: __import__("Gen3ia.poi", fromlist=["x"]).run_poi_stage())
def cmd_weather(): _run("weather", lambda: __import__("Gen3ia.weather_assets", fromlist=["x"]).run_weather_stage())
def cmd_maps(): _run("maps", lambda: __import__("Gen3ia.exporters", fromlist=["x"]).export_all_maps())
def cmd_meshes(): _run("meshes", lambda: __import__("Gen3ia.exporters", fromlist=["x"]).export_hero_meshes())
def cmd_validate(): _run("validate", lambda: __import__("Gen3ia.validate", fromlist=["x"]).run_validation())
def cmd_docs(): _run("docs", lambda: __import__("Gen3ia.docs", fromlist=["x"]).generate_all_docs())


def cmd_full():
    cmd_world(); cmd_hydro(); cmd_climate(); cmd_regions(); cmd_terrain()
    cmd_vegetation(); cmd_settlements(); cmd_mysteries(); cmd_supremes()
    cmd_poi(); cmd_weather(); cmd_maps(); cmd_meshes(); cmd_validate(); cmd_docs()


def cmd_report():
    m = _manifest()
    print(json.dumps(m.get("stages", {}), indent=1, ensure_ascii=False))


def main(argv=None):
    argv = argv or sys.argv[1:]
    if not argv:
        print(__doc__); return
    table = {"world": cmd_world, "hydro": cmd_hydro, "climate": cmd_climate,
             "regions": cmd_regions, "terrain": cmd_terrain, "vegetation": cmd_vegetation,
             "settlements": cmd_settlements, "mysteries": cmd_mysteries,
             "supremes": cmd_supremes, "poi": cmd_poi, "weather": cmd_weather,
             "maps": cmd_maps, "meshes": cmd_meshes, "validate": cmd_validate,
             "docs": cmd_docs, "full": cmd_full, "report": cmd_report}
    cmd = argv[0]
    if cmd in ("-h", "--help"):
        print(__doc__); return
    if cmd not in table:
        print(f"Étage inconnu : {cmd}. Étages : {', '.join(table)}"); sys.exit(2)
    table[cmd]()


if __name__ == "__main__":
    main()
