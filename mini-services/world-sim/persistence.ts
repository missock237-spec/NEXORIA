// NEXORIA — world-sim : persistance SQLite (Prisma)
// Chargement au démarrage (ou semis initial déterministe) +
// écritures incrémentales des entités marquées « dirty ».
// Le monde SURVIT aux redémarrages du serveur.

import { PrismaClient } from '@prisma/client'
import {
  BUILDINGS, CITY_GATE, CITY_WALLS, CHESTS, DUNGEON, NPCS, SPAWN_POINTS,
  VILLAGE, WORLD_ID, heightAt,
} from '../../src/lib/game/province/world-data'
import type { BuildingEnt, DungeonEnt, MonsterEnt, NpcEnt, PlayerEnt, ProjectEnt, WorldEventEnt, WorldStateEnt } from './protocol'

export const prisma = new PrismaClient()
// L'URL `file:./db/nexoria.db` du schéma est résolue par le client généré
// relativement au dossier du schéma (…/prisma/), donc prisma/db/nexoria.db.

function dist(ax: number, az: number, bx: number, bz: number) {
  return Math.sqrt((ax - bx) ** 2 + (az - bz) ** 2)
}

export async function loadOrSeedWorld(): Promise<{
  world: WorldStateEnt
  npcs: Map<string, NpcEnt>
  buildings: Map<string, BuildingEnt>
  projects: Map<string, ProjectEnt>
  dungeon: DungeonEnt
  events: WorldEventEnt[]
}> {
  // ── WorldState ──
  let ws = await prisma.worldState.findUnique({ where: { id: WORLD_ID } })
  if (!ws) {
    ws = await prisma.worldState.create({
      data: { id: WORLD_ID, timeOfDay: 8 * 3600, dayCount: 1, prosperity: 100, weather: 'clair', simTicks: 0 },
    })
    console.log('[persist] WorldState semé (jour 1, 08:00, prospérité 100)')
  }
  const world: WorldStateEnt = {
    timeOfDay: ws.timeOfDay, dayCount: ws.dayCount, prosperity: ws.prosperity,
    weather: ws.weather, simTicks: ws.simTicks, dirty: false,
  }

  // ── Bâtiments (statiques + murs + porte) ──
  const buildings = new Map<string, BuildingEnt>()
  const dbBuildings = await prisma.building.findMany()
  const dbById = new Map(dbBuildings.map((b) => [b.id, b]))
  const ensureBuilding = async (id: string, type: BuildingEnt['type'], label: string, x: number, z: number, rotY: number, maxHp: number, economicFunction: string) => {
    const found = dbById.get(id)
    if (found) {
      buildings.set(id, {
        id, type: found.type as BuildingEnt['type'], label: found.label, x: found.x, z: found.z, rotY: found.rotY,
        ownerId: found.ownerId, hp: found.hp, maxHp: found.maxHp,
        state: found.state as BuildingEnt['state'], economicFunction: found.economicFunction,
        ruinsAt: null, dirty: false,
      })
    } else {
      await prisma.building.create({
        data: { id, type, label, x, z, rotY, maxHp, hp: maxHp, state: 'INTACT', economicFunction },
      })
      buildings.set(id, { id, type, label, x, z, rotY, ownerId: null, hp: maxHp, maxHp, state: 'INTACT', economicFunction, ruinsAt: null, dirty: false })
      console.log('[persist] Bâtiment semé:', id)
    }
  }
  for (const b of BUILDINGS) await ensureBuilding(b.id, b.type, b.label, b.x, b.z, b.rotY, b.maxHp, b.economicFunction)
  await ensureBuilding(CITY_GATE.id, 'tour', 'Porte de Pierrefont', CITY_GATE.x, CITY_GATE.z, 0, CITY_GATE.maxHp, 'garde')
  for (const w of CITY_WALLS) await ensureBuilding(w.id, 'garde', 'Rempart', w.x, w.z, w.rotY, w.maxHp, 'none')

  // ── PNJ (semis si absent) ──
  const npcs = new Map<string, NpcEnt>()
  const dbNpcs = await prisma.npc.findMany()
  const dbNpcById = new Map(dbNpcs.map((n) => [n.id, n]))
  for (const def of NPCS) {
    const found = dbNpcById.get(def.id)
    const homeB = def.homeId ? buildings.get(def.homeId) : null
    const workB = def.buildingId ? buildings.get(def.buildingId) : null
    const homeX = homeB ? homeB.x + 2 : def.x
    const homeZ = homeB ? homeB.z + 2 : def.z
    const workX = workB ? workB.x + 2 : def.x
    const workZ = workB ? workB.z + 2 : def.z
    if (found && found.lifeState !== '__seed__') {
      npcs.set(def.id, {
        id: found.id, name: found.name, race: found.race, age: found.age,
        profession: found.profession, buildingId: found.buildingId, homeId: found.homeId,
        family: JSON.parse(found.familyJson) as string[],
        personality: JSON.parse(found.personalityJson) as Record<string, boolean>,
        x: found.x, z: found.z, homeX: found.homeX, homeZ: found.homeZ, workX: found.workX, workZ: found.workZ,
        hp: found.hp, maxHp: found.maxHp, level: found.level, faction: found.faction,
        lifeState: found.lifeState as NpcEnt['lifeState'],
        memory: JSON.parse(found.memoryJson) as string[],
        isGuard: found.isGuard, state: 'idle', timer: 0, targetId: null, lastAttackAt: 0,
        inside: false, griefUntil: 0, dirty: false, deadAt: 0,
      })
    } else if (!found) {
      await prisma.npc.create({
        data: {
          id: def.id, name: def.name, race: def.race, age: def.age, profession: def.profession,
          buildingId: def.buildingId, homeId: def.homeId,
          familyJson: JSON.stringify(def.family), personalityJson: JSON.stringify(def.personality),
          x: def.x, z: def.z, homeX, homeZ, workX, workZ,
          hp: def.hp, maxHp: def.hp, faction: def.faction, isGuard: def.isGuard,
          lifeState: 'ALIVE', memoryJson: '[]',
        },
      })
      npcs.set(def.id, {
        id: def.id, name: def.name, race: def.race, age: def.age, profession: def.profession,
        buildingId: def.buildingId, homeId: def.homeId, family: def.family, personality: def.personality,
        x: def.x, z: def.z, homeX, homeZ, workX, workZ,
        hp: def.hp, maxHp: def.hp, level: 1, faction: def.faction, lifeState: 'ALIVE',
        memory: [], isGuard: def.isGuard, state: 'idle', timer: 0, targetId: null, lastAttackAt: 0,
        inside: false, griefUntil: 0, dirty: false, deadAt: 0,
      })
      console.log('[persist] PNJ semé:', def.id, def.name)
    }
  }

  // ── Donjon ──
  let dbDun = await prisma.dungeonState.findUnique({ where: { dungeonId: DUNGEON.id } })
  if (!dbDun) {
    dbDun = await prisma.dungeonState.create({
      data: { dungeonId: DUNGEON.id, doorHp: 120, doorState: 'INTACT', bossAlive: true, bossRespawnAt: null, bossKillCount: 0, switchesJson: '[]', chestsJson: '[]' },
    })
    console.log('[persist] Donjon semé:', DUNGEON.id)
  }
  const dungeon: DungeonEnt = {
    doorHp: dbDun.doorHp, doorState: dbDun.doorState as DungeonEnt['doorState'],
    bossAlive: dbDun.bossAlive, bossRespawnAt: dbDun.bossRespawnAt ? dbDun.bossRespawnAt.getTime() : 0,
    bossKillCount: dbDun.bossKillCount,
    switches: JSON.parse(dbDun.switchesJson) as string[],
    chests: JSON.parse(dbDun.chestsJson) as DungeonEnt['chests'], dirty: false,
  }

  // ── Projets de reconstruction actifs ──
  const projects = new Map<string, ProjectEnt>()
  const dbProjects = await prisma.constructionProject.findMany({ where: { active: true } })
  for (const p of dbProjects) {
    projects.set(p.buildingId, {
      buildingId: p.buildingId,
      required: { bois: p.requiredBois, pierre: p.requiredPierre, fer: p.requiredFer },
      deposited: { bois: p.depositedBois, pierre: p.depositedPierre, fer: p.depositedFer },
      progress: p.progress, active: p.active, dirty: false,
    })
  }

  // ── Événements récents (journaux) ──
  const evRows = await prisma.worldEvent.findMany({ orderBy: { startedAt: 'desc' }, take: 20 })
  const events: WorldEventEnt[] = evRows.map((e) => ({
    id: e.id, type: e.type, title: e.title, description: e.description, zone: e.zone,
    status: e.status as WorldEventEnt['status'], startedAt: e.startedAt.getTime(),
    endedAt: e.endedAt ? e.endedAt.getTime() : null,
    consequences: JSON.parse(e.consequencesJson) as string[],
    participants: JSON.parse(e.participantsJson) as string[],
  }))

  return { world, npcs, buildings, projects, dungeon, events }
}

