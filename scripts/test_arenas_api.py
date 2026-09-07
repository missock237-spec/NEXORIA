#!/usr/bin/env python3
"""Tests anti-triche et parcours serveur pour la mise à jour Arènes & Suprêmes."""
import json, time, urllib.request, http.cookiejar, sys

BASE = 'http://localhost:3000'
jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
PASS = FAIL = 0

def call(method, path, body=None):
    req = urllib.request.Request(BASE + path, method=method)
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        req.add_header('Content-Type', 'application/json')
    try:
        r = opener.open(req, data, timeout=20)
        return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode())
        except Exception: return e.code, {}

def check(name, cond, detail=''):
    global PASS, FAIL
    if cond: PASS += 1; print(f'  OK  {name}')
    else: FAIL += 1; print(f'  FAIL {name} {detail}')

# 1. Sans session → refus
s, d = call('GET', '/api/arenas?characterId=x')
check('arènes sans session refusé', s == 401, str(d))
s, d = call('POST', '/api/arenas/match', {'characterId': 'x', 'arenaId': 'volcan'})
check('matchmaking sans session refusé', s == 401, str(d))
s, d = call('POST', '/api/supremes/challenge', {'characterId': 'x', 'supremeId': 'aetherion'})
check('défi sans session refusé', s == 401, str(d))

# 2. Inscription + connexion
email = f'arena_{int(time.time())}@test.nx'
s, d = call('POST', '/api/auth/register', {'email': email, 'password': 'Forge#2026!'})
check('inscription', s == 200, str(d))
rec = d.get('recoveryKey', '')
s, d = call('POST', '/api/auth/login', {'email': email, 'password': 'Forge#2026!'})
check('connexion', s == 200, str(d))

# 3. Création de personnage (race/classe valides, apparence par défaut)
s, d = call('GET', '/api/world/config')
races = {r['id']: r for r in d['races']}
app = {
  'skin': races['humain']['morphology']['skinTones'][0],
  'face': {k: 0.5 for k in ['faceWidth','faceHeight','jawWidth','chinLength','noseSize','eyeSize','eyeDistance','browThickness','mouthWidth','earSize']},
  'eyeColor': races['humain']['morphology']['eyeColors'][0],
  'hair': {'style': races['humain']['morphology']['hairStyles'][0], 'color': races['humain']['morphology']['hairColors'][0], 'secondaryColor': races['humain']['morphology']['hairColors'][-1]},
  'body': {'height': 0.5, 'bulk': 0.5, 'shoulders': 0.5},
  'marks': {'type': 'aucune', 'color': '#8c1d1d'},
  'racial': {opt['key']: opt['default'] for opt in races['humain']['racialOptions']},
  'outfitTint': 'naturel',
}
s, d = call('POST', '/api/characters/create', {
  'name': f'Testeur{int(time.time())%10000}', 'race': 'humain', 'class': 'ninja',
  'appearance': app, 'equipment': {},
})
check('création personnage', s == 200, str(d)[:300])
cid = d['character']['id'] if s == 200 else ''

# 4. Arène inconnue refusée
s, d = call('POST', '/api/arenas/match', {'characterId': cid, 'arenaId': 'lune'})
check('arène inconnue refusée', s == 400, str(d))

# 5. Matchmaking OK → stats serveur présentes
s, d = call('POST', '/api/arenas/match', {'characterId': cid, 'arenaId': 'foret_eternelle'})
check('matchmaking forêt', s == 200 and d.get('match', {}).get('id'), str(d)[:200])
match_id = d['match']['id'] if s == 200 else ''
check('stats adversaire serveur', s == 200 and d['opponent']['stats']['maxHp'] > 0)
check('mode entraînement auto (niveau 1 < 40)', d.get('match', {}).get('training') is True, str(d.get('match')))
check('seed fourni', isinstance(d.get('match', {}).get('seed'), int))

# 6. Double matchmaking refusé
s, d2 = call('POST', '/api/arenas/match', {'characterId': cid, 'arenaId': 'volcan'})
check('double duel refusé', s == 409, f'{s} {d2}')

# 7. Résolution invalide refusée (durée trop courte)
s, d = call('POST', '/api/arenas/resolve', {'characterId': cid, 'matchId': match_id, 'result': 'win', 'durationSec': 1})
check('résolution durée < 4s refusée', s == 400, str(d))

# 8. Résolution d'un match inexistant refusée
s, d = call('POST', '/api/arenas/resolve', {'characterId': cid, 'matchId': 'inconnu', 'result': 'win', 'durationSec': 30})
check('match inexistant refusé', s == 404, str(d))

# 9. Victoire honnête (12 s) acceptée + Elo
time.sleep(12)
s, d = call('POST', '/api/arenas/resolve', {'characterId': cid, 'matchId': match_id, 'result': 'win', 'durationSec': 12})
check('victoire résolue', s == 200 and d.get('result') == 'win', str(d)[:200])
if s == 200:
    check('rating mis à jour', isinstance(d.get('rating'), int))
    check('delta Elo positif', d.get('ratingDelta', 0) > 0, str(d.get('ratingDelta')))
    check('or gagné (réduit entraînement)', 0 < d.get('goldEarned', 0) <= 30, str(d.get('goldEarned')))
    check('titre de rang attribué', bool(d.get('rankTitle')))

