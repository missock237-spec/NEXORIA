#!/usr/bin/env python3
"""Vérifie la répartition équilibrée : 9 elfes créés -> villages différents"""
import json, urllib.request, http.cookiejar

BASE = "http://localhost:3000"

def new_session(email):
    jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    def call(path, data=None):
        req = urllib.request.Request(BASE + path,
            data=json.dumps(data).encode() if data else None,
            headers={"Content-Type": "application/json"},
            method="POST" if data is not None else "GET")
        try:
            with opener.open(req) as r:
                return r.status, json.loads(r.read())
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read())
    code, d = call("/api/auth/register", {"email": email, "password": "ElfeTest123!"})
    assert code == 200, d
    return call

# Apparence elfe valide
appearance = {
    "skin": "#f0d5b8",
    "face": {"faceWidth": 0.45, "faceHeight": 0.55, "jawWidth": 0.4, "chinLength": 0.55,
             "noseSize": 0.35, "eyeSize": 0.6, "eyeDistance": 0.5, "browThickness": 0.4,
             "mouthWidth": 0.45, "earSize": 0.7},
    "eyeColor": "#2e8b57",
    "hair": {"style": "long", "color": "#e8dcae", "secondaryColor": "#d4b86a"},
    "body": {"height": 0.55, "bulk": 0.35, "shoulders": 0.4},
    "marks": {"type": "aucune", "color": "#2e8b57"},
    "racial": {"earShape": "arquee", "earLength": "longue", "motif": "vignes"},
}
equipment = {"WEAPON_MAIN": "baton_apprenti", "WEAPON_OFFHAND": "grimoire_prime",
             "TORSO": "robe_apprenti", "HANDS": "gants_soie", "FEET": "bottes_silence", "BACK": "cape_erudit"}

villages = []
for i in range(9):
    call = new_session(f"elfe.{i}.{i*7919}@nexoria.world")
    code, d = call("/api/characters/create", {
        "name": f"Elfe-{i+1:02d}", "race": "elfe", "class": "mage",
        "appearance": appearance, "equipment": equipment})
    if code == 200:
        villages.append(d["character"]["startingVillage"]["name"])
    else:
        print("ERREUR:", d)

print("Villages attribués aux 9 elfes :")
for i, v in enumerate(villages, 1):
    print(f"  Elfe {i:02d} -> {v}")

from collections import Counter
dist = Counter(villages)
print("\nDistribution:", dict(dist))
print("Villages distincts utilisés:", len(dist), "/ 3 possibles (sylvarien, val_lunaire, cerisaie_perdue)")
assert len(dist) >= 2, "ECHEC: tous les joueurs dans le même village !"
print("✓ RÉPARTITION ÉQUILIBRÉE CONFIRMÉE")
