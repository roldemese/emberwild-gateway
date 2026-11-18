import { AOI_LIMITS, ROLES, VOICE_HOOK } from '../shared/protocol.mjs'
import { GUEST_HOUSE, canonicalGuestPlace, guestInstanceId, guestJoinDenial, guestMayUsePortal } from './guest-rights.mjs'

function capOf(place, role) {
  const c = place?.capacity || {}
  if (role === 'being') return c.beings ?? 0
  if (role === 'guest') return c.guests ?? 0
  return c.pets ?? 0
}

function cleanName(value) {
  const text = String(value ?? 'Traveler').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 32)
  return text || 'Traveler'
}

/**
 * One canonical room per place. Overflow waits. Pets do not speak.
 * The grid is an interest stub: nearby beings and pets, then a hard cap.
 */
export function interestSet(self, sessions, limits = AOI_LIMITS) {
  const cell = limits.cellMeters
  const buckets = new Map()
  let population = 0
  for (const s of sessions.values()) {
    if (s.id === self.id || s.placeId !== self.placeId || s.queuedFor) continue
    if ((self.instanceId || s.instanceId) && s.instanceId !== self.instanceId) continue
    population++
    const key = `${Math.floor(s.x / cell)},${Math.floor(s.z / cell)}`
    let list = buckets.get(key)
    if (!list) buckets.set(key, (list = []))
    list.push(s)
  }
  const cx = Math.floor(self.x / cell)
  const cz = Math.floor(self.z / cell)
  const seen = new Set()
  const candidates = []
  const pull = (rings) => {
    for (let dz = -rings; dz <= rings; dz++) {
      for (let dx = -rings; dx <= rings; dx++) {
        const list = buckets.get(`${cx + dx},${cz + dz}`)
        if (!list) continue
        for (const s of list) {
          if (seen.has(s.id)) continue
          seen.add(s.id)
          candidates.push(s)
        }
      }
    }
  }
  pull(limits.rings)
  if (candidates.length < population && candidates.length < limits.full + limits.pets) pull(limits.rings + 5)

  const full = []
  const pets = []
  for (const s of candidates) {
    const d = (s.x - self.x) ** 2 + (s.z - self.z) ** 2
    if (s.role === 'pet') pets.push([d, s])
    else full.push([d, s])
  }
  full.sort((a, b) => a[0] - b[0])
  pets.sort((a, b) => a[0] - b[0])
  return {
    full: full.slice(0, limits.full).map((row) => row[1]),
    pets: pets.slice(0, limits.pets).map((row) => row[1]),
  }
}

