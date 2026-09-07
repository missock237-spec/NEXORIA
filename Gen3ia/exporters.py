"""Gen3ia.exporters — cartes PNG du monde + meshes OBJ (LOD) de la région de départ.

Cartes (2048 px) :
  world_map.png          biomes + relief ombré + fleuves + lacs + routes + villes + territoires
  world_map_relief.png   élévation ombrée (échelle hypsométrique)
  world_map_political.png cultures/établissements/continents étiquetés
  world_map_corruption.png territoires des 10 Suprêmes
  region_atlas.png       grille 16×16 des régions avec IDs
Meshes OBJ : monde en aperçu + région de départ en LOD0/LOD1 (chunks 256 m).
"""
from __future__ import annotations
import math
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from .core import (WORLD_SIZE, REGION_SIZE, CHUNK_SIZE, region_id, save_json,
                   wfile, load_json, world_to_map, world_to_region)
from .noise import bilinear_sample
from .climate import BIOMES

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def _hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _hillshade(elev, azimuth_deg=315.0, altitude_deg=45.0, res_m=32.0):
    gz, gx = np.gradient(elev, res_m)
    slope = np.pi / 2 - np.arctan(np.hypot(gx, gz))
    aspect = np.arctan2(-gx, gz)
    az, alt = math.radians(azimuth_deg), math.radians(altitude_deg)
    shd = np.sin(alt) * np.sin(slope) + np.cos(alt) * np.cos(slope) * np.cos(az - aspect)
    return np.clip(shd, 0, 1)


def _base_layers():
    elev = np.load(wfile("cache", "elev_hydro.npy"))
    biome_idx = np.load(wfile("cache", "biome.npy"))
    from .climate import BIOME_LIST
    biome_map = np.array(BIOME_LIST, dtype=object)[biome_idx]
    return elev, biome_map


def _draw_water_and_rivers(img, res):
    d = ImageDraw.Draw(img)
    rivers = load_json(wfile("rivers.json"))["rivers"]
    for rv in rivers:
        pts = [world_to_map(p[0], p[1], res) for p in rv["points_xyz"]]
        w = 2 if not rv["major"] else 3
        d.line(pts, fill=(40, 90, 140), width=w, joint="curve")
    for lk in load_json(wfile("lakes.json"))["lakes"]:
        px, py = world_to_map(lk["world"][0], lk["world"][1], res)
        r = max(1.5, lk["radius_m"] / (WORLD_SIZE / res))
        d.ellipse([px - r, py - r, px + r, py + r], fill=(60, 130, 180))


def _draw_settlements_routes(img, res, labels=True):
    d = ImageDraw.Draw(img)
    for rt in load_json(wfile("routes.json"))["routes"]:
        pts = [world_to_map(p[0], p[1], res) for p in rt["points"]]
        d.line(pts, fill=(120, 90, 60), width=1)
    for s in load_json(wfile("settlements.json"))["settlements"]:
        px, py = world_to_map(s["world"][0], s["world"][1], res)
        size = {"capital": 7, "town": 5, "village": 3, "hamlet": 2}[s["size_class"]]
        col = (255, 235, 180) if s["size_class"] in ("capital", "town") else (220, 200, 160)
        d.ellipse([px - size / 2, py - size / 2, px + size / 2, py + size / 2],
                  outline=(30, 25, 20), width=1, fill=col)
        if labels and s["size_class"] in ("capital", "town"):
            f = ImageFont.truetype(FONT, 13 if s["size_class"] == "capital" else 11)
            d.text((px + 6, py - 6), s["name"], font=f, fill=(25, 20, 15),
                   stroke_width=2, stroke_fill=(255, 250, 235))


