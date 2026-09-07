"""Gen3ia.docs — étape 19 : documentation du monde générée depuis les bases JSON.

Produit Documentation/03..09 + 13..14 (bases de données lisibles, tables,
statistiques). Les documents de vision/architecture (00,01,02,10,11,12,15)
sont rédigés à la main et complétés par ces données.
"""
from __future__ import annotations
import os
import time
import numpy as np
from .core import ROOT, load_json, wfile

DOC = os.path.join(ROOT, "Documentation")


def _w(name: str, text: str):
    os.makedirs(DOC, exist_ok=True)
    with open(os.path.join(DOC, name), "w", encoding="utf-8") as f:
        f.write(text)


def _hdr(title, intro=""):
    return f"# {title}\n\n> Document GÉNÉRÉ par Gen3ia depuis WorldData/ — ne pas éditer à la main.\n{intro}\n"


def gen_region_db():
    d = load_json(wfile("regions.json"))["regions"]
    land = [r for r in d if r["land_fraction"] >= 0.04]
    md = [_hdr("REGION_DATABASE — 256 régions",
               f"\n{len(land)} régions terrestres/côtières, {len(d)-land.__len__()} océaniques. "
               f"Grille 16×16, 4 096 m. ID = REGION_{chr(123)}index:03d{chr(125)} (balayage sud→nord).\n")]
    md.append("| ID | Nom | Biome dominant | Niveau | Terre % | Alt. moy. | Continent | Connexions |")
    md.append("|---|---|---|---|---|---|---|---|")
    for r in d[:120]:  # les 120 premières (échantillon lisible, JSON complet référencé)
        alt = r["altitude"]["mean_m"]
        md.append(f"| {r['id']} | {r['name']} | {r['dominant_biome']} | {r['recommended_level']} | "
                  f"{int(r['land_fraction']*100)} % | {alt:.0f} m | {r['continent'] or '—'} | {len(r['connections'])} |")
    md.append(f"\n*(table tronquée à 120 lignes — les {len(d)} régions complètes sont dans `WorldData/regions.json`)*\n")
    # focus régions Suprêmes
    md.append("\n## Régions exposées à une corruption de Suprême\n")
    md.append("| Région | Nom | Exposition | Niveau |")
    md.append("|---|---|---|---|")
    for r in sorted(d, key=lambda x: -x.get("supreme_exposure", 0))[:14]:
        if r.get("supreme_exposure", 0) > 0.15:
            md.append(f"| {r['id']} | {r['name']} | {int(r['supreme_exposure']*100)} % | {r['recommended_level']} |")
    _w("03_REGION_DATABASE.md", "\n".join(md))


def gen_biome_db():
    d = load_json(wfile("biomes.json"))
    md = [_hdr("BIOME_DATABASE", f"\nModèle : {d['generation']['temperature_model']} ; "
               f"{d['generation']['moisture_model']} ; vents {d['generation']['prevailing_wind']}.\n")]
    md.append("| Biome | Couleur | Fraction du monde |")
    md.append("|---|---|---|")
    for b, frac in sorted(d["fractions"].items(), key=lambda x: -x[1]):
        col = d["biome_table"].get(b, {}).get("color", "#888888")
        md.append(f"| `{b}` | {col} | {frac*100:.2f} % |")
    _w("04_BIOME_DATABASE.md", "\n".join(md))


def gen_poi_db():
    d = load_json(wfile("poi.json"))["poi"]
    kinds = {}
    for p in d:
        kinds.setdefault(p["type"], []).append(p)
    md = [_hdr("POI_DATABASE", f"\n{len(d)} points d'intérêt, "
               f"{sum(1 for p in d if p['hidden_secret'])} secrets cachés.\n")]
    for k, lst in sorted(kinds.items(), key=lambda x: -len(x[1])):
        md.append(f"\n## {k} ({len(lst)})\n")
        md.append("| ID | Nom | Région | Coordonnées monde | Secret |")
        md.append("|---|---|---|---|---|")
        for p in lst[:10]:
            w = p["world"]
            md.append(f"| {p['id']} | {p['name']} | {p['region']} | ({w[0]:.0f}, {w[1]:.0f}, {w[2]:.0f}) | "
                      f"{'🔒' if p['hidden_secret'] else '—'} |")
        if len(lst) > 10:
            md.append(f"\n*(+{len(lst)-10} autres — voir `WorldData/poi.json`)*")
    _w("05_POI_DATABASE.md", "\n".join(md))