# 10. Double résolution refusée
s, d = call('POST', '/api/arenas/resolve', {'characterId': cid, 'matchId': match_id, 'result': 'win', 'durationSec': 12})
check('double résolution refusée', s == 409, str(d))

# 11. Classement fusionne joueurs + gladiateurs
s, d = call('GET', '/api/arenas/leaderboard')
check('classement non vide', s == 200 and len(d.get('leaderboard', [])) >= 20)
has_player = any(e.get('isPlayer') for e in d.get('leaderboard', []))
has_ai = any(not e.get('isPlayer') for e in d.get('leaderboard', []))
check('classement contient joueur réel + IA', has_player and has_ai)
ratings = [e['rating'] for e in d['leaderboard']]
check('classement trié', ratings == sorted(ratings, reverse=True))

# 12. Suprême inconnu / non implémenté refusés
s, d = call('POST', '/api/supremes/challenge', {'characterId': cid, 'supremeId': 'ignarok'})
check('IGNAROK non affrontable refusé', s == 409, str(d))
s, d = call('POST', '/api/supremes/challenge', {'characterId': cid, 'supremeId': 'zzz'})
check('suprême inconnu refusé', s == 400, str(d))

# 13. Défi AETHERION OK → PV serveur + 3 phases
s, d = call('POST', '/api/supremes/challenge', {'characterId': cid, 'supremeId': 'aetherion'})
check('défi Aetherion créé', s == 200 and d.get('encounter', {}).get('id'), str(d)[:200])
enc_id = d['encounter']['id'] if s == 200 else ''
boss_hp = d['encounter']['bossHp'] if s == 200 else 0
check('PV boss calculés serveur (niveau 1 → 325)', boss_hp == 325, str(boss_hp))
check('3 phases transmises', len(d.get('encounter', {}).get('phases', [])) == 3)
check('tentative comptée', d.get('attempts') == 1)

# 14. Victoire trop rapide refusée (phase < 8 s)
s, d = call('POST', '/api/supremes/resolve', {'characterId': cid, 'encounterId': enc_id, 'result': 'victory', 'durationSec': 20, 'phases': [5, 12, 20]})
check('victoire éclair (phase 5s) refusée', s == 400, str(d))

# 15. Défaite honnête acceptée (clôture la tentative) — attends l'horloge serveur
print('  … attente 26 s (validation horloge serveur)')
time.sleep(26)
s, d = call('POST', '/api/supremes/resolve', {'characterId': cid, 'encounterId': enc_id, 'result': 'defeat', 'durationSec': 26, 'phases': []})
check('défaite résolue', s == 200 and d.get('result') == 'defeat', str(d)[:200])

# 16. Double résolution boss refusée
s, d = call('POST', '/api/supremes/resolve', {'characterId': cid, 'encounterId': enc_id, 'result': 'defeat', 'durationSec': 26, 'phases': []})
check('double résolution boss refusée', s == 409, str(d))

# 17. Vraie victoire en 3 phases honnêtes (nouvelle tentative)
print('  … attente 26 s (la tentative 2 doit durer plus que son horloge)')
time.sleep(26)
s, d = call('POST', '/api/supremes/challenge', {'characterId': cid, 'supremeId': 'aetherion'})
check('2e défi Aetherion (tentative n°2)', s == 200 and d.get('attempts') == 2, str(d)[:150])
enc2 = d['encounter']['id'] if s == 200 else ''
print('  … attente 42 s (durée honnête de la victoire)')
time.sleep(42)
s, d = call('POST', '/api/supremes/resolve', {'characterId': cid, 'encounterId': enc2, 'result': 'victory', 'durationSec': 42, 'phases': [12, 24, 40]})
check('victoire 3 phases (12/24/40s) acceptée', s == 200 and d.get('result') == 'victory', str(d)[:200])
if s == 200:
    check('première victoire → 4 récompenses officielles', len(d.get('rewards', [])) == 4, str(d.get('rewards')))
    check('Cœur d’Aetherion accordé', any('Cœur' in r for r in d.get('rewards', [])))
    check('or de victoire = 250', d.get('goldEarned') == 250, str(d.get('goldEarned')))

# 18. Progression consultable
s, d = call('GET', f'/api/supremes?characterId={cid}')
check('progression suprêmes', s == 200 and d['supremes'][0]['defeated'] is True, str(d)[:200])
check('titre du Roi du Ciel accordé', any('Roi du Ciel' in t for t in d.get('titles', [])), str(d.get('titles')))

# 19. Session d'un autre compte ne peut pas résoudre
s, d = call('POST', '/api/arenas/match', {'characterId': cid, 'arenaId': 'volcan'})
if s == 200:
    jar.clear()
    email2 = f'arena2_{int(time.time())}@test.nx'
    call('POST', '/api/auth/register', {'email': email2, 'password': 'Forge#2026!'})
    call('POST', '/api/auth/login', {'email': email2, 'password': 'Forge#2026!'})
    s2, d2 = call('POST', '/api/arenas/resolve', {'characterId': cid, 'matchId': d['match']['id'], 'result': 'win', 'durationSec': 30})
    check('compte étranger refusé', s2 == 403, str(d2))

print(f'\n=== {PASS} OK / {FAIL} FAIL ===')
sys.exit(1 if FAIL else 0)