def _draw_supremes(img, res, strength=110):
    ov = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    for s in load_json(wfile("supremes.json"))["supremes"]:
        px, py = world_to_map(s["lair_world"][0], s["lair_world"][1], res)
        r = s["territory_radius_m"] * 2.2 / (WORLD_SIZE / res)
        rgb = _hex2rgb(s["corruption_color"])
        for k, rr, a in ((0, r, strength), (1, r * 0.55, strength + 45)):
            d.ellipse([px - rr, py - rr, px + rr, py + rr], fill=rgb + (a,))
        f = ImageFont.truetype(FONT, 14)
        d.text((px + 6, py - 16), s["key"], font=f, fill=(20, 12, 12), stroke_width=2,
               stroke_fill=(255, 245, 230))
    return Image.alpha_composite(img.convert("RGBA"), ov).convert("RGB")


def _draw_continents(img, res):
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(FONT, 26)
    for c in load_json(wfile("world.json"))["continents"]:
        px, py = world_to_map(c["centroid_world"][0], c["centroid_world"][1], res)
        d.text((px, py), c["name"].upper(), font=f, fill=(35, 30, 25),
               stroke_width=3, stroke_fill=(250, 245, 230), anchor="mm")


def _to_rgb(elev, biome_map, shade=True):
    res = biome_map.shape[0]
    f = elev.shape[0] // res
    elev_l = elev.reshape(res, f, res, f).mean(axis=(1, 3))
    rgb = np.zeros((res, res, 3), dtype=np.float32)
    for bname, meta in BIOMES.items():
        m = biome_map == bname
        if not m.any():
            continue
        rgb[m] = _hex2rgb(meta["color"])
    if shade:
        sh = _hillshade(elev_l, res_m=WORLD_SIZE / res)
        rgb *= (0.62 + 0.55 * sh)[..., None]
    return np.clip(rgb, 0, 255).astype(np.uint8)


def export_all_maps():
    print("[Gen3ia] Cartes PNG...")
    elev, biome_map = _base_layers()
    res = biome_map.shape[0]
    fe = elev.shape[0] // res
    elev_l = elev.reshape(res, fe, res, fe).mean(axis=(1, 3))
    # 1) carte principale
    img = Image.fromarray(_to_rgb(elev, biome_map))
    _draw_water_and_rivers(img, res)
    _draw_settlements_routes(img, res)
    img = _draw_supremes(img, res, strength=70)
    _draw_continents(img, res)
    img.save(wfile("maps", "world_map.png"))
    # 2) relief pur
    sh = _hillshade(elev_l)
    rel = np.zeros((res, res, 3), np.float32)
    lo, hi = -3200.0, 4600.0
    # rampes simples : mer bleu -> sable -> vert -> brun -> blanc
    stops = [(0.0, (16, 32, 64)), (0.47, (26, 74, 120)), (0.5, (212, 198, 148)),
             (0.60, (88, 138, 66)), (0.78, (128, 112, 88)), (0.92, (168, 162, 156)), (1.0, (248, 250, 252))]
    t = np.clip((elev_l - lo) / (hi - lo), 0, 1)
    for (t0, c0), (t1, c1) in zip(stops[:-1], stops[1:]):
        m = (t >= t0) & (t <= t1)
        f = np.where(t1 > t0, (t - t0) / (t1 - t0), 0)
        for ch in range(3):
            rel[..., ch][m] = (c0[ch] + (c1[ch] - c0[ch]) * f)[m]
    rel *= (0.55 + 0.6 * sh)[..., None]
    Image.fromarray(np.clip(rel, 0, 255).astype(np.uint8)).save(wfile("maps", "world_map_relief.png"))
    # 3) politique (sans relief ombré lourd)
    img3 = Image.fromarray(_to_rgb(elev, biome_map, shade=False))
    _draw_water_and_rivers(img3, res)
    _draw_settlements_routes(img3, res, labels=True)
    _draw_continents(img3, res)
    img3.save(wfile("maps", "world_map_political.png"))
    # 4) corruption
    img4 = Image.fromarray(_to_rgb(elev, biome_map, shade=True))
    _draw_water_and_rivers(img4, res)
    img4 = _draw_supremes(img4, res, strength=120)
    img4.save(wfile("maps", "world_map_corruption.png"))
    # 5) atlas des régions
    n = 16
    tile = 64
    atlas = Image.new("RGB", (n * tile + n + 1, n * tile + n + 1), (24, 24, 24))
    d = ImageDraw.Draw(atlas)
    small = np.array(img.resize((n * 8, n * 8), Image.NEAREST))
    regions_meta = load_json(wfile("regions.json"))["regions"]
    for gy in range(n):
        for gx in range(n):
            x0, y0 = gx * (tile + 1) + 1, gy * (tile + 1) + 1
            crop = Image.fromarray(small[(n - 1 - gy) * 8:(n - gy) * 8, gx * 8:(gx + 1) * 8])
            atlas.paste(crop.resize((tile, tile)), (x0, y0))
            rg = regions_meta[gy * n + gx]
            d.text((x0 + 3, y0 + 2), str(rg["index"]), font=ImageFont.truetype(FONT, 11),
                   fill=(255, 255, 255), stroke_width=2, stroke_fill=(0, 0, 0))
    atlas.save(wfile("maps", "region_atlas.png"))
    sizes = {f: f"{os.path.getsize(wfile('maps', f)) // 1024} Ko" for f in
             os.listdir(wfile("maps"))}
    print(f"  5 cartes écrites {sizes}")
    return {"maps": list(sizes.keys())}


