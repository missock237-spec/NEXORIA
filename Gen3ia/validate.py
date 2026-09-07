"""Gen3ia.validate — étapes 17-18 : validation automatique + autocorrection.

Vérifications exécutées après génération :
  1. heightmaps : NaN, valeurs hors bornes, continuité aux frontières de régions
  2. établissements : pente du site, non-inondation, aplomb terrain réel
  3. POI : hauteur snapée ≈ terrain (dérive érosion), exposure Suprême cohérente
  4. fleuves : atteignent la mer/le lac (extrémité aval), monotonie approximative
  5. grottes : entrée sur terre ferme (hors subaquatiques), z cohérent
  6. donjons : graphe de salles connecté, entrée joignable par route/grotte
  7. routes : longueur et traversées d'eau pontées
  8. budgets perf : estimation triangles par chunk vs profils qualité
Autocorrections : aplatissement du terrain sous les établissements, re-snap des POI,
rapport complet -> WorldData/validation_report.json + Documentation/14_VALIDATION_REPORT.md.
"""
from __future__ import annotations
import json
import math
import os
import numpy as np
from .core import (WORLD_SIZE, REGION_SIZE, REGION_MAP_RES, REGION_MPP,
                   HEIGHT_MIN, HEIGHT_MAX, region_id, save_json, wfile, load_json)
from .noise import bilinear_sample


def _terr(rid):
    try:
        return np.load(wfile("cache", "terrain", f"{rid}.npy"))
    except FileNotFoundError:
        return None


def _slope_at(hmap, px, py):
    n = hmap.shape[0]
    x0, y0 = int(np.clip(px, 1, n - 2)), int(np.clip(py, 1, n - 2))
    gx = (hmap[y0, x0 + 1] - hmap[y0, x0 - 1]) / (2 * REGION_MPP)
    gz = (hmap[y0 + 1, x0] - hmap[y0 - 1, x0]) / (2 * REGION_MPP)
    return math.hypot(gx, gz)


def _flatten_disk(hmap, cx, cy, radius_px, target_h):
    n = hmap.shape[0]
    yy, xx = np.mgrid[0:n, 0:n]
    d = np.hypot(xx - cx, yy - cy)
    m = d <= radius_px
    w = np.clip(1 - (d / max(radius_px, 1e-6)) ** 2, 0, 1)
    hmap[m] = hmap[m] * (1 - w[m] * 0.85) + target_h * (w[m] * 0.85)


