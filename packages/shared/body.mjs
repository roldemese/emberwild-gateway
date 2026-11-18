/** Half-Life movement in meters. 1 unit = 1 inch. Keep stepBody and the support rule in this file. */

const INCH = 0.0254
const PHYS = {
  gravity: 800 * INCH,
  maxspeed: 320 * INCH,
  jump: 268 * INCH,
  stopspeed: 100 * INCH,
  friction: 4,
  accelerate: 10,
  airaccelerate: 10,
  wishAir: 30 * INCH,
}

const RADIUS = 0.35

function applyFriction(b, dt) {
  const speed = Math.hypot(b.vx, b.vz)
  if (speed < 0.01) {
    b.vx = 0
    b.vz = 0
    return
  }
  const drop = Math.max(speed, PHYS.stopspeed) * PHYS.friction * dt
  const next = Math.max(0, speed - drop) / speed
  b.vx *= next
  b.vz *= next
}

function accelerate(b, wx, wz, speed, accel, dt) {
  const current = b.vx * wx + b.vz * wz
  const add = speed - current
  if (add <= 0) return
  let acc = accel * speed * dt
  if (acc > add) acc = add
  b.vx += acc * wx
  b.vz += acc * wz
}

function overlaps(x, z, feet, box) {
  if (box.maxY <= feet + 0.3) return false
  if (box.minY >= feet + 1.65) return false
  if (x + RADIUS <= box.minX || x - RADIUS >= box.maxX) return false
  if (z + RADIUS <= box.minZ || z - RADIUS >= box.maxZ) return false
  return true
}

/**
 * Highest deck at or below the feet. Open ground with no box stays at y = 0.
 * A deck below the waterline can still be stood on. The old floor of 0 only
 * applies when nothing is underfoot, so the wilds and the docks do not drop away.
 */
export function supportAt(x, z, feet, boxes) {
  let best = null
  for (const box of boxes) {
    if (x <= box.minX - RADIUS || x >= box.maxX + RADIUS) continue
    if (z <= box.minZ - RADIUS || z >= box.maxZ + RADIUS) continue
    if (box.maxY <= feet + 0.45 && (best === null || box.maxY > best)) best = box.maxY
  }
  return best === null ? 0 : best
}

export function stepBody(b, wishF, wishS, jump, dt, boxes) {
  if (b.grounded) applyFriction(b, dt)
  const sin = Math.sin(b.yaw)
  const cos = Math.cos(b.yaw)
  const fx = -sin
  const fz = -cos
  const rx = cos
  const rz = -sin
  let wx = fx * wishF + rx * wishS
  let wz = fz * wishF + rz * wishS
  const mag = Math.hypot(wx, wz)
  if (mag > 0) {
    wx /= mag
    wz /= mag
  }
  const speed = b.grounded ? PHYS.maxspeed : PHYS.wishAir
  accelerate(b, wx, wz, mag > 0 ? speed : 0, b.grounded ? PHYS.accelerate : PHYS.airaccelerate, dt)
  if (jump && b.grounded) {
    b.vy = PHYS.jump
    b.grounded = false
  }
  if (!b.grounded) b.vy -= PHYS.gravity * dt

  let nx = b.x + b.vx * dt
  for (const box of boxes) {
    if (!overlaps(nx, b.z, b.y, box)) continue
    nx = b.vx > 0 ? box.minX - RADIUS : box.maxX + RADIUS
    b.vx = 0
  }
  let nz = b.z + b.vz * dt
  for (const box of boxes) {
    if (!overlaps(nx, nz, b.y, box)) continue
    nz = b.vz > 0 ? box.minZ - RADIUS : box.maxZ + RADIUS
    b.vz = 0
  }
  b.x = nx
  b.z = nz

  const support = supportAt(b.x, b.z, b.y, boxes)
  let ny = b.y + b.vy * dt
  if (ny <= support) {
    ny = support
    b.vy = 0
    b.grounded = true
  } else {
    b.grounded = false
  }
  b.y = ny
}

/** Half-Life view is 64 inches (1.63 m). The walking eye is set at 1.70 m, the stature in the world note. */
export const EYE = 1.7

export function walkRoute(boxes, route) {
  const failures = []
  if (!route.length) return ['empty route']
  const b = {
    x: route[0].x,
    y: route[0].y,
    z: route[0].z,
    yaw: 0,
    pitch: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    grounded: true,
  }
  for (let i = 1; i < route.length; i++) {
    const target = route[i]
    b.vx = 0
    b.vz = 0
    b.vy = 0
    const dist0 = Math.hypot(target.x - b.x, target.z - b.z) + Math.abs(target.y - b.y)
    const frames = Math.min(2000, Math.max(90, Math.ceil(dist0 / 0.12) + 40))
    let arrived = false
    let stuck = 0
    let last = `${b.x},${b.z}`
    for (let n = 0; n < frames; n++) {
      const dx = target.x - b.x
      const dz = target.z - b.z
      const dist = Math.hypot(dx, dz)
      if (dist < 0.7 && Math.abs(b.y - target.y) < 0.6) {
        arrived = true
        break
      }
      const here = `${b.x.toFixed(2)},${b.z.toFixed(2)},${b.y.toFixed(2)}`
      if (here === last) stuck += 1
      else {
        stuck = 0
        last = here
      }
      if (stuck > 20) break
      b.yaw = Math.atan2(-(dx || 0.0001), -(dz || 0.0001))
      stepBody(b, 1, 0, false, 1 / 30, boxes)
    }
    if (!arrived) {
      failures.push(
        `${target.name} stopped at ${b.x.toFixed(2)} ${b.y.toFixed(2)} ${b.z.toFixed(2)} ` +
        `wanted ${target.x.toFixed(2)} ${target.y.toFixed(2)} ${target.z.toFixed(2)}`,
      )
      break
    }
  }
  return failures
}