// ── Sauvegarde incrémentale des entités « dirty » ──
// SÉQUENTIELLE et SÛRE : un flag dirty n'est baissé QUE si l'écriture a
// réussi (3 tentatives). Sinon il reste levé pour la prochaine passe —
// aucun état critique n'est jamais perdu (verrous SQLite compris).
async function writeSafe(label: string, fn: () => Promise<unknown>): Promise<boolean> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await fn()
      return true
    } catch (e) {
      console.error(`[persist] Échec d'écriture (${label}, tentative ${attempt}/3):`, String(e).slice(0, 160))
      await new Promise((r) => setTimeout(r, 150 * attempt))
    }
  }
  return false
}

export async function flushDirty(
  world: WorldStateEnt,
  npcs: Map<string, NpcEnt>,
  buildings: Map<string, BuildingEnt>,
  projects: Map<string, ProjectEnt>,
  dungeon: DungeonEnt,
  players: Map<string, PlayerEnt>,
  events: WorldEventEnt[],
): Promise<number> {
  let writes = 0
  void events

  if (world.dirty) {
    const done = await writeSafe('worldState', () =>
      prisma.worldState.update({
        where: { id: WORLD_ID },
        data: { timeOfDay: world.timeOfDay, dayCount: world.dayCount, prosperity: world.prosperity, weather: world.weather, simTicks: world.simTicks },
      }))
    if (done) {
      world.dirty = false
      writes++
    }
  }

  for (const n of npcs.values()) {
    if (!n.dirty) continue
    const done = await writeSafe(`npc:${n.id}`, () =>
      prisma.npc.update({
        where: { id: n.id },
        data: {
          x: n.x, z: n.z, hp: n.hp, lifeState: n.lifeState,
          memoryJson: JSON.stringify(n.memory.slice(-40)),
        },
      }))
    if (done) {
      n.dirty = false
      writes++
    }
  }

  for (const b of buildings.values()) {
    if (!b.dirty) continue
    const done = await writeSafe(`building:${b.id}`, () =>
      prisma.building.update({
        where: { id: b.id },
        data: { hp: b.hp, state: b.state },
      }))
    if (done) {
      b.dirty = false
      writes++
    }
  }

  for (const p of projects.values()) {
    if (!p.dirty) continue
    const done = await writeSafe(`project:${p.buildingId}`, () =>
      prisma.constructionProject.upsert({
        where: { buildingId: p.buildingId },
        create: {
          buildingId: p.buildingId,
          requiredBois: p.required.bois, requiredPierre: p.required.pierre, requiredFer: p.required.fer,
          depositedBois: p.deposited.bois, depositedPierre: p.deposited.pierre, depositedFer: p.deposited.fer,
          progress: p.progress, active: p.active,
        },
        update: {
          depositedBois: p.deposited.bois, depositedPierre: p.deposited.pierre, depositedFer: p.deposited.fer,
          progress: p.progress, active: p.active,
        },
      }))
    if (done) {
      p.dirty = false
      writes++
    }
  }

  if (dungeon.dirty) {
    const done = await writeSafe('dungeon', () =>
      prisma.dungeonState.update({
        where: { dungeonId: DUNGEON.id },
        data: {
          doorHp: dungeon.doorHp, doorState: dungeon.doorState, bossAlive: dungeon.bossAlive,
          bossRespawnAt: dungeon.bossRespawnAt > 0 ? new Date(dungeon.bossRespawnAt) : null,
          bossKillCount: dungeon.bossKillCount,
          switchesJson: JSON.stringify(dungeon.switches), chestsJson: JSON.stringify(dungeon.chests),
        },
      }))
    if (done) {
      dungeon.dirty = false
      writes++
    }
  }

  for (const pl of players.values()) {
    if (!pl.dirty) continue
    const data = {
      x: pl.x, z: pl.z, hp: pl.hp, mp: pl.mp, level: pl.level, xp: pl.xp, gold: pl.gold,
      inventoryJson: JSON.stringify(pl.inventory),
      questsJson: JSON.stringify(pl.quests),
      discoveriesJson: JSON.stringify(pl.discoveries),
      deaths: pl.deaths, kills: pl.kills,
    }
    const done = await writeSafe(`player:${pl.characterId}`, () =>
      prisma.provinceState.upsert({
        where: { characterId: pl.characterId }, create: { characterId: pl.characterId, ...data }, update: data,
      }))
    if (done) {
      pl.dirty = false
      writes++
    }
  }

  return writes
}

export async function loadProvinceState(characterId: string): Promise<PlayerEnt['inventory'] | null> {
  const row = await prisma.provinceState.findUnique({ where: { characterId } })
  return row ? (JSON.parse(row.inventoryJson) as Record<string, number>) : null
}

export { dist }
