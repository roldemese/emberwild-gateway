import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'
import { refuseClient } from '../shared/authority.mjs'
import { loadCatalog } from './catalog.mjs'
import { createPresence } from './world.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'content')
const catalog = loadCatalog(root)
const presence = createPresence(catalog)
const port = Number(process.env.PRESENCE_PORT || 4318)
const tickMs = Number(process.env.PRESENCE_TICK_MS || 100)

const sockets = new Map()

function flush(batches) {
  for (const [id, msgs] of batches) {
    const ws = sockets.get(id)
    if (!ws || ws.readyState !== 1) continue
    for (const msg of msgs) {
      const raw = JSON.stringify(msg)
      presence.noteBytes(raw.length)
      ws.send(raw)
    }
  }
}

const http = createServer((req, res) => {
  if (req.url === '/health') {
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ ok: true, places: Object.keys(catalog.places).length, voice: false }))
    return
  }
  if (req.url === '/stats') {
    const byPlace = {}
    for (const s of presence.sessions.values()) {
      const key = s.queuedFor ? `queue:${s.queuedFor}` : s.placeId
      byPlace[key] = byPlace[key] || { being: 0, guest: 0, pet: 0 }
      byPlace[key][s.role]++
    }
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({
      sessions: presence.sessions.size,
      byPlace,
      ticks: presence.stats.ticks,
      lastTickMs: presence.stats.lastTickMs,
      maxTickMs: presence.stats.maxTickMs,
      avgTickMs: presence.stats.ticks ? presence.stats.tickMsTotal / presence.stats.ticks : 0,
      bytesOut: presence.stats.bytesOut,
      snapshots: presence.stats.snapshots,
      rss: process.memoryUsage().rss,
      voice: { enabled: false, sfu: null },
      singleSession: true,
    }))
    return
  }
  res.statusCode = 404
  res.end('emberwild presence')
})

const wss = new WebSocketServer({ server: http })
wss.on('connection', (ws) => {
  let id = null
  ws.on('message', (buf) => {
    let msg
    try { msg = JSON.parse(buf.toString()) } catch { return }
    if (refuseClient(msg.type)) {
      ws.send(JSON.stringify({ type: 'refused', reason: 'The server does not trust that.', lesson: '5.2' }))
      return
    }
    if (!id) {
      if (msg.type !== 'join') return
      const result = presence.join(msg)
      if (result.error) {
        ws.send(JSON.stringify(result.error))
        return
      }
      id = result.session.id
      sockets.set(id, ws)
      flush([[id, result.session.outbound.splice(0)]])
      return
    }
    const s = presence.sessions.get(id)
    if (!s) return
    if (msg.type === 'pose') presence.pose(s, msg)
    else if (msg.type === 'chat') presence.chat(s, msg)
    else if (msg.type === 'portal') presence.portal(s, msg)
    else if (msg.type === 'force-fallback') presence.forceFallback(s, msg.gatewayId)
    flush(presence.takeOutbound())
  })
  ws.on('close', () => {
    if (id) {
      sockets.delete(id)
      presence.leave(id)
      flush(presence.takeOutbound())
    }
  })
})

setInterval(() => flush(presence.tick()), tickMs)

http.listen(port, '0.0.0.0', () => {
  console.log(`presence listening on ${port} (${Object.keys(catalog.places).length} places)`)
})
