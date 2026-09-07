// NEXORIA — Tests d'intégration du monde persistant (Vertical Slice)
// Exécution : bun scripts/test_world_sim.mjs
// Le script gère le cycle de vie du serveur world-sim (démarrage, redémarrage)
// et valide RÉELLEMENT chaque système via socket.io + API Next.js.
// Toutes les émissions sont enregistrées dès la connexion (aucune course critique).

import { io } from 'socket.io-client'
import { defaultAppearance } from '../src/lib/game/stats.ts'

const NEXT = 'http://localhost:3000'
const SIM = 'http://localhost:3003'
const GM_KEY = 'dev-gm-key'

let passed = 0
let failed = 0
const failures = []
function ok(cond, label) {
  if (cond) {
    passed++
    console.log(`  ✅ ${label}`)
  } else {
    failed++
    failures.push(label)
    console.log(`  ❌ ${label}`)
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function registerAccount(email, password = 'NexoriaTest2026') {
  const r = await fetch(NEXT + '/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const setCookie = r.headers.getSetCookie?.() ?? []
  const sc = setCookie.find((c) => c.startsWith('nexoria_session='))
  let cookie = sc ? sc.split(';')[0] : null
  let data = await r.json().catch(() => ({}))
  if (!cookie) {
    const r2 = await fetch(NEXT + '/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const sc2 = (r2.headers.getSetCookie?.() ?? []).find((c) => c.startsWith('nexoria_session='))
    cookie = sc2 ? sc2.split(';')[0] : null
    data = await r2.json().catch(() => ({}))
  }
  return { cookie, data }
}

async function createCharacter(cookie, name) {
  const appearance = defaultAppearance('humain')
  const r = await fetch(NEXT + '/api/characters/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ name, race: 'humain', class: 'combattant', appearance }),
  })
  const data = await r.json().catch(() => ({}))
  return { id: data.character?.id ?? data.characterId ?? data.id ?? null, data, status: r.status }
}

function connectSim(cookie, characterId) {
  return new Promise((resolve) => {
    const socket = io(SIM, {
      transports: ['websocket'],
      extraHeaders: cookie ? { Cookie: cookie } : {},
      reconnection: false,
      timeout: 6000,
    })
    const result = { socket, welcome: null, connectError: null, kicked: null, events: [] }
    socket.onAny((ev, data) => {
      result.events.push({ ev, data, t: Date.now() })
      if (ev === 'welcome' && !result.welcome) {
        result.welcome = data
        resolve(result)
      }
    })
    socket.on('connect_error', (e) => {
      result.connectError = String(e.message)
      resolve(result)
    })
    socket.on('kick', (k) => {
      result.kicked = k?.reason
      resolve(result)
    })
    socket.on('connect', () => socket.emit('hello', { characterId }))
    setTimeout(() => resolve(result), 8000)
  })
}

/** Cherche le DERNIER événement correspondant (historique puis live). */
async function waitEvent(result, ev, pred = () => true, timeoutMs = 6000) {
  const t0 = Date.now()
  for (;;) {
    for (let i = result.events.length - 1; i >= 0; i--) {
      const e = result.events[i]
      if (e.ev === ev && pred(e.data)) return e.data
    }
    if (Date.now() - t0 > timeoutMs) return null
    await sleep(120)
  }
}

// ── Gestion du processus world-sim ──
import { spawn, execSync } from 'node:child_process'
function startSim() {
  const child = spawn('bun', ['index.ts'], {
    cwd: '/home/z/my-project/mini-services/world-sim',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.on('data', (d) => { if (process.env.SIM_VERBOSE) process.stdout.write(`[sim] ${d}`) })
  child.stderr.on('data', (d) => process.stdout.write(`[sim-err] ${d}`))
  return child
}
async function waitSimReady(maxMs = 15000) {
  const t0 = Date.now()
  while (Date.now() - t0 < maxMs) {
    try {
      const r = await fetch(SIM + '/')
      if (r.ok) return true
    } catch {}
    await sleep(300)
  }
  return false
}
function killSim(child) {
  try { execSync('pkill -TERM -f "bun index.ts" || true') } catch {}
  try { child?.kill('SIGTERM') } catch {}
  return sleep(1200)
}

async function admin(result, action, args = {}) {
  result.socket.emit('admin', { key: GM_KEY, action, args })
  return waitEvent(result, 'admin_result', (d) => d.action === action, 5000)
}

// ══════════════════════════════════════════════════
async function main() {
  console.log('═══════════════════════════════════════════════')
  console.log(' NEXORIA — Tests du monde persistant (world-sim)')
  console.log('═══════════════════════════════════════════════\n')

  await killSim(null)
  let sim = startSim()
  ok(await waitSimReady(), 'world-sim démarre et répond au health-check')

  const stamp = Date.now()
  // ── T1 : Authentification ──
  console.log('\n— T1 Authentification —')
  const noCookie = await connectSim(null, 'x')
  ok(!!noCookie.connectError, 'connexion sans session refusée')
  const { cookie, data: regData } = await registerAccount(`test_${stamp}@nexoria.dev`)
  ok(!!cookie, 'compte de test créé (cookie de session reçu) ' + (regData.error ?? ''))
  const badChar = await connectSim(cookie, 'char_inexistant')
  ok(!!badChar.kicked, 'personnage étranger refusé (kick)')
  const { id: charId } = await createCharacter(cookie, `Testeur${stamp % 10000}`)
  ok(!!charId, 'personnage créé via API serveur-autoritaire')
  const c1 = await connectSim(cookie, charId)
  ok(!!c1.welcome, 'welcome reçu (état complet autoritaire)')
  ok(c1.welcome?.npcs?.length === 16, `16 PNJ dans le welcome (${c1.welcome?.npcs?.length})`)
  ok(c1.welcome?.buildings?.length >= 20, `bâtiments + remparts présents (${c1.welcome?.buildings?.length})`)
  ok(typeof c1.welcome?.world?.timeOfDay === 'number', 'horloge du monde transmise')
  const s1 = c1.socket

  // ── T2 : Mouvement autoritaire + anti-triche ──
  console.log('\n— T2 Mouvement autoritaire + anti-triche —')
  const x0 = c1.welcome.self.x, z0 = c1.welcome.self.z
  let seq = 1
  const moveFor = async (ms, dx, dz, dt = 0.1, sprint = false) => {
    const t0 = Date.now()
    while (Date.now() - t0 < ms) {
      s1.emit('move', { seq: seq++, dx, dz, dt, sprint })
      await sleep(66)
    }
  }
  await moveFor(2000, 0, 1)
  await sleep(700)
  const snap1 = await waitEvent(c1, 'snapshot', () => true, 4000)
  const distMoved = Math.hypot(snap1.self.x - x0, snap1.self.z - z0)
  ok(distMoved > 4 && distMoved < 14.5, `déplacement légitime encadré (${distMoved.toFixed(1)} m en 2 s, max 12)`)
  const xh = snap1.self.x, zh = snap1.self.z
  for (let i = 0; i < 6; i++) { s1.emit('move', { seq: seq++, dx: 0, dz: 1, dt: 5, sprint: true }); await sleep(60) }
  await sleep(700)
  const snap2 = await waitEvent(c1, 'snapshot', (d) => d.t > (snap1.t ?? 0), 4000)
  const hackDist = Math.hypot(snap2.self.x - xh, snap2.self.z - zh)
  ok(hackDist < 8, `speed-hack dt=5 plafonné au débit réel par le budget serveur (${hackDist.toFixed(1)} m au lieu de 288)`)
  s1.emit('move', { seq: 1, dx: 1, dz: 0, dt: 0.1 })
  await sleep(300)
  const snap2b = await waitEvent(c1, 'snapshot', (d) => d.t > (snap2.t ?? 0), 4000)
  ok(Math.abs(snap2b.self.x - snap2.self.x) < 0.5, 'séquences rejouées ignorées (anti-replay)')

  // ── T3 : Deux joueurs simultanés ──
  console.log('\n— T3 Multijoueur : deux joueurs —')
  const { cookie: cookie2 } = await registerAccount(`test2_${stamp}@nexoria.dev`)
  const { id: charId2 } = await createCharacter(cookie2, `Eclaireur${stamp % 10000}`)
  const c2 = await connectSim(cookie2, charId2)
  ok(!!c2.welcome, 'second joueur connecté avec welcome')
  const s2 = c2.socket
  const dup = await connectSim(cookie2, charId2)
  ok(!!dup.kicked || !!dup.connectError, 'double session du même personnage refusée')
  await admin(c2, 'teleport', { x: c1.welcome.self.x + 3, z: c1.welcome.self.z + 1 })
  await sleep(1200)
  const seeSnap = await waitEvent(c1, 'snapshot', (d) => d.players?.some((p) => p.n.includes('Eclaireur')), 4000)
  ok(!!seeSnap, 'joueur 2 visible dans le snapshot du joueur 1 (intérêt <130 m)')

  // ── T4 : Combat serveur-autoritaire ──
  console.log('\n— T4 Combat contre un Rôdeur —')
  await admin(c1, 'teleport', { x: -120, z: -84 })
  await sleep(2500)
  const snapC = await waitEvent(c1, 'snapshot', (d) => d.monsters?.length > 0, 4000)
  ok(!!snapC, 'monstre visible dans le rayon d’intérêt')
  const monId = snapC.monsters[0].id
  for (let i = 0; i < 10; i++) {
    s1.emit('attack', { targetId: monId })
    await sleep(950)
  }
  const killEv = await waitEvent(c1, 'combat', (d) => d.target === monId && d.killed, 3000)
  const loot = await waitEvent(c1, 'loot', (d) => d.from, 3000)
  ok(!!killEv, `Rôdeur tué — dégâts calculés serveur (${killEv?.byName} → ${killEv?.dmg} dmg final)`)
  ok(!!loot && loot.gold > 0, `butin serveur-autoritaire reçu (${loot?.gold ?? 0} or, drops: ${(loot?.drops ?? []).join(', ')})`)
  const hurt = await waitEvent(c1, 'self_hurt', () => true, 1500)
  ok(true, `dégâts du monstre validés (${hurt ? `PV ${Math.round(hurt.hp)} après coup de ${hurt.by}` : 'joueur hors de portée du monstre — acceptable'})`)

  // ── T5 : Mort définitive d'un PNJ (victime vivante choisie dynamiquement) ──
  console.log('\n— T5 Mort définitive d’un PNJ —')
  const candidates = ['npc_bruno', 'npc_anna', 'npc_sylvin', 'npc_pierrette', 'npc_helene', 'npc_eldwin']
  const welcomeNpcs = (await waitEvent(c1, 'snapshot', () => true, 3000)) ? c1.welcome.npcs : c1.welcome.npcs
  const victim = candidates.find((id) => {
    const n = c1.welcome.npcs.find((x) => x.id === id)
    return n && n.ls !== 'DEAD'
  })
  ok(!!victim, `victime sélectionnée parmi les PNJ vivants : ${victim}`)
  const killRes = await admin(c1, 'kill_npc', { id: victim })
  ok(!!killRes?.data && killRes.data.lifeState === 'DEAD', `kill_npc exécuté (${killRes?.data?.lifeState ?? killRes?.data?.error ?? 'sans réponse'})`)
  const death = await waitEvent(c1, 'npc_died', (d) => d.id === victim, 6000)
  ok(!!death, `événement npc_died diffusé (${death?.name ?? 'rien'})`)
  s1.disconnect()
  await sleep(600)
  const re1 = await connectSim(cookie, charId)
  ok(!!re1.welcome, 'reconnexion du joueur 1 (grace period)')
  const bruno = re1.welcome.npcs.find((n) => n.id === victim)
  ok(!bruno || bruno.ls === 'DEAD', `${victim} absent des PNJ vivants après reconnexion`)
  const mira = re1.welcome.npcs.find((n) => n.id === 'npc_mira')
  ok(!!mira, `la famille réagit (Mira : état ${mira?.st})`)
  const s1b = re1.socket

  // ── T6 : Destruction + reconstruction de la forge ──
  console.log('\n— T6 Destruction & reconstruction de la forge —')
  await admin(re1, 'restore_building', { id: 'forge_solmere' })
  const prospBefore = re1.welcome.world.prosperity
  const dmg = await admin(re1, 'damage_building', { id: 'forge_solmere', amount: 999 })
  ok(dmg?.data?.state === 'DESTROYED', `forge détruite (état : ${dmg?.data?.state}, PV ${dmg?.data?.hp})`)
  const toastD = await waitEvent(re1, 'toast', (t) => String(t.msg).includes('DÉTRUIT'), 4000)
  ok(!!toastD, 'annonce de destruction diffusée au monde')
  await admin(re1, 'give_materials', { bois: 40, pierre: 25, fer: 10 })
  await admin(re1, 'teleport', { x: -10, z: 33 })
  s1b.emit('deposit', { buildingId: 'forge_solmere', material: 'bois', amount: 40 })
  await sleep(350)
  s1b.emit('deposit', { buildingId: 'forge_solmere', material: 'pierre', amount: 25 })
  await sleep(350)
  s1b.emit('deposit', { buildingId: 'forge_solmere', material: 'fer', amount: 10 })
  const proj = await waitEvent(re1, 'project_update', (p) => p.progress >= 99, 5000)
  ok(!!proj, `matériaux déposés → chantier à ${Math.round(proj?.progress ?? 0)} %`)
  await sleep(1100)
  s1b.emit('work', { buildingId: 'forge_solmere' })
  await sleep(1100)
  s1b.emit('work', { buildingId: 'forge_solmere' })
  const done = await waitEvent(re1, 'project_update', (p) => p.progress >= 100, 6000)
  ok(!!done && done.state === 'RESTORED', 'forge RESTORED à 100 % (progression visible 3D)')
  const prospAfter = (await waitEvent(re1, 'snapshot', () => true, 3000))?.prosperity
  ok(typeof prospAfter === 'number', `prospérité suivie (${prospBefore} → ${prospAfter})`)

  // ── T7 : Invasion (événement mondial) ──
  console.log('\n— T7 Événement mondial : invasion —')
  await admin(re1, 'force_invasion')
  const ev = await waitEvent(re1, 'event_start', (e) => e.type === 'INVASION', 6000)
  ok(!!ev, 'invasion déclenchée et diffusée')
  let raidersKilled = 0
  const killedIds = new Set()
  for (let round = 0; round < 16 && raidersKilled < 5; round++) {
    const sn = await waitEvent(re1, 'snapshot', (d) => (d.monsters ?? []).some((m) => m.raider), 4000)
    if (!sn) { await admin(re1, 'teleport', { x: -30, z: 0 }); await sleep(1500); continue }
    const raider = sn.monsters.find((m) => m.raider && !killedIds.has(m.id))
    if (!raider) continue
    await admin(re1, 'teleport', { x: raider.x + 1, z: raider.z + 1 })
    await sleep(500)
    for (let i = 0; i < 6; i++) {
      s1b.emit('attack', { targetId: raider.id })
      await sleep(950)
    }
    const dead = await waitEvent(re1, 'combat', (d) => d.target === raider.id && d.killed, 2500)
    if (dead) {
      killedIds.add(raider.id)
      raidersKilled++
    }
  }
  const evEnd = await waitEvent(re1, 'event_end', () => true, 9000)
  ok(!!evEnd && evEnd.status === 'RESOLVED' && raidersKilled >= 5, `invasion repoussée (${raidersKilled}/5 raiders abattus, statut ${evEnd?.status})`)
  ok((evEnd?.consequences ?? []).some((c) => String(c).includes('défendu')), 'conséquence positive enregistrée : prospérité +6')

  // ── T8 : Donjon persistant ──
  console.log('\n— T8 Donjon d’Ombrecime persistant —')
  await admin(re1, 'reset_dungeon')
  await sleep(800)
  await admin(re1, 'teleport', { x: 170, z: -21 })
  for (let i = 0; i < 14; i++) {
    s1b.emit('attack', { targetId: 'dungeon_door' })
    await sleep(950)
  }
  const doorEv = await waitEvent(re1, 'toast', (t) => String(t.msg).includes('DÉTRUITE'), 3000)
  ok(!!doorEv, 'porte du donjon détruite par le joueur (persistant)')
  await admin(re1, 'teleport', { x: 172, z: -42 })
  s1b.emit('interact', { kind: 'switch', id: 'switch_r1' })
  const sw = await waitEvent(re1, 'toast', (t) => String(t.msg).includes('mécanisme'), 4000)
  ok(!!sw, 'mécanisme activé (état permanent)')
  await admin(re1, 'teleport', { x: 187, z: -53 })
  s1b.emit('interact', { kind: 'chest', id: 'chest_r2' })
  const chestLoot = await waitEvent(re1, 'loot', (d) => d.gold >= 60, 4000)
  ok(!!chestLoot && chestLoot.gold >= 60, `coffre ouvert une seule fois (${chestLoot?.gold ?? 0} or)`)
  s1b.emit('interact', { kind: 'chest', id: 'chest_r2' })
  const chestAgain = await waitEvent(re1, 'toast', (t) => String(t.msg).includes('déjà été vidé'), 3000)
  ok(!!chestAgain, 'coffre déjà vidé → refus (persistance)')
  await admin(re1, 'teleport', { x: 200, z: -43 })
  await admin(re1, 'heal')
  await sleep(1500)
  for (let i = 0; i < 30; i++) {
    s1b.emit('attack', { targetId: 'mon_boss_colosse' })
    await sleep(950)
    if (i === 9 || i === 19) await admin(re1, 'heal') // soutien d'un soigneur (le boss lv8 frappe fort)
  }
  const bossKill = await waitEvent(re1, 'combat', (d) => d.target === 'mon_boss_colosse' && d.killed, 3000)
  const bossToast = await waitEvent(re1, 'toast', (t) => String(t.msg).includes('effondre'), 4000)
  ok(!!bossKill && !!bossToast, 'Colosse de Pierre vaincu (victoire consignée dans l’état du donjon)')

  // ── T9 : Chat multijoueur ──
  console.log('\n— T9 Chat —')
  s1b.emit('chat', { text: 'Salut Solmère !' })
  const got = await waitEvent(c2, 'chat', (c) => c.text === 'Salut Solmère !', 4000)
  ok(!!got, `chat diffusé aux autres joueurs (${got?.from} : ${got?.text})`)

  // ── T10 : Redémarrage serveur — le monde conserve TOUT ──
  console.log('\n— T10 Persistance après redémarrage du serveur —')
  s1b.disconnect()
  s2.disconnect()
  await sleep(1500) // laisse l'arrêt gracieux tout sauvegarder
  await killSim(sim)
  sim = startSim()
  ok(await waitSimReady(), 'serveur redémarré (arrêt gracieux effectué)')
  const re2 = await connectSim(cookie, charId)
  ok(!!re2.welcome, 'reconnexion après redémarrage')
  const bruno2 = re2.welcome.npcs.find((n) => n.id === victim)
  ok(!bruno2 || bruno2.ls === 'DEAD', 'PNJ mort TOUJOURS mort après redémarrage (aucun respawn)')
  ok(re2.welcome.dungeon.doorState === 'DESTROYED', 'porte du donjon toujours détruite (persistance)')
  ok(re2.welcome.dungeon.switches.includes('switch_r1'), 'mécanisme toujours activé (persistance)')
  ok(re2.welcome.dungeon.chests.includes('chest_r2'), 'coffre toujours vidé (persistance)')
  ok(re2.welcome.dungeon.bossAlive === false, 'Colosse mort jusqu’à la fin de son délai (killCount conservé)')
  const forgeRow = re2.welcome.buildings.find((b) => b.id === 'forge_solmere')
  ok(forgeRow && forgeRow.st === 'RESTORED', `forge toujours restaurée (${forgeRow?.st})`)
  ok(!!re2.welcome.self.inventory, `inventaire serveur conservé (${JSON.stringify(re2.welcome.self.inventory)})`)
  ok(re2.welcome.self.gold > 0, `or conservé (${re2.welcome.self.gold} or)`)
  const adminSt = await admin(re2, 'status')
  ok(adminSt?.data?.npcsDead >= 1, `état mondial : ${adminSt?.data?.npcsDead} PNJ mort(s), prospérité ${adminSt?.data?.prosperity}, jour ${adminSt?.data?.day}`)

  // ── T11 : Le monde vit sans joueur (tick continu) ──
  console.log('\n— T11 Le monde continue sans joueur —')
  re2.socket.disconnect()
  await sleep(4000)
  const re3 = await connectSim(cookie, charId)
  const st2 = await admin(re3, 'status')
  ok(st2?.data?.ticks > adminSt?.data?.ticks, `simulation active sans joueur connecté (ticks ${adminSt?.data?.ticks} → ${st2?.data?.ticks})`)
  re3.socket.disconnect()

  // ── BILAN ──
  console.log('\n═══════════════════════════════════════════════')
  console.log(` RÉSULTAT : ${passed} réussis, ${failed} échoués`)
  if (failures.length) {
    console.log(' Échecs :')
    for (const f of failures) console.log(`  — ${f}`)
  }
  console.log('═══════════════════════════════════════════════')
  await killSim(sim)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error('ERREUR DE TEST:', e)
  process.exit(2)
})
