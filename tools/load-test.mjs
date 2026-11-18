/**
 * 150 beings and 300 pets in the keep, and 150 guests in private guest-house copies.
 * Reports server tick time, bytes, and memory. The keep does not open a second copy.
 */
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocket } from 'ws'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const port = 4391
const child = spawn(process.execPath, ['packages/presence/server.mjs'], {
  cwd: root,
  env: { ...process.env, PRESENCE_PORT: String(port), PRESENCE_TICK_MS: '100' },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let log = ''
child.stdout.on('data', (b) => { log += b })
child.stderr.on('data', (b) => { log += b })

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function waitHealth() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`)
      if (res.ok) return
    } catch { /* starting */ }
    await sleep(100)
  }
  throw new Error('presence did not start\n' + log)
}

function connect(body) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`)
    const messages = []
    ws.on('open', () => ws.send(JSON.stringify({ type: 'join', ...body })))
    ws.on('message', (buf) => {
      const msg = JSON.parse(buf.toString())
      messages.push(msg)
      if (msg.type === 'welcome' || msg.type === 'waiting' || msg.type === 'join-denied') resolve({ ws, messages, msg })
    })
    ws.on('error', reject)
  })
}

await waitHealth()
const t0 = performance.now()
const clients = []
const jobs = []
for (let i = 1; i <= 150; i++) {
  const estate = `estate-${String(i).padStart(3, '0')}`
  jobs.push(connect({ placeId: 'keep', role: 'being', displayName: `Being ${i}`, estateId: estate }))
  jobs.push(connect({ placeId: 'guest-house', role: 'guest', displayName: `Guest ${i}` }))
  jobs.push(connect({ placeId: 'keep', role: 'pet', displayName: `Pet ${i}a`, estateId: estate }))
  jobs.push(connect({ placeId: 'keep', role: 'pet', displayName: `Pet ${i}b`, estateId: estate }))
}
for (let i = 0; i < jobs.length; i += 40) {
  clients.push(...await Promise.all(jobs.slice(i, i + 40)))
}
const joinMs = performance.now() - t0
const welcomed = clients.filter((c) => c.msg.type === 'welcome')
const waiting = clients.filter((c) => c.msg.type === 'waiting')

const poseUntil = performance.now() + 2500
while (performance.now() < poseUntil) {
  for (const c of clients) {
    if (c.ws.readyState !== 1 || c.msg.type !== 'welcome') continue
    const pet = c.msg.role === 'pet'
    if (pet && Math.random() > 0.5) continue
    c.ws.send(JSON.stringify({ type: 'pose', x: Math.random() * 20 - 10, y: 0, z: Math.random() * 20 - 10, yaw: Math.random() * 6 }))
  }
  await sleep(100)
}
await sleep(300)
const stats = await (await fetch(`http://127.0.0.1:${port}/stats`)).json()

const extra = await connect({ placeId: 'keep', role: 'being', displayName: 'One more' })
const thirdPet = await connect({ placeId: 'keep', role: 'pet', displayName: 'Pet extra', estateId: 'estate-001' })
const pet = clients.find((c) => c.msg.role === 'pet' && c.msg.type === 'welcome')
let petChat = null
if (pet) {
  petChat = await new Promise((resolve) => {
    const onMsg = (buf) => {
      const msg = JSON.parse(buf.toString())
      if (msg.type === 'chat-denied') {
        pet.ws.off('message', onMsg)
        resolve(msg.reason)
      }
    }
    pet.ws.on('message', onMsg)
    pet.ws.send(JSON.stringify({ type: 'chat', text: 'woof' }))
  })
}

const overflow = await (await fetch(`http://127.0.0.1:${port}/stats`)).json()
const report = {
  joined: clients.length,
  welcomed: welcomed.length,
  waitingDuringFill: waiting.length,
  joinMs: Math.round(joinMs),
  extraBeing: extra.msg.type,
  extraAhead: extra.msg.ahead ?? null,
  thirdPet: thirdPet.msg.type === 'join-denied' ? thirdPet.msg.reason : thirdPet.msg.type,
  petChat,
  server: {
    sessions: stats.sessions,
    keep: stats.byPlace.keep,
    queue: stats.byPlace['queue:keep'] || null,
    lastTickMs: Number(stats.lastTickMs.toFixed(2)),
    avgTickMs: Number(stats.avgTickMs.toFixed(2)),
    maxTickMs: Number(stats.maxTickMs.toFixed(2)),
    bytesOut: stats.bytesOut,
    snapshots: stats.snapshots,
    rssMb: Math.round(stats.rss / 1024 / 1024),
    voice: stats.voice,
    singleSession: stats.singleSession,
  },
  afterOverflow: {
    sessions: overflow.sessions,
    keep: overflow.byPlace.keep,
    queue: overflow.byPlace['queue:keep'] || null,
  },
}
console.log(JSON.stringify(report, null, 2))
for (const c of clients) c.ws.close()
extra.ws.close()
thirdPet.ws.close()
child.kill('SIGTERM')
await sleep(200)
if (report.welcomed !== 600 || report.extraBeing !== 'waiting' || report.thirdPet !== 'pets-out-cap' || report.petChat !== 'pets-do-not-speak') {
  process.exit(1)
}