# ---------------------------------------------------------------------------
# MESHES OBJ
# ---------------------------------------------------------------------------
def _write_obj(path, verts, uvs, faces, comment=""):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(f"# NEXORIA — {comment}\n")
        f.write(f"# verts={len(verts)} faces={len(faces)}\n")
        for v in verts:
            f.write(f"v {v[0]:.2f} {v[1]:.2f} {v[2]:.2f}\n")
        for uv in uvs:
            f.write(f"vt {uv[0]:.4f} {uv[1]:.4f}\n")
        for a, b, c in faces:
            f.write(f"f {a}/{a} {b}/{b} {c}/{c}\n")


def _grid_mesh(hmap, world_x0, world_z0, step, res):
    """Construit (verts, uvs, faces) d'une grille Y-up, rangée 0 = nord."""
    n = hmap.shape[0] if isinstance(hmap, np.ndarray) else res
    verts, uvs = [], []
    for j in range(res):
        for i in range(res):
            x = world_x0 + i * step
            z = world_z0 + (res - 1 - j) * step     # j=0 = nord -> z max
            h = float(hmap[j, i]) if hmap is not None else 0.0
            verts.append((x, h, z))
            uvs.append((i / (res - 1), j / (res - 1)))
    faces = []
    for j in range(res - 1):
        for i in range(res - 1):
            a = j * res + i + 1
            b = a + 1
            c = (j + 1) * res + i + 1
            d = c + 1
            faces.append((a, c, b))
            faces.append((b, c, d))
    return verts, uvs, faces


def _upsample_h(h: np.ndarray, n_out: int) -> np.ndarray:
    """Sur-échantillonnage bilinéaire 16 m/px -> grille n_out (pour LOD0/LOD1)."""
    n_in = h.shape[0]
    ys = np.linspace(0, n_in - 1.001, n_out)
    y0 = ys.astype(int); y1 = np.minimum(y0 + 1, n_in - 1); fy = ys - y0
    rows = np.empty((n_out, n_in), dtype=np.float64)
    for j in range(n_out):
        rows[j, :] = h[y0[j]] * (1 - fy[j]) + h[y1[j]] * fy[j]   # interpolation en y
    # interpolation en x
    xs = np.linspace(0, n_in - 1.001, n_out)
    x0 = xs.astype(int); x1 = np.minimum(x0 + 1, n_in - 1); fx = (xs - x0)[None, :]
    return rows[:, x0] * (1 - fx) + rows[:, x1] * fx