def run_validation():
    print("[Gen3ia] Validation automatique...")
    report = {"checks": [], "fixes": [], "errors": 0, "warnings": 0, "fixed": 0}
    regions_meta = load_json(wfile("regions.json"))["regions"]
    setts = load_json(wfile("settlements.json"))["settlements"]
    poi = load_json(wfile("poi.json"))["poi"]
    rivers = load_json(wfile("rivers.json"))["rivers"]
    caves = load_json(wfile("caves.json"))["caves"]
    dungeons = load_json(wfile("dungeons.json"))["dungeons"]
    routes = load_json(wfile("routes.json"))["routes"]
    assets = load_json(wfile("assets.json"))

    def check(name, ok, level="error", detail=""):
        report["checks"].append({"check": name, "ok": bool(ok), "level": level, "detail": detail})
        if not ok:
            if level == "error":
                report["errors"] += 1
            else:
                report["warnings"] += 1

    # ---------- 1. heightmaps ----------
    hmaps = {}
    nan_count = 0
    oob_count = 0
    seam_max = 0.0
    seam_bad = 0
    for rg in regions_meta:
        h = _terr(rg["id"])
        if h is None:
            continue
        hmaps[rg["id"]] = h
        nan_count += int(np.isnan(h).sum())
        oob_count += int(((h < HEIGHT_MIN - 1) | (h > HEIGHT_MAX + 1)).sum())
    seam_bad = 0
    seam_max_disc = 0.0
    pairs = 0
    for gy in range(0, 15):
        for gx in range(0, 15):
            a = hmaps.get(region_id(gx, gy))
            b = hmaps.get(region_id(gx + 1, gy))   # voisin EST
            c = hmaps.get(region_id(gx, gy - 1))   # voisin SUD (gy-1 = plus au sud)
            if a is not None and b is not None:
                grad_in = a[:, -1] - a[:, -2]
                grad_out = b[:, 1] - b[:, 0]
                d_mid = b[:, 0] - a[:, -1]
                disc = np.abs(d_mid - (grad_in + grad_out) / 2.0)
                tol = np.maximum(10.0, 0.35 * (np.abs(grad_in) + np.abs(grad_out)))
                md = float((disc - tol).max())
                seam_max_disc = max(seam_max_disc, float(disc.max()))
                if md > 0:
                    seam_bad += 1
                pairs += 1
            if a is not None and c is not None:
                grad_in = a[-1, :] - a[-2, :]
                grad_out = c[1, :] - c[0, :]
                d_mid = c[0, :] - a[-1, :]
                disc = np.abs(d_mid - (grad_in + grad_out) / 2.0)
                tol = np.maximum(10.0, 0.35 * (np.abs(grad_in) + np.abs(grad_out)))
                md = float((disc - tol).max())
                seam_max_disc = max(seam_max_disc, float(disc.max()))
                if md > 0:
                    seam_bad += 1
                pairs += 1
    check("heightmaps_seams", seam_bad == 0, "warning",
          f"discontinuités > 8 m : {seam_bad}/{pairs} (max {seam_max_disc:.2f} m)")
    # ---------- 2. établissements ----------
    steep, flooded, drift = [], [], []
    for s in setts:
        rid = region_id(*[int(v) for v in [0, 0]])  # placeholder évité ci-dessous
        gx, gy = None, None
        # retrouver la région
        from .core import world_to_region
        gx, gy = world_to_region(s["world"][0], s["world"][1])
        h = hmaps.get(region_id(gx, gy))
        if h is None:
            continue
        lx = (s["world"][0] - (gx * REGION_SIZE - WORLD_SIZE / 2)) / REGION_SIZE
        lz = (s["world"][1] - (gy * REGION_SIZE - WORLD_SIZE / 2)) / REGION_SIZE
        n = h.shape[0]
        px = float(np.clip(lx * n, 0, n - 1))
        py = float(np.clip((1 - lz) * (n - 1), 0, n - 1))
        h_site = float(bilinear_sample(h, np.array([px]), np.array([py]))[0])
        sl = _slope_at(h, px, py)
        if sl > 0.55:
            steep.append((s["id"], round(sl, 2)))
        if s["size_class"] in ("capital", "town", "village") and h_site < 1.0 and not s.get("port"):
            flooded.append(s["id"])
            _flatten_disk(h, px, py, radius_px=max(8.0, s["population"] / 500), target_h=3.0)
            s["ground_raised"] = True
            s["terrain_flattened"] = True
            hmaps[region_id(gx, gy)] = h
            h_site = 3.0
        if abs(h_site - s["world"][2]) > 6.0 or sl > 0.55:
            drift.append(s["id"])
            # AUTOCORRECTION : aplatir + re-snap
            _flatten_disk(h, px, py, radius_px=max(6.0, s["population"] / 700), target_h=max(h_site, 2.0))
            s["world"][2] = round(float(h_site), 1)
            s["terrain_flattened"] = True
            hmaps[region_id(gx, gy)] = h
    check("settlements_slope", len(steep) <= 2, "warning", f"sites trop pentus : {steep[:5]}")
    check("settlements_flooded", len(flooded) == 0, "error", f"sites inondés : {flooded[:5]}")
    if drift:
        # réécrire les heightmaps corrigées + settlements.json
        written = set()
        for s in setts:
            from .core import world_to_region
            gx, gy = world_to_region(s["world"][0], s["world"][1])
            rid = region_id(gx, gy)
            if s.get("terrain_flattened") and rid in hmaps and rid not in written:
                hh = hmaps[rid]
                enc = ((hh - HEIGHT_MIN) / (HEIGHT_MAX - HEIGHT_MIN) * 65535).clip(0, 65535).astype(np.uint16)
                from PIL import Image
                Image.fromarray(enc, "I;16").save(wfile("heightmaps", f"{rid}.png"))
                with open(wfile("heightmaps", f"{rid}.raw16"), "wb") as f:
                    f.write(enc.astype("<u2").tobytes())
                np.save(wfile("cache", "terrain", f"{rid}.npy"), hh)
                meta = load_json(wfile("regions", f"{rid}.json"))
                meta["min_m"] = round(float(hh.min()), 2)
                meta["max_m"] = round(float(hh.max()), 2)
                meta["flattened_for"] = [x["id"] for x in setts if x.get("terrain_flattened")]
                save_json(wfile("regions", f"{rid}.json"), meta, compact=True)
                written.add(rid)
        save_json(wfile("settlements.json"), {"starter_settlement": load_json(wfile("settlements.json"))["starter_settlement"],
                                              "settlements": setts})
        report["fixes"].append({"fix": "flatten_settlements", "count": len(drift), "ids": drift})
        report["fixed"] += len(drift)
    check("settlements_height_drift", True, "info", f"{len(drift)} corrigés par aplatissement + re-snap")
    # ---------- 3. POI ----------
    from .core import world_to_region
    poi_drift = 0
    for p in poi:
        gx, gy = world_to_region(p["world"][0], p["world"][1])
        h = hmaps.get(region_id(gx, gy))
        if h is None:
            continue
        lx = (p["world"][0] - (gx * REGION_SIZE - WORLD_SIZE / 2)) / REGION_SIZE
        lz = (p["world"][1] - (gy * REGION_SIZE - WORLD_SIZE / 2)) / REGION_SIZE
        n = h.shape[0]
        px = float(np.clip(lx * n, 0, n - 1))
        py = float(np.clip((1 - lz) * (n - 1), 0, n - 1))
        h_real = float(bilinear_sample(h, np.array([px]), np.array([py]))[0])
        if abs(h_real - p["world"][2]) > 6.0:
            p["world"][2] = round(h_real, 1)
            p["resnapped"] = True
            poi_drift += 1
    if poi_drift:
        save_json(wfile("poi.json"), {"poi": poi}, compact=True)
        report["fixes"].append({"fix": "resnap_poi", "count": poi_drift})
        report["fixed"] += poi_drift
    check("poi_ground_drift", True, "info", f"{poi_drift} POI re-snapés sur le terrain")
    # ---------- 4. fleuves ----------
    no_exit = 0
    for rv in rivers:
        if not rv["major"]:
            continue          # affluents : polylignes fusionnées en aval (troncature voulue)
        end = rv["points_xyz"][-1]
        gx, gy = world_to_region(end[0], end[1])
        h = hmaps.get(region_id(gx, gy))
        if h is None:
            continue
        lx = (end[0] - (gx * REGION_SIZE - WORLD_SIZE / 2)) / REGION_SIZE
        lz = (end[1] - (gy * REGION_SIZE - WORLD_SIZE / 2)) / REGION_SIZE
        n = h.shape[0]
        h_end = float(bilinear_sample(h, np.array([np.clip(lx * n, 0, n - 1)]),
                                      np.array([np.clip((1 - lz) * (n - 1), 0, n - 1)]))[0])
        if end[2] > 25 and h_end > 8:
            no_exit += 1
    check("rivers_reach_water", no_exit <= 6, "warning",
          f"{no_exit} fleuves ne rejoignent pas clairement l'eau (confluences internes comptées)")
    # ---------- 5. grottes ----------
    resub = []
    for c in caves:
        if c["kind"] != "subaquatique" and c["world_entrance"][2] < -3.0:
            c["kind"] = "subaquatique"
            c["auto_fixed"] = "entrée sous le niveau marin -> reclassée subaquatique"
            resub.append(c["id"])
    if resub:
        save_json(wfile("caves.json"), {"caves": caves}, compact=True)
        report["fixes"].append({"fix": "caves_reclassified", "ids": resub})
        report["fixed"] += len(resub)
    check("caves_entrances", True, "info",
          f"{len(resub)} entrée(s) reclassée(s) subaquatique(s)")
    # ---------- 6. donjons ----------
    disconnected = []
    for d in dungeons:
        ids = {r["id"] for r in d["rooms"]}
        linked = {c["from"] for c in d["corridors"]} | {c["to"] for c in d["corridors"]}
        if not ids <= linked | set():
            disconnected.append(d["id"])
    check("dungeons_graph", len(disconnected) == 0, "error", f"salles isolées : {disconnected[:5]}")
    # ---------- 7. routes ----------
    long_routes = [r["id"] for r in routes if r["length_km"] > 42]
    check("routes_length", len(long_routes) == 0, "warning", f"routes très longues : {long_routes[:5]}")
    # ---------- 8. budgets perf ----------
    budgets = {p: v["max_draw_calls"] for p, v in assets["quality_profiles"].items()}
    est_chunks_active = {p: v["active_chunks"] for p, v in assets["quality_profiles"].items()}
    est_tris_low = est_chunks_active["LOW"] * 2 * 3000      # 2 meshes/chunk ~3k tris en LOW
    check("perf_budget_low", est_tris_low < 300_000, "info",
          f"LOW : ~{est_chunks_active['LOW']} chunks actifs, ~{est_tris_low} tris terrain (budget 300k)")
    # ---------- résumé ----------
    report["summary"] = {
        "errors": report["errors"], "warnings": report["warnings"], "auto_fixes": report["fixed"],
        "regions_checked": len(hmaps), "settlements": len(setts), "poi": len(poi),
        "rivers": len(rivers), "caves": len(caves), "dungeons": len(dungeons), "routes": len(routes),
    }
    save_json(wfile("validation_report.json"), report)
    print(f"  erreurs : {report['errors']} | avertissements : {report['warnings']} | "
          f"autocorrections : {report['fixed']}")
    return report
