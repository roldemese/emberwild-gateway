/**
 * Gallery paintings live in assets/reference.
 * The view asks for /reference/<file>, which is that folder.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

export function paintingUrl(file) {
  const name = String(file || '').split('/').pop()
  if (!name || name.includes('..') || name.includes('\\')) throw new Error('bad painting file')
  return `/reference/${name}`
}

export function copyReference(repo, dest) {
  const from = join(repo, 'assets', 'reference')
  const to = join(dest, 'reference')
  rmSync(to, { recursive: true, force: true })
  mkdirSync(dest, { recursive: true })
  cpSync(from, to, { recursive: true })
  return to
}

export function readPainting(repo, file) {
  const name = paintingUrl(file).slice('/reference/'.length)
  const path = join(repo, 'reference', name)
  if (!existsSync(path)) return null
  return readFileSync(path)
}