def export_hero_meshes():
    print("[Gen3ia] Meshes OBJ (région de départ + aperçu monde)...")
    setts = load_json(wfile("settlements.json"))
    starter = next(s for s in setts["settlements"] if s["id"] == setts["starter_settlement"])
    gx, gy = starter["region_grid"] if "region_grid" in starter else world_to_region(*starter["world"][:2])
    rid = region_id(gx, gy)
    hmap = np.load(wfile("cache", "terrain", f"{rid}.npy"))
    x0 = gx * REGION_SIZE - WORLD_SIZE / 2
    z0 = gy * REGION_SIZE - WORLD_SIZE / 2
    total = 0
    # aperçu monde 128²
    elev = np.load(wfile("cache", "elev_hydro.npy"))
    wsm = elev.reshape(128, 16, 128, 16).mean(axis=(1, 3))
    v, uv, fc = _grid_mesh(wsm, -WORLD_SIZE / 2, -WORLD_SIZE / 2, WORLD_SIZE / 127, 128)
    _write_obj(wfile("meshes", "world_preview.obj"), v, uv, fc, "aperçu monde 128×128 (512 m/vert)")
    total += len(fc)
    # région de départ : LOD1 (32² par chunk) sur la zone 8×8 chunks autour de la capitale
    lx = (starter["world"][0] - x0) / CHUNK_SIZE
    lz = (starter["world"][1] - z0) / CHUNK_SIZE
    cgx0 = int(max(0, min(16 - 8, lx - 4)))
    cgy0 = int(max(0, min(16 - 8, lz - 4)))
    for cgy in range(cgy0, cgy0 + 8):
        for cgx in range(cgx0, cgx0 + 8):
            dec = hmap[cgy * 16:(cgy + 1) * 16, cgx * 16:(cgx + 1) * 16]
            up = _upsample_h(dec.astype(np.float64), 32)
            v, uv, fc = _grid_mesh(up, x0 + cgx * CHUNK_SIZE, z0 + cgy * CHUNK_SIZE,
                                   CHUNK_SIZE / 31, 32)
            cid = f"CHUNK_{gx * 16 + cgx:03d}_{gy * 16 + cgy:03d}"
            _write_obj(wfile("meshes", "starter_lod1", f"{cid}.obj"), v, uv, fc,
                       f"région {rid} chunk LOD1 (8 m/vert)")
            total += len(fc)
    # cœur 4×4 chunks en LOD0 (64² par chunk = 4 m/vert)
    for cgy in range(int(lz) - 2, int(lz) + 2):
        for cgx in range(int(lx) - 2, int(lx) + 2):
            if not (0 <= cgx < 16 and 0 <= cgy < 16):
                continue
            dec = hmap[cgy * 16:(cgy + 1) * 16, cgx * 16:(cgx + 1) * 16]
            up = _upsample_h(dec.astype(np.float64), 64)
            v, uv, fc = _grid_mesh(up, x0 + cgx * CHUNK_SIZE, z0 + cgy * CHUNK_SIZE,
                                   CHUNK_SIZE / 63, 64)
            cid = f"CHUNK_{gx * 16 + cgx:03d}_{gy * 16 + cgy:03d}"
            _write_obj(wfile("meshes", "starter_lod0", f"{cid}.obj"), v, uv, fc,
                       f"région {rid} chunk LOD0 (4 m/vert)")
            total += len(fc)
    save_json(wfile("meshes", "manifest.json"), {
        "starter_region": rid, "starter_settlement": starter["id"],
        "world_preview": "world_preview.obj (128×128, 512 m/vert)",
        "starter_lod0": "starter_lod0/ : cœur 4×4 chunks autour de la capitale, 4 m/vert",
        "starter_lod1": "starter_lod1/ : 8×8 chunks, 8 m/vert",
        "triangles_total": total,
        "note": "OBJ d'aperçu (pas d'UV monde ni matériaux) — Unity reconstruit les meshes "
                "depuis les heightmaps RAW16 via Game/World/TerrainChunkBuilder.cs",
    })
    print(f"  meshes écrits ({total} triangles cumulés)")
    return {"triangles": total}


def encode_u16(h):
    return ((h - (-4096.0)) / (6144.0 - (-4096.0)) * 65535.0).clip(0, 65535).astype(np.uint16)
