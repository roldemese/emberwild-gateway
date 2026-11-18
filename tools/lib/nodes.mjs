/** Small builders shared by the world author. Every node carries movable + transform. */

export function xf(position, rotY = 0) {
  return { position: [position[0], position[1], position[2]], rotation: [0, rotY, 0], scale: [1, 1, 1] }
}

export function box(id, position, size, material, extra = {}) {
  return {
    id,
    kind: 'box',
    movable: false,
    size,
    material,
    collider: !!extra.collider,
    visibility: extra.visibility || 'all',
    held: !!extra.held,
    ...(extra.dress ? { dress: extra.dress } : {}),
    transform: xf(position, extra.rotY || 0),
  }
}

export function cyl(id, position, radiusTop, radiusBottom, height, material, extra = {}) {
  return {
    id,
    kind: 'cylinder',
    movable: false,
    radii: [radiusTop, radiusBottom],
    height,
    material,
    collider: !!extra.collider,
    visibility: extra.visibility || 'all',
    transform: xf(position, extra.rotY || 0),
  }
}

export function sphere(id, position, radius, material, extra = {}) {
  return {
    id,
    kind: 'sphere',
    movable: false,
    radius,
    material,
    emissive: extra.emissive || null,
    visibility: extra.visibility || 'all',
    held: !!extra.held,
    transform: xf(position, extra.rotY || 0),
  }
}

export function sign(id, position, text, extra = {}) {
  return {
    id,
    kind: 'sign',
    movable: false,
    text,
    style: extra.style || 'wood',
    width: extra.width || 1.6,
    height: extra.height || 0.8,
    visibility: 'all',
    transform: xf(position, extra.rotY || 0),
  }
}

export function gateway(spec) {
  return {
    id: spec.id,
    fixed: true,
    movable: false,
    address: spec.address,
    label: spec.label,
    host: spec.host || 'arch',
    target: spec.target,
    fallback: spec.fallback || { kind: 'place', place: 'fallback-unavailable' },
    requires: spec.requires || null,
    onMap: !!spec.onMap,
    group: spec.group || null,
    subtitle: spec.subtitle || '',
    steps: spec.steps || 1,
  }
}

export function portalNode(gw, position, rotY = 0) {
  return {
    id: gw.id,
    kind: 'portal',
    movable: false,
    gatewayId: gw.id,
    label: gw.label,
    transform: xf(position, rotY),
  }
}

export function mapTable(id, position, rotY = 0) {
  return {
    id,
    kind: 'map-table',
    movable: false,
    label: 'PUBLIC MAP',
    transform: xf(position, rotY),
  }
}

export function hearth(id, position) {
  return {
    id,
    kind: 'hearth',
    movable: false,
    transform: xf(position),
  }
}

export function lantern(id, position, extra = {}) {
  return {
    id,
    kind: 'lantern',
    movable: false,
    alwaysLit: !!extra.alwaysLit,
    light: !!extra.light,
    hanging: !!extra.hanging,
    variant: extra.variant || 'cage',
    transform: xf([position[0], position[1], position[2]], extra.rotY || 0),
  }
}

const FALLBACK = { kind: 'place', place: 'fallback-unavailable' }

export function placeShell(id, title, extra = {}) {
  return {
    formatVersion: 1,
    id,
    title,
    static: true,
    interior: !!extra.interior,
    privacy: extra.privacy || 'public',
    draft: !!extra.draft,
    summary: extra.summary || '',
    units: { cubitMeters: 0.457 },
    capacity: extra.capacity,
    voice: extra.voice,
    spawn: extra.spawn,
    spawns: extra.spawns || {},
    atmosphere: extra.atmosphere || {},
    nodes: [],
    gateways: [],
  }
}

export function toHearth(placeId, position, rotY = 0) {
  const gw = gateway({
    id: `${placeId}-to-hearth`,
    address: `ember://gateway/${placeId}/hearth`,
    label: 'Hearth plaza',
    host: 'arch',
    target: { kind: 'place', place: 'keep' },
    fallback: FALLBACK,
  })
  return { gw, node: portalNode(gw, position, rotY) }
}

export { FALLBACK }
