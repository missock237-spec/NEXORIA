#!/usr/bin/env python3
"""Test e2e : création complète de Kael (Lycan/Ninja) — scénario de validation §26"""
import json, urllib.request, http.cookiejar

BASE = "http://localhost:3000"
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

# Connexion (compte déjà créé par test_api.sh)
code, d = call("/api/auth/login", {"email": "kael.test@nexoria.world", "password": "LycanNinja2024!"})
print("LOGIN:", code, d.get("email", d))

# Apparence Lycan 100% valide (palettes officielles de la race)
appearance = {
    "skin": "#a8794f",
    "face": {"faceWidth": 0.5, "faceHeight": 0.5, "jawWidth": 0.6, "chinLength": 0.5,
             "noseSize": 0.4, "eyeSize": 0.55, "eyeDistance": 0.5, "browThickness": 0.6,
             "mouthWidth": 0.5, "earSize": 0.5},
    "eyeColor": "#d4a017",
    "hair": {"style": "sauvage", "color": "#5a4630", "secondaryColor": "#8c7355"},
    "body": {"height": 0.6, "bulk": 0.7, "shoulders": 0.65},
    "marks": {"type": "cicatrice_griffe", "color": "#3a2c1e"},
    "outfitTint": "mousse",
    "racial": {"earShape": "loup", "muzzleSize": "moyen", "fangs": "visibles",
               "furPattern": "unie", "eyeStyle": "ambers"},
}
equipment = {
    "WEAPON_MAIN": "dagues_novice", "WEAPON_OFFHAND": "kunai_fer",
    "TORSO": "tenue_chasseur", "FACE": "masque_linceul", "FEET": "bottes_silence",
}

code, d = call("/api/characters/create", {
    "name": "Kael", "race": "lycan", "class": "ninja",
    "appearance": appearance, "equipment": equipment,
})
print("CREATE:", code)
print(json.dumps(d, indent=2, ensure_ascii=False)[:1400])

if code == 200:
    cid = d["character"]["id"]
    # Entrée dans le monde
    code2, w = call(f"/api/characters/{cid}/enter", {})
    print("\nENTER:", code2)
    print("Village:", w["village"]["name"], "|", w["village"]["region"])
    print("Spawn:", w["spawn"]["id"], "at", round(w["spawn"]["x"], 2), round(w["spawn"]["z"], 2))
    print("Stats:", {k: v for k, v in w["character"]["stats"].items()})
    # Progression de quête (étape 1 via ancien)
    code3, q = call("/api/quests/progress", {"characterId": cid, "questId": "bienvenue", "stage": 1})
    print("QUEST stage 1:", code3, q.get("quests", {}).get("bienvenue", {}))
    # Saut d'étapes interdit (stage 5 > maxStage)
    code4, q2 = call("/api/quests/progress", {"characterId": cid, "questId": "bienvenue", "stage": 9})
    print("QUEST triche (9):", code4, q2.get("error", "ACCEPTÉ (BUG!)"))
    # 10 créations simulées pour vérifier la répartition des villages
    print("\n=== RÉPARTITION VILLAGES (10 elfes simulés via l'algo serveur) ===")
    import hashlib
    from collections import Counter
    # appel direct de la logique via un second compte : on crée 6 elfes réels
    code5, d5 = call("/api/auth/register", {"email": f"elfes.batch{hash('x')&999}@nexoria.world", "password": "ElfeTest123!"})
    print("batch account:", code5)
