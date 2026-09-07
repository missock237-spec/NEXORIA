#!/bin/bash
BASE="http://localhost:3000"
JAR="/tmp/nexoria_cookies.txt"
rm -f "$JAR"

echo "=== 1. INSCRIPTION ==="
curl -s -c "$JAR" -X POST $BASE/api/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"kael.test@nexoria.world","password":"LycanNinja2024!"}' | head -c 400
echo; echo

echo "=== 2. SESSION ==="
curl -s -b "$JAR" $BASE/api/auth/session | head -c 300
echo; echo

echo "=== 3. NOM VALID ==="
curl -s -b "$JAR" -X POST $BASE/api/characters/validate-name -H 'Content-Type: application/json' -d '{"name":"Kael"}'
echo; echo

echo "=== 4. NOM INTERDIT ==="
curl -s -b "$JAR" -X POST $BASE/api/characters/validate-name -H 'Content-Type: application/json' -d '{"name":"Admin"}'
echo; echo

echo "=== 5. RACE INEXISTANTE (rejet attendu) ==="
curl -s -b "$JAR" -X POST $BASE/api/characters/create -H 'Content-Type: application/json' \
  -d '{"name":"Kael","race":"dragon","class":"ninja","appearance":{},"equipment":{}}'
echo; echo

echo "=== 6. APPARENCE TRICHEE (rejet attendu) ==="
curl -s -b "$JAR" -X POST $BASE/api/characters/create -H 'Content-Type: application/json' \
  -d '{"name":"Tricheur","race":"lycan","class":"ninja","appearance":{"skin":"#ff00ff"},"equipment":{}}'
echo; echo

echo "=== 7. SANS SESSION (rejet attendu) ==="
curl -s -X POST $BASE/api/characters/create -H 'Content-Type: application/json' \
  -d '{"name":"Anon","race":"lycan","class":"ninja"}'
echo
