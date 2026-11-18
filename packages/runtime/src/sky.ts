import * as THREE from 'three'
import { quality, reducedMotion } from './quality'

/** A west-coast sky for Pacific time. Not the viewer's GPS. */
const LON = -122
const LAT = 37.7 * Math.PI / 180

const STARS: [string, number, number][] = [
  ['Polaris', 2.53, 89.3],
  ['Vega', 18.62, 38.8],
  ['Deneb', 20.69, 45.3],
  ['Altair', 19.85, 8.9],
  ['Arcturus', 14.26, 19.2],
  ['Capella', 5.28, 46.0],
  ['Aldebaran', 4.60, 16.5],
  ['Rigel', 5.24, -8.2],
  ['Betelgeuse', 5.92, 7.4],
  ['Sirius', 6.75, -16.7],
  ['Procyon', 7.65, 5.2],
  ['Castor', 7.58, 31.9],
  ['Pollux', 7.76, 28.0],
  ['Regulus', 10.14, 11.97],
  ['Spica', 13.42, -11.16],
  ['Antares', 16.49, -26.4],
  ['Fomalhaut', 22.96, -29.6],
  ['Alpheratz', 0.14, 29.1],
  ['Hamal', 2.12, 23.5],
  ['Algol', 3.14, 40.96],
  ['Elnath', 5.44, 28.6],
  ['Canopus', 6.40, -52.7],
  ['Dubhe', 11.06, 61.75],
  ['Alioth', 12.90, 55.96],
  ['Alkaid', 13.79, 49.3],
  ['Mizar', 13.40, 54.9],
  ['Schedar', 0.68, 56.5],
  ['Caph', 0.15, 59.15],
  ['Mirfak', 3.41, 49.86],
  ['Alnilam', 5.60, -1.2],
  ['Saiph', 5.80, -9.67],
  ['Bellatrix', 5.42, 6.35],
  ['Alnitak', 5.68, -1.94],
  ['Mintaka', 5.53, -0.3],
  ['Adhara', 6.98, -28.97],
  ['Wezen', 7.14, -26.39],
  ['Avior', 8.37, -59.5],
  ['Miaplacidus', 9.22, -69.7],
  ['Hadar', 14.06, -60.37],
  ['Rigil Kent', 14.66, -60.83],
  ['Acrux', 12.44, -63.1],
  ['Gacrux', 12.52, -57.1],
  ['Shaula', 17.56, -37.1],
  ['Kaus Australis', 18.40, -34.38],
  ['Nunki', 18.92, -26.3],
  ['Enif', 21.74, 9.88],
  ['Markab', 23.08, 15.2],
  ['Alnair', 22.14, -46.96],
]

function julian(date: Date) {
  return date.getTime() / 86400000 + 2440587.5
}

function gmstHours(date: Date) {
  const d = julian(date) - 2451545.0
  return ((18.697374558 + 24.06570982441908 * d) % 24 + 24) % 24
}

export function moonAge(date = new Date()) {
  const synodic = 29.530588853
  const known = Date.UTC(2000, 0, 6, 18, 14)
  return ((date.getTime() - known) / 86400000 % synodic + synodic) % synodic
}

export class NightSky {
  readonly group = new THREE.Group()
  private ember: THREE.Points
  private flare = 0

  constructor() {
    const positions: number[] = []
    const lst = gmstHours(new Date()) + LON / 15
    for (const [, ra, decDeg] of STARS) {
      const dec = decDeg * Math.PI / 180
      const ha = ((lst - ra) * 15 * Math.PI) / 180
      const alt = Math.asin(Math.sin(LAT) * Math.sin(dec) + Math.cos(LAT) * Math.cos(dec) * Math.cos(ha))
      const az = Math.atan2(-Math.sin(ha), Math.tan(dec) * Math.cos(LAT) - Math.sin(LAT) * Math.cos(ha))
      if (alt < 0.02) continue
      const r = 400
      positions.push(Math.sin(az) * Math.cos(alt) * r, Math.sin(alt) * r, -Math.cos(az) * Math.cos(alt) * r)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    const stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xf4efe4, size: 1.6, sizeAttenuation: false }))
    this.group.add(stars)
    const emberGeo = new THREE.BufferGeometry()
    emberGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 380, -40], 3))
    this.ember = new THREE.Points(emberGeo, new THREE.PointsMaterial({ color: 0xffb060, size: 3.2, sizeAttenuation: false }))
    this.ember.name = 'ember-star'
    this.group.add(this.ember)
    this.group.add(this.moonMesh())
  }

  private moonMesh() {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')!
    const age = moonAge()
    const phase = age / 29.530588853
    g.clearRect(0, 0, 64, 64)
    g.fillStyle = '#f3ead2'
    g.beginPath()
    g.arc(32, 32, 22, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#1a140e'
    g.globalAlpha = 0.92
    g.beginPath()
    g.ellipse(32 + Math.cos(phase * Math.PI * 2) * 18, 32, 22 * Math.abs(Math.cos(phase * Math.PI * 2)), 22, 0, 0, Math.PI * 2)
    g.fill()
    const tex = new THREE.CanvasTexture(c)
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
    const sprite = new THREE.Sprite(mat)
    sprite.scale.set(18, 18, 1)
    sprite.position.set(-80, 220, -180)
    sprite.name = 'moon'
    return sprite
  }

  update(night: boolean, calm: boolean, now: number) {
    const show = night && !calm && quality().stars
    this.group.visible = show
    if (!show || reducedMotion()) return
    this.flare += 0.01
    const mat = this.ember.material as THREE.PointsMaterial
    mat.size = 2.4 + Math.sin(this.flare) * 1.4 + (Math.sin(now * 0.0003) > 0.995 ? 4 : 0)
  }
}
