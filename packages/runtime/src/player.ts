import { EYE as eyeMeters, stepBody as stepJs } from '../../shared/body.mjs'

export type Body = {
  x: number
  y: number
  z: number
  yaw: number
  pitch: number
  vx: number
  vy: number
  vz: number
  grounded: boolean
}

export type Collider = {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

export const EYE: number = eyeMeters

export function stepBody(b: Body, wishF: number, wishS: number, jump: boolean, dt: number, boxes: Collider[]) {
  stepJs(b, wishF, wishS, jump, dt, boxes)
}
