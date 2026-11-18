/**
 * Public companion rooms. Paper props. Leaf stays 0.
 * One node draws the furniture so the prop cap stays small.
 */
import * as THREE from 'three'
import { makeLabel, material } from './materials'

function box(size: number[], mat: string, at: number[]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material(mat))
  mesh.position.set(at[0], at[1], at[2])
  return mesh
}

export function dressCompanion(set: string, group: THREE.Group, towns: string[]) {
  if (set === 'judge') dressJudge(group)
  else if (set === 'registry') dressRegistry(group, towns)
  else if (set === 'proving') dressProving(group)
  else if (set === 'envoy') dressEnvoy(group)
  else if (set === 'library') dressLibrary(group, towns)
}

function dressJudge(group: THREE.Group) {
  const table = box([2.4, 0.1, 1.1], 'timber', [0, 0.74, -1.2])
  const leg = box([0.12, 0.7, 0.12], 'timberDark', [-1, 0.35, -1.5])
  const leg2 = leg.clone()
  leg2.position.x = 1
  const beam = box([0.9, 0.06, 0.06], 'brass', [0.3, 0.95, -1.2])
  const panL = box([0.22, 0.04, 0.22], 'brass', [-0.15, 0.86, -1.2])
  const panR = box([0.22, 0.04, 0.22], 'brass', [0.75, 0.86, -1.2])
  const lantern = box([0.16, 0.28, 0.16], 'brass', [-0.7, 0.95, -0.9])
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), material('ember'))
  flame.position.set(-0.7, 1.05, -0.9)
  const ruling = makeLabel("President's ruling:\n____", 'draft', 1.1, 0.45)
  ruling.position.set(0.15, 0.86, -1.2)
  ruling.rotation.x = -Math.PI / 2
  const spines = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 0.32, 0.22), material('timber'), 50)
  const dummy = new THREE.Object3D()
  for (let i = 0; i < 50; i++) {
    dummy.position.set(-5.4, 0.8 + Math.floor(i / 25) * 0.4, -3.2 + (i % 25) * 0.22)
    dummy.updateMatrix()
    spines.setMatrixAt(i, dummy.matrix)
  }
  const note = makeLabel('Ember means a public ruling.\nNone are stored.\nLeaf 0', 'wood', 1.8, 0.7)
  note.position.set(-3.2, 1.7, -4.2)
  const win = box([1.6, 1.1, 0.06], 'glass', [0, 1.8, -4.45])
  const hearth = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), material('ember'))
  hearth.position.set(0, 1.5, -4.2)
  const door = box([0.9, 2.1, 0.08], 'timber', [-4.2, 1.05, 2.2])
  door.rotation.y = 0.5
  const plaque = makeLabel('The Open Door\nAjar. Not a sentence.', 'brass', 1.6, 0.5)
  plaque.position.set(-2.6, 1.6, 2.4)
  const leaves = box([1.2, 0.02, 0.8], 'leaf', [-3.4, 0.02, 3.2])
  group.add(table, leg, leg2, beam, panL, panR, lantern, flame, ruling, spines, note, win, hearth, door, plaque, leaves)
}

function dressRegistry(group: THREE.Group, towns: string[]) {
  const counter = box([4.2, 0.12, 0.7], 'timber', [0, 0.9, -0.4])
  const front = box([4.2, 0.9, 0.2], 'timberDark', [0, 0.45, -0.05])
  const names = towns.slice(0, 8)
  names.forEach((town, i) => {
    const x = -1.6 + (i % 4) * 1.05
    const y = 1.5 - Math.floor(i / 4) * 0.7
    const drawer = box([0.7, 0.28, 0.08], 'timber', [x, y, -4.3])
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.02), material('ember'))
    glow.position.set(x, y - 0.08, -4.24)
    const plate = makeLabel(town || 'town', 'wood', 0.7, 0.24)
    plate.position.set(x, y + 0.22, -4.24)
    group.add(drawer, glow, plate)
  })
  const roll = makeLabel('Roll wall\nTowns only\nNo other names', 'wood', 1.8, 0.7)
  roll.position.set(4.2, 1.8, -2)
  const seal = box([1.1, 0.08, 0.6], 'timber', [3.2, 0.96, 0.6])
  const waxA = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), material('ember'))
  waxA.position.set(3.05, 1.04, 0.6)
  const waxB = waxA.clone()
  waxB.position.x = 3.4
  const thread = box([0.5, 0.02, 0.02], 'cloth', [3.22, 1.02, 0.75])
  const sealNote = makeLabel('Two seals\nNo names', 'brass', 1.1, 0.4)
  sealNote.position.set(3.2, 1.4, 0.6)
  const ledger = makeLabel('Lamp Ledger\nA window lights\nonly after a check\nNone are lit', 'wood', 1.6, 0.9)
  ledger.position.set(-4.2, 1.7, 0.4)
  group.add(counter, front, roll, seal, waxA, waxB, thread, sealNote, ledger)
}