export function createPresence(catalog) {
  const sessions = new Map()
  const queues = new Map()
  let seq = 1
  const stats = {
    bytesOut: 0,
    ticks: 0,
    tickMsTotal: 0,
    maxTickMs: 0,
    lastTickMs: 0,
    snapshots: 0,
  }

  function queueFor(placeId) {
    let q = queues.get(placeId)
    if (!q) {
      q = { being: [], guest: [], pet: [] }
      queues.set(placeId, q)
    }
    return q
  }

  function counts(placeId, instanceId = null) {
    const c = { being: 0, guest: 0, pet: 0 }
    for (const s of sessions.values()) {
      if (s.placeId !== placeId || s.queuedFor) continue
      if (instanceId && s.instanceId !== instanceId) continue
      c[s.role]++
    }
    return c
  }

  function occupancy(placeId) {
    return counts(placeId, null)
  }

  function petsOut(estateId) {
    let n = 0
    for (const s of sessions.values()) {
      if (s.role !== 'pet' || s.estateId !== estateId || s.queuedFor) continue
      if (s.placeId === estateId) continue
      n++
    }
    return n
  }

  function entityOf(s) {
    return {
      id: s.id,
      role: s.role,
      name: s.displayName,
      estateId: s.estateId,
      x: s.x,
      y: s.y,
      z: s.z,
      yaw: s.yaw,
    }
  }

  function spawnOf(placeId, spawnId) {
    const place = catalog.places[placeId]
    const spawn = (spawnId && place?.spawns?.[spawnId]) || place?.spawn || { position: [0, 0, 0], yaw: 0 }
    return {
      x: spawn.position[0],
      y: spawn.position[1] || 0,
      z: spawn.position[2],
      yaw: spawn.yaw || 0,
    }
  }

  function welcome(s) {
    const place = catalog.places[s.placeId]
    return {
      type: 'welcome',
      selfId: s.id,
      placeId: s.placeId,
      title: place?.title || s.placeId,
      role: s.role,
      displayName: s.displayName,
      estateId: s.estateId,
      capacity: place?.capacity || null,
      counts: counts(s.placeId, s.instanceId),
      voice: VOICE_HOOK,
      aoi: { full: AOI_LIMITS.full, pets: AOI_LIMITS.pets },
      singleSession: true,
      instanceId: s.instanceId,
      avatar: s.role === 'guest' && s.placeId === GUEST_HOUSE
        ? { fitted: true, stays: GUEST_HOUSE, instanceId: s.instanceId }
        : null,
    }
  }

  function enqueue(s, placeId, reason) {
    const q = queueFor(placeId)[s.role]
    s.placeId = 'waiting-room'
    s.instanceId = null
    s.queuedFor = placeId
    s.queuedRole = s.role
    const at = spawnOf('waiting-room')
    s.x = at.x
    s.y = at.y
    s.z = at.z
    s.yaw = at.yaw
    q.push(s.id)
    return {
      type: 'waiting',
      queuedFor: placeId,
      queuedTitle: catalog.places[placeId]?.title || placeId,
      role: s.role,
      ahead: q.length - 1,
      ticket: q.length,
      reason,
      singleSession: true,
    }
  }

  function tryAdmit(placeId, role) {
    const place = catalog.places[placeId]
    if (!place) return
    const q = queueFor(placeId)[role]
    while (q.length && occupancy(placeId)[role] < capOf(place, role)) {
      const id = q.shift()
      const s = sessions.get(id)
      if (!s || s.queuedFor !== placeId || s.role !== role) continue
      s.queuedFor = null
      s.placeId = placeId
      s.instanceId = guestInstanceId(placeId, s.id)
      const at = spawnOf(placeId)
      s.x = at.x
      s.y = at.y
      s.z = at.z
      s.yaw = at.yaw
      s.outbound.push({
        type: 'admitted',
        placeId,
        title: place.title,
        spawn: place.spawn,
      })
    }
  }

  function join(raw) {
    const role = raw.role
    if (!ROLES.includes(role)) return { error: { type: 'join-denied', reason: 'role' } }
    const placeId = canonicalGuestPlace(String(raw.placeId || 'keep'))
    const place = catalog.places[placeId]
    if (!place) return { error: { type: 'join-denied', reason: 'place', detail: 'That place is not on the map.' } }
    if (placeId === GUEST_HOUSE && role !== 'guest') {
      return {
        error: {
          type: 'join-denied',
          reason: 'guest-house-guests-only',
          detail: 'The guest house holds a guest avatar. It is not a gate.',
        },
      }
    }
    const denial = guestJoinDenial(role, placeId, place.kind)
    if (denial) {
      const detail = denial === 'no-estate-access'
        ? 'A guest has no estate access.'
        : denial === 'no-ledger-access'
          ? 'A guest has no ledger access.'
          : 'A guest does not travel into Emberwild. The avatar stays in the guest house.'
      return { error: { type: 'join-denied', reason: denial, detail } }
    }
    const estateId = raw.estateId ? String(raw.estateId) : null
    if (role === 'pet') {
      if (!estateId) {
        return { error: { type: 'join-denied', reason: 'pet-residence', detail: 'A pet comes out from a residence.' } }
      }
      const max = catalog.rules?.pets?.maxOutPerResidence ?? 2
      if (placeId !== estateId && petsOut(estateId) >= max) {
        return {
          error: {
            type: 'join-denied',
            reason: 'pets-out-cap',
            detail: `This residence already has ${max} pets out. That number is a draft default and can change.`,
          },
        }
      }
    }
    const s = {
      id: `p${seq++}`,
      role,
      displayName: cleanName(raw.displayName),
      estateId,
      placeId,
      instanceId: null,
      queuedFor: null,
      x: 0,
      y: 0,
      z: 0,
      yaw: 0,
      outbound: [],
      lastChat: 0,
    }
    sessions.set(s.id, s)
    if (occupancy(placeId)[role] > capOf(place, role)) {
      // counts includes the newcomer, so greater-than means the cap was already full
      s.outbound.push(enqueue(s, placeId, `${role === 'being' ? 'beings' : role === 'guest' ? 'guests' : 'pets'}-full`))
    } else {
      const at = spawnOf(placeId, raw.spawn)
      s.instanceId = guestInstanceId(placeId, s.id)
      s.x = at.x
      s.y = at.y
      s.z = at.z
      s.yaw = at.yaw
      s.outbound.push(welcome(s))
    }
    return { session: s }
  }

  function resolveTarget(s, gw) {
    if (gw.requires?.nameIncludes) {
      const needle = String(gw.requires.nameIncludes).toLowerCase()
      if (!s.displayName.toLowerCase().includes(needle)) {
        return { denied: { type: 'portal-denied', reason: 'orchard-nakor', gatewayId: gw.id, detail: 'The small portal answers to a being like Nakor.' } }
      }
    }
    let placeId = null
    let spawn = null
    if (gw.target?.kind === 'estate-of-self') {
      placeId = s.estateId
      if (!placeId || !catalog.places[placeId]) {
        return { placeId: gw.fallback.place, via: 'fallback', spawn: null }
      }
    } else if (gw.target?.kind === 'gltf') {
      placeId = gw.target.place
      if (!placeId || !catalog.places[placeId]) return { placeId: gw.fallback.place, via: 'fallback', spawn: null }
    } else if (gw.target?.kind === 'place') {
      placeId = gw.target.place
      spawn = gw.target.spawn || null
      if (!catalog.places[placeId]) return { placeId: gw.fallback.place, via: 'fallback', spawn: null }
    } else {
      return { placeId: gw.fallback.place, via: 'fallback', spawn: null }
    }
    return { placeId, via: 'target', spawn }
  }

  function moveTo(s, requestedPlaceId, via, gatewayId, spawnId) {
    const placeId = canonicalGuestPlace(requestedPlaceId)
    if (s.queuedFor) {
      const q = queueFor(s.queuedFor)[s.role]
      const i = q.indexOf(s.id)
      if (i >= 0) q.splice(i, 1)
      s.queuedFor = null
    }
    const place = catalog.places[placeId]
    if (!place) {
      s.outbound.push({ type: 'portal-denied', reason: 'missing', gatewayId })
      return
    }
    if (s.role === 'guest' && placeId !== GUEST_HOUSE) {
      s.outbound.push({
        type: 'portal-denied',
        reason: 'no-portal-rights',
        detail: 'A guest has no portal rights. The avatar stays in the guest house.',
      })
      return
    }
    if (placeId === GUEST_HOUSE && s.role !== 'guest') {
      s.outbound.push({
        type: 'portal-denied',
        reason: 'display-only',
        detail: 'That mark shows the guest house. It is not a gate.',
      })
      return
    }
    if (s.role === 'pet' && s.estateId && placeId !== s.estateId) {
      const max = catalog.rules?.pets?.maxOutPerResidence ?? 2
      const already = petsOut(s.estateId) - (s.placeId !== s.estateId && !s.queuedFor ? 1 : 0)
      if (already >= max) {
        s.outbound.push({
          type: 'portal-denied',
          reason: 'pets-out-cap',
          detail: `This residence already has ${max} pets out.`,
        })
        return
      }
    }
    const previous = s.placeId
    const previousRole = s.role
    if (occupancy(placeId)[s.role] >= capOf(place, s.role) && placeId !== 'waiting-room') {
      s.outbound.push(enqueue(s, placeId, `${s.role === 'being' ? 'beings' : s.role === 'guest' ? 'guests' : 'pets'}-full`))
    } else {
      s.placeId = placeId
      s.instanceId = guestInstanceId(placeId, s.id)
      const at = spawnOf(placeId, spawnId)
      s.x = at.x
      s.y = at.y
      s.z = at.z
      s.yaw = at.yaw
      s.outbound.push({
        type: 'move',
        placeId,
        title: place.title,
        via,
        gatewayId,
        spawn: spawnId ? place.spawns?.[spawnId] || place.spawn : place.spawn,
        voice: VOICE_HOOK,
      })
      if (placeId === 'boathouse' || placeId === 'gate-tower') {
        for (const other of sessions.values()) {
          if (other.placeId === 'keep' && !other.queuedFor) other.outbound.push({ type: 'bell', from: placeId })
        }
        s.outbound.push({ type: 'bell', from: placeId })
      }
    }
    if (previous && previous !== 'waiting-room') tryAdmit(previous, previousRole)
  }

  function forceFallback(s, gatewayId) {
    if (!guestMayUsePortal(s.role)) {
      s.outbound.push({
        type: 'portal-denied',
        reason: 'no-portal-rights',
        detail: 'A guest has no portal rights. The avatar stays in the guest house.',
      })
      return
    }
    moveTo(s, 'fallback-unavailable', 'fallback', gatewayId || 'client', null)
  }

  function portal(s, msg) {
    const gw = catalog.gateways[msg.gatewayId]
    if (!gw) {
      s.outbound.push({ type: 'portal-denied', reason: 'unknown-gate' })
      return
    }
    if (!guestMayUsePortal(s.role)) {
      s.outbound.push({
        type: 'portal-denied',
        reason: 'no-portal-rights',
        detail: 'A guest has no portal rights. The avatar stays in the guest house.',
      })
      return
    }
    if (gw.displayOnly || gw.target?.place === GUEST_HOUSE) {
      s.outbound.push({
        type: 'portal-denied',
        reason: 'display-only',
        detail: 'That mark shows the guest house. It is not a gate.',
      })
      return
    }
    const resolved = resolveTarget(s, gw)
    if (resolved.denied) {
      s.outbound.push(resolved.denied)
      return
    }
    moveTo(s, resolved.placeId, resolved.via, gw.id, resolved.spawn)
  }

  function chat(s, msg) {
    if (s.role === 'pet') {
      s.outbound.push({ type: 'chat-denied', reason: 'pets-do-not-speak', detail: 'Pets do not speak.' })
      return
    }
    const text = String(msg.text || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 200)
    if (!text) return
    const now = Date.now()
    if (now - s.lastChat < 250) return
    s.lastChat = now
    const payload = { type: 'chat', from: s.displayName, role: s.role, id: s.id, text, at: now, placeId: s.placeId }
    for (const other of sessions.values()) {
      if (other.placeId === s.placeId && !other.queuedFor && other.instanceId === s.instanceId) other.outbound.push(payload)
    }
  }

  function pose(s, msg) {
    if (typeof msg.x === 'number') s.x = msg.x
    if (typeof msg.y === 'number') s.y = msg.y
    if (typeof msg.z === 'number') s.z = msg.z
    if (typeof msg.yaw === 'number') s.yaw = msg.yaw
  }

  function leave(id) {
    const s = sessions.get(id)
    if (!s) return
    const placeId = s.queuedFor ? null : s.placeId
    const role = s.role
    if (s.queuedFor) {
      const q = queueFor(s.queuedFor)[s.role]
      const i = q.indexOf(s.id)
      if (i >= 0) q.splice(i, 1)
    }
    sessions.delete(id)
    if (placeId) tryAdmit(placeId, role)
  }

  function takeOutbound() {
    const batches = []
    for (const s of sessions.values()) {
      if (!s.outbound.length) continue
      batches.push([s.id, s.outbound.splice(0)])
    }
    return batches
  }

  function tick() {
    const t0 = performance.now()
    for (const s of sessions.values()) {
      if (s.queuedFor) continue
      const interest = interestSet(s, sessions)
      const entities = interest.full.concat(interest.pets).map(entityOf)
      s.outbound.push({ type: 'snapshot', tick: stats.ticks, entities, counts: counts(s.placeId, s.instanceId) })
      stats.snapshots++
    }
    const ms = performance.now() - t0
    stats.ticks++
    stats.tickMsTotal += ms
    stats.lastTickMs = ms
    if (ms > stats.maxTickMs) stats.maxTickMs = ms
    return takeOutbound()
  }

  function noteBytes(n) {
    stats.bytesOut += n
  }

  return { join, portal, chat, pose, leave, tick, takeOutbound, counts, sessions, stats, noteBytes, petsOut, forceFallback }
}
