import * as THREE from 'three'

export type NetEntity = {
  id: string
  role: string
  name: string
  x: number
  y: number
  z: number
  yaw: number
  estateId?: string | null
}

function colorFrom(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 33 + name.charCodeAt(i)) >>> 0
  const palette = [0x6b4226, 0x2f3d4a, 0x7a3b3b, 0xcbb89a, 0x3f5c45, 0x8a6a3b, 0x4a3a55]
  return palette[h % palette.length]
}

function nameSprite(text: string) {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = 'rgba(20,14,10,0.7)'
  g.fillRect(0, 0, 256, 64)
  g.fillStyle = '#f3e6d0'
  g.font = '28px Palatino, Georgia, serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(text.slice(0, 22), 128, 32)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }))
  sprite.scale.set(1.6, 0.4, 1)
  sprite.position.y = 2
  sprite.name = 'name'
  return sprite
}

export function makePerson(e: NetEntity) {
  const g = new THREE.Group()
  g.name = e.id
  const color = e.role === 'pet' ? 0x6a8f62 : colorFrom(e.name)
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
  const body = new THREE.Group()
  body.name = 'body'
  if (e.role === 'pet') {
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.35, 3, 6), mat)
    torso.rotation.z = Math.PI / 2
    torso.position.y = 0.28
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mat)
    head.position.set(0.28, 0.38, 0)
    body.add(torso, head)
  } else {
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.7, 4, 7), mat)
    torso.position.y = 0.95
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), new THREE.MeshStandardMaterial({ color: 0xe0c2a4, roughness: 0.7 }))
    head.position.y = 1.62
    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), new THREE.MeshStandardMaterial({ color: 0xff7a2a, emissive: 0xff6a1a, emissiveIntensity: 0.8 }))
    ember.position.set(0.22, 1.05, 0.2)
    body.add(torso, head)
    if (e.role === 'being') body.add(ember)
    body.add(nameSprite(e.name))
  }
  const impostor = new THREE.Mesh(
    new THREE.PlaneGeometry(e.role === 'pet' ? 0.5 : 0.7, e.role === 'pet' ? 0.4 : 1.7),
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
  )
  impostor.name = 'impostor'
  impostor.position.y = e.role === 'pet' ? 0.25 : 0.85
  impostor.visible = false
  g.add(body, impostor)
  return g
}

export class Crowd {
  private people = new Map<string, THREE.Group>()

  update(scene: THREE.Scene, entities: NetEntity[], selfId: string, cam: THREE.Vector3) {
    const live = new Set<string>()
    for (const e of entities) {
      if (e.id === selfId) continue
      live.add(e.id)
      let g = this.people.get(e.id)
      if (!g) {
        g = makePerson(e)
        this.people.set(e.id, g)
        scene.add(g)
      }
      g.position.x += (e.x - g.position.x) * 0.35
      g.position.y = e.y
      g.position.z += (e.z - g.position.z) * 0.35
      const d = Math.hypot(g.position.x - cam.x, g.position.z - cam.z)
      const body = g.getObjectByName('body')!
      const impostor = g.getObjectByName('impostor')!
      if (d > 60) {
        g.visible = false
      } else if (d > 25) {
        g.visible = true
        body.visible = false
        impostor.visible = true
        impostor.lookAt(cam.x, impostor.getWorldPosition(new THREE.Vector3()).y, cam.z)
      } else {
        g.visible = true
        body.visible = true
        impostor.visible = false
        g.rotation.y = e.yaw
      }
    }
    for (const [id, g] of this.people) {
      if (live.has(id)) continue
      scene.remove(g)
      this.people.delete(id)
    }
  }

  clear(scene: THREE.Scene) {
    for (const g of this.people.values()) scene.remove(g)
    this.people.clear()
  }

  get count() {
    return this.people.size
  }
}