function dressProving(group: THREE.Group) {
  const labels = [
    ['VERIFIED', 'gold', -1.2],
    ['SOFT', 'ember', 0],
    ['UNVERIFIED', 'iron', 1.2],
  ] as const
  for (const [word, mat, x] of labels) {
    const lamp = box([0.16, 0.3, 0.16], mat, [x, 1.5, -3.6])
    const plate = makeLabel(word, 'wood', 1.1, 0.28)
    plate.position.set(x, 1.05, -3.6)
    group.add(lamp, plate)
  }
  const table = box([1.8, 0.1, 0.8], 'timber', [-1.2, 0.74, -0.6])
  const book = makeLabel('Open ledger\nPaper', 'draft', 0.7, 0.35)
  book.position.set(-1.4, 0.86, -0.6)
  book.rotation.x = -Math.PI / 2.2
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.08, 8), material('glass'))
  glass.position.set(-0.7, 0.84, -0.5)
  const kitchen = makeLabel("Carol's Kitchen\nBills. A status page.\nThe 1st is circled.\nA plain paper envelope\nLeaf 0", 'draft', 1.8, 1.1)
  kitchen.position.set(3.4, 1.5, -1)
  const bridge = box([2.2, 0.12, 0.45], 'stone', [0, 0.4, 2.4])
  const plaque = makeLabel('Built to be crossed both ways.', 'brass', 2.4, 0.5)
  plaque.position.set(0, 0.15, 2.8)
  const vault = makeLabel('Archive vault\nCool light\nPaper seals', 'wood', 1.5, 0.6)
  vault.position.set(-4.2, 1.6, 1.2)
  group.add(table, book, glass, kitchen, bridge, plaque, vault)
}

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN',
  'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV',
  'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN',
  'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC', 'PR',
]

function dressEnvoy(group: THREE.Group) {
  const archL = box([0.4, 3.2, 0.4], 'stone', [-1.4, 1.6, 0])
  const archR = box([0.4, 3.2, 0.4], 'stone', [1.4, 1.6, 0])
  const lintel = box([3.2, 0.35, 0.5], 'stone', [0, 3.3, 0])
  const bench = box([1.4, 0.1, 0.4], 'timber', [2.6, 0.45, 1.2])
  const leaves = box([2, 0.02, 1.2], 'leaf', [0, 0.02, 2.2])
  const atlas = makeLabel(`Atlas\n${STATES.slice(0, 12).join(' ')}\n${STATES.slice(12, 24).join(' ')}\nuncounted · Leaf 0`, 'draft', 2.4, 1.2)
  atlas.position.set(0, 1.8, -3.4)
  const table = box([1.2, 0.08, 0.7], 'timber', [-2.8, 0.75, -0.4])
  const lamp = box([0.08, 0.5, 0.08], 'iron', [-2.8, 1.3, -0.4])
  const env = makeLabel('Paper\nenvelope', 'draft', 0.5, 0.3)
  env.position.set(-2.5, 0.86, -0.4)
  env.rotation.x = -Math.PI / 2
  const river = box([3.4, 0.08, 0.9], 'moss', [0.4, 0.06, 3.2])
  group.add(archL, archR, lintel, bench, leaves, atlas, table, lamp, env, river)
}

function dressLibrary(group: THREE.Group, towns: string[]) {
  const stand = box([0.7, 0.9, 0.4], 'timber', [-1.6, 0.45, -1])
  const page = makeLabel("Codex\nToday's ribbon\nFresh ink", 'draft', 0.7, 0.4)
  page.position.set(-1.6, 1.05, -0.85)
  const scale = box([0.5, 0.05, 0.08], 'brass', [0.4, 0.9, -0.6])
  const zero = makeLabel('0🍂', 'brass', 0.6, 0.3)
  zero.position.set(0.9, 0.95, -0.6)
  const six = towns.slice(0, 6)
  six.forEach((town, i) => {
    const drawer = box([0.45, 0.18, 0.06], 'brass', [3.6, 1.6 - i * 0.28, -2.4])
    const plate = makeLabel(town, 'wood', 0.7, 0.18)
    plate.position.set(2.9, 1.6 - i * 0.28, -2.35)
    group.add(drawer, plate)
  })
  const blank = box([0.45, 0.18, 0.06], 'brass', [3.6, 1.6 - 6 * 0.28, -2.4])
  const blankPlate = makeLabel('unlabeled', 'wood', 0.7, 0.18)
  blankPlate.position.set(2.9, 1.6 - 6 * 0.28, -2.35)
  const map = makeLabel('Gazetteer\nA pin for each place\nEdges: not yet charted', 'draft', 1.8, 0.7)
  map.position.set(-3.4, 1.7, 1.4)
  const book = box([0.22, 0.05, 0.16], 'parchment', [-1.15, 0.96, -0.85])
  const book2 = box([0.18, 0.04, 0.14], 'timber', [-1.1, 1.01, -0.95])
  group.add(stand, page, scale, zero, blank, blankPlate, map, book, book2)
}
