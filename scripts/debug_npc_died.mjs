// Debug ciblé : kill_npc → suivi des événements reçus
import { io } from 'socket.io-client'
import { spawn, execSync } from 'node:child_process'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

try { execSync('pkill -TERM -f "bun index.ts" || true') } catch {}
await sleep(1200)

const sim = spawn('bun', ['index.ts'], {
  cwd: '/home/z/my-project/mini-services/world-sim',
  stdio: ['ignore', 'pipe', 'pipe'],
})
sim.stdout.on('data', (d) => process.stdout.write(`[sim] ${d}`))
sim.stderr.on('data', (d) => process.stdout.write(`[sim-err] ${d}`))

const t0 = Date.now()
while (Date.now() - t0 < 15000) {
  try { const r = await fetch('http://localhost:3003/'); if (r.ok) break } catch {}
  await sleep(300)
}

// compte de test réutilisable
const email = `dbg_${Date.now()}@nexoria.dev`
const reg = await fetch('http://localhost:3000/api/auth/register', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password: 'NexoriaTest2026' }),
})
const cookie = (reg.headers.getSetCookie?.() ?? []).find((c) => c.startsWith('nexoria_session='))?.split(';')[0]

const socket = io('http://localhost:3003', { transports: ['websocket'], extraHeaders: { Cookie: cookie }, reconnection: false })
const received = []
socket.onAny((ev, data) => { received.push({ ev, data }); if (ev !== 'snapshot') console.log('<<', ev, JSON.stringify(data).slice(0, 160)) })
socket.on('connect', () => console.log('>> connecté'))
await sleep(1000)

// créer un personnage via l'API serveur
const st = await fetch('http://localhost:3000/api/auth/session', { headers: { cookie } }).then((r) => r.json())
console.log('session:', JSON.stringify(st).slice(0, 120))
const stats = await import('../src/lib/game/stats.ts')
const crc = await fetch('http://localhost:3000/api/characters/create', {
  method: 'POST', headers: { 'content-type': 'application/json', cookie },
  body: JSON.stringify({ name: `Debug${Date.now() % 10000}`, race: 'humain', class: 'combattant', appearance: stats.defaultAppearance('humain') }),
}).then((r) => r.json())
console.log('create:', JSON.stringify(crc).slice(0, 160))
const charId = crc.character?.id ?? crc.characterId ?? crc.id
if (!charId) { console.error('PAS DE PERSONNAGE'); process.exit(1) }

socket.emit('hello', { characterId: charId })
await sleep(2000)
console.log('--- kill_npc ---')
socket.emit('admin', { key: 'dev-gm-key', action: 'kill_npc', args: { id: 'npc_anna' } })
await sleep(3000)
console.log('--- événements reçus:', received.map((r) => r.ev).join(', '))
try { execSync('pkill -TERM -f "bun index.ts" || true') } catch {}
process.exit(0)