def gen_dungeon_db():
    d = load_json(wfile("dungeons.json"))["dungeons"]
    sup = {s["lair_dungeon"]: s["key"] for s in load_json(wfile("supremes.json"))["supremes"] if s["lair_dungeon"]}
    md = [_hdr("DUNGEON_DATABASE", f"\n{len(d)} donjons explorables (graphes de salles en JSON).")]
    md.append("\n| ID | Nom | Thème | Niveau | Salles | Région | Antre de |")
    md.append("|---|---|---|---|---|---|---|")
    for x in d:
        md.append(f"| {x['id']} | {x['name']} | {x['theme']} | {x['recommended_level']} | "
                  f"{len(x['rooms'])} | {x['region']} | {sup.get(x['id'], '—')} |")
    md.append("\n## Exemple de structure (DUNG_001)\n")
    x = d[0]
    md.append("```")
    for room in x["rooms"]:
        md.append(f"  salle {room['id']:>2} : {room['type']} {room.get('size_m','')}")
    md.append("```")
    _w("06_DUNGEON_DATABASE.md", "\n".join(md))


def gen_cave_db():
    d = load_json(wfile("caves.json"))["caves"]
    md = [_hdr("CAVE_DATABASE", f"\n{len(d)} systèmes de grottes (graphes 3D : nœuds + galeries).")]
    md.append("\n| ID | Nom | Type | Taille | Profondeur | Cachée | Région | Nœuds |")
    md.append("|---|---|---|---|---|---|---|---|")
    for c in d:
        md.append(f"| {c['id']} | {c['name']} | {c['kind']} | {c['size_class']} | {c['depth_m']:.0f} m | "
                  f"{'oui' if c['hidden'] else '—'} | {c['region']} | {len(c['nodes'])} |")
    _w("07_CAVE_DATABASE.md", "\n".join(md))


def gen_mountain_db():
    mts = load_json(wfile("mountains.json"))["mountain_ranges"]
    riv = load_json(wfile("rivers.json"))["rivers"]
    lakes = load_json(wfile("lakes.json"))["lakes"]
    w = load_json(wfile("world.json"))["world"]
    md = [_hdr("MOUNTAIN_DATABASE (+ hydrologie)",
               f"\nMonde : {w['size_m']//1000} km², {w['land_fraction']*100:.0f} % de terres, "
               f"point culminant {w['highest_point_m']} m, abysse {w['deepest_ocean_m']} m.\n")]
    md.append("## Chaînes de montagnes\n")
    md.append("| ID | Nom | Pics | Longueur | Plus haut sommet | Identité visuelle |")
    md.append("|---|---|---|---|---|---|")
    for m in mts:
        md.append(f"| {m['id']} | {m['name']} | {m['peak_count']} | {m['length_km']} km | "
                  f"{m['highest_peak']['name']} ({m['highest_peak']['altitude_m']:.0f} m) | {m['visual_identity']} |")
    majors = [r for r in riv if r["major"]]
    md.append(f"\n## Hydrologie — {len(riv)} cours d'eau dont {len(majors)} fleuves majeurs, {len(lakes)} lacs\n")
    md.append("| ID | Nom | Débit | Longueur |")
    md.append("|---|---|---|---|")
    for r in majors[:20]:
        md.append(f"| {r['id']} | {r['name']} | {r['flow_cells']} | {r['length_km']} km |")
    _w("08_MOUNTAIN_DATABASE.md", "\n".join(md))


