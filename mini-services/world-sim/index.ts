// NEXORIA — world-sim : point d'entrée
// Serveur socket.io autoritaire. Auth par cookie de session httpOnly
// (le même que le site Next.js) — revalidé en base à chaque handshake.

import { createServer } from 'node:http'
import { Server, Socket } from 'socket.io'
import { SESSION_COOKIE } from '../../src/lib/game/config'
import { GameServer } from './GameServer'
import { prisma } from './persistence'

const PORT = Number(process.env.WORLD_SIM_PORT || 3003)

const httpServer = createServer((_req, res) => {
  // Endpoint de santé (diagnostic interne)
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ ok: true, service: 'nexoria-world-sim', ts: Date.now() }))
})
const io = new Server(httpServer, {
  cors: { origin: true, credentials: true },
  maxHttpBufferSize: 1e6,
})

// ── AUTHENTIFICATION (handshake) ──
io.use(async (socket: Socket, next) => {
  try {
    const cookies = socket.handshake.headers.cookie ?? ''
    const match = new RegExp(`${SESSION_COOKIE}=([^;]+)`).exec(cookies)
    const token = match?.[1]
    if (!token) return next(new Error('unauthorized: session absente'))
    const session = await prisma.session.findUnique({
      where: { token },
      include: { account: { select: { id: true, email: true } } },
    })
    if (!session) return next(new Error('unauthorized: session inconnue'))
    if (session.expiresAt.getTime() < Date.now()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {})
      return next(new Error('unauthorized: session expirée'))
    }
    socket.data.accountId = session.account.id
    socket.data.email = session.account.email
    next()
  } catch (e) {
    next(new Error('unauthorized: erreur de session'))
  }
})

const game = new GameServer(io)

io.on('connection', (socket) => {
  socket.on('hello', (data: { characterId?: string }) => {
    const cid = String(data?.characterId ?? '')
    if (!cid) {
      socket.emit('kick', { reason: 'characterId requis.' })
      return
    }
    void game.handleHello(socket, cid)
  })
  socket.on('move', (m) => game.handleMove(socket, m))
  socket.on('attack', (a) => game.handleAttack(socket, a))
  socket.on('interact', (i) => game.handleInteract(socket, i))
  socket.on('deposit', (d) => game.handleDeposit(socket, d))
  socket.on('work', (w) => game.handleWork(socket, w))
  socket.on('chat', (c) => game.handleChat(socket, c))
  socket.on('admin', (a) => game.handleAdmin(socket, a))
  socket.on('disconnect', () => game.handleDisconnect(socket))
})

async function main() {
  await game.init()
  game.start()
  httpServer.listen(PORT, () => {
    console.log(`[world-sim] Serveur de simulation autoritaire sur :${PORT}`)
    console.log('[world-sim] Province de Solmère — le monde vit désormais en continu.')
  })
}

main().catch((e) => {
  console.error('[world-sim] ERREUR FATALE:', e)
  process.exit(1)
})

// ── ARRÊT GRACIEUX — le monde est toujours sauvegardé avant de s'éteindre ──
async function shutdown(signal: string) {
  console.log(`[world-sim] Signal ${signal} — sauvegarde gracieuse…`)
  try {
    game.stop()
    await game.flushAll()
    await prisma.$disconnect()
  } catch (e) {
    console.error('[world-sim] Erreur de sauvegarde à l’arrêt:', e)
  }
  process.exit(0)
}
process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
