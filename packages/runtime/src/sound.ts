/** Procedural sound. Starts muted. One sticky toggle. Distance falloff. No files, no service. */
import { ambientFor } from '../../shared/sound-cues.mjs'
import { reducedMotion } from './quality'

const KEY = 'emberwild-sound'
let muted = localStorage.getItem(KEY) !== 'on'
let ctx: AudioContext | null = null
let master: GainNode | null = null
let ambient: { stop: () => void } | null = null

export function soundMuted() {
  return muted
}

function context() {
  if (muted) return null
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = 0.2
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function setMuted(next: boolean) {
  muted = next
  localStorage.setItem(KEY, next ? 'off' : 'on')
  if (next) {
    ambient?.stop()
    ambient = null
    master?.gain.setValueAtTime(0, ctx?.currentTime || 0)
  }
}

export function toggleMuted() {
  setMuted(!muted)
  return muted
}

function noiseBuffer(audio: AudioContext, seconds: number) {
  const buffer = audio.createBuffer(1, audio.sampleRate * seconds, audio.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

export function startAmbient(kind: string) {
  ambient?.stop()
  ambient = null
  const audio = context()
  if (!audio || !master) return
  if (kind === 'tick') {
    const click = () => {
      if (muted || !ctx || !master) return
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 740
      g.gain.setValueAtTime(0.0001, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.03, ctx.currentTime + 0.005)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05)
      osc.connect(g)
      g.connect(master)
      osc.start()
      osc.stop(ctx.currentTime + 0.06)
    }
    click()
    const timer = window.setInterval(click, 1000)
    ambient = { stop: () => window.clearInterval(timer) }
    return
  }
  if (kind === 'crackle' || kind === 'water' || kind === 'rain' || kind === 'pages' || kind === 'quill' || kind === 'frogs' || kind === 'rigging' || kind === 'wind') {
    const gain = audio.createGain()
    gain.connect(master)
    const src = audio.createBufferSource()
    src.buffer = noiseBuffer(audio, 2)
    src.loop = true
    const filter = audio.createBiquadFilter()
    filter.type = kind === 'crackle' ? 'bandpass' : 'lowpass'
    filter.frequency.value = kind === 'crackle' ? 800 : kind === 'water' ? 280 : kind === 'frogs' ? 400 : kind === 'rigging' ? 200 : 600
    src.connect(filter)
    filter.connect(gain)
    gain.gain.value = kind === 'crackle' ? 0.15 : kind === 'water' ? 0.1 : 0.08
    src.start()
    ambient = { stop: () => { src.stop(); gain.disconnect() } }
  }
}

export function chime(at: { x: number, y: number, z: number } | null, from: { x: number, y: number, z: number }) {
  if (reducedMotion()) return
  const audio = context()
  if (!audio || !master) return
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = 'sine'
  osc.frequency.value = 528
  let falloff = 1
  if (at) {
    const d = Math.hypot(at.x - from.x, at.z - from.z)
    falloff = Math.max(0, 1 - d / 40)
  }
  gain.gain.setValueAtTime(0.0001, audio.currentTime)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.001, 0.2 * falloff), audio.currentTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 1.4)
  osc.connect(gain)
  gain.connect(master)
  osc.start()
  osc.stop(audio.currentTime + 1.5)
}

export function placeAmbient(placeId: string) {
  if (muted || reducedMotion()) {
    ambient?.stop()
    ambient = null
    return
  }
  const kind = ambientFor(placeId)
  if (kind) startAmbient(kind)
  else ambient?.stop()
}