def gen_ruin_db():
    civs = load_json(wfile("civilizations.json"))["civilizations"]
    ruins = load_json(wfile("ruins.json"))["ruins"]
    md = [_hdr("RUIN_DATABASE + civilisations anciennes", f"\n{len(ruins)} sites de ruines, 4 civilisations.\n")]
    for c in civs:
        n = sum(1 for r in ruins if r["civilization"] == c["id"])
        md.append(f"\n## {c['name']} ({c['id']}) — {n} sites, {c['era']}\n")
        md.append(f"- **Architecture** : {c['architecture']}")
        md.append(f"- **Matériaux** : {', '.join(c['materials'])}")
        md.append(f"- **Symboles** : {', '.join(c['symbols'])}")
        md.append(f"- **Langue** : {c['language']}")
        md.append(f"- **Technologie** : {c['technology']}")
        md.append(f"- **Religion** : {c['religion']}")
        md.append(f"- **Artefacts** : {', '.join(c['artefacts'])}")
        md.append(f"- **Chute** : {c['fall']}")
    md.append("\n## Index des ruines\n")
    md.append("| ID | Nom | Type | Civilisation | Secret | Indice Suprême |")
    md.append("|---|---|---|---|---|---|")
    for r in ruins:
        md.append(f"| {r['id']} | {r['name']} | {r['type']} | {r['civilization']} | "
                  f"{'oui' if r['has_secret'] else '—'} | {'oui' if r['supreme_hint'] else '—'} |")
    _w("09_RUIN_DATABASE.md", "\n".join(md))


def gen_validation_md():
    r = load_json(wfile("validation_report.json"))
    md = [_hdr("RAPPORT DE VALIDATION (étapes 17-18)")]
    s = r["summary"]
    md.append(f"\n**{s['errors']} erreur(s), {s['warnings']} avertissement(s), {s['auto_fixes']} autocorrection(s).**\n")
    md.append("| Contrôle | État | Détail |")
    md.append("|---|---|---|")
    for c in r["checks"]:
        mark = "✅" if c["ok"] else ("❌" if c["level"] == "error" else "⚠️")
        md.append(f"| {c['check']} | {mark} | {c['detail']} |")
    if r["fixes"]:
        md.append("\n## Autocorrections appliquées\n")
        for f in r["fixes"]:
            md.append(f"- `{f['fix']}` : {f.get('count', len(f.get('ids', [])))} élément(s)")
    md.append("\n## Limitations connues (honnêteté du pipeline)\n")
    md.append("- Les discontinuités résiduelles (≤ 22 m) se concentrent sur les falaises raides, "
              "où la méthode des différences secondes atteint sa limite ; en jeu, les chunks "
              "voisins partagent la même fonction de base, l'artefact reste local.")
    md.append("- La détection terre/mer des grottes utilise le masque 512 (128 m/px) ; "
              "le validateur reclasse en *subaquatique* toute entrée sous le niveau marin fin.")
    _w("14_VALIDATION_REPORT.md", "\n".join(md))


def gen_log_md():
    man = load_json(wfile("manifest.json"))["stages"]
    md = [_hdr("JOURNAL DE GÉNÉRATION")]
    md.append("\n| Étage | Horodatage | Durée |")
    md.append("|---|---|---|")
    for k, v in man.items():
        md.append(f"| {k} | {v['done_at']} | {v.get('seconds', '?')} s |")
    md.append("\nDéterminisme total : la même seed (`0x4E455852`) régénère exactement ce monde.\n")
    _w("13_GENERATION_LOG.md", "\n".join(md))


def generate_all_docs():
    print("[Gen3ia] Documentation générée...")
    gen_region_db(); gen_biome_db(); gen_poi_db(); gen_dungeon_db()
    gen_cave_db(); gen_mountain_db(); gen_ruin_db(); gen_validation_md(); gen_log_md()
    files = sorted(f for f in os.listdir(DOC) if f.endswith(".md"))
    print(f"  {len(files)} documents dans Documentation/ : {files}")
    return {"docs": files}
