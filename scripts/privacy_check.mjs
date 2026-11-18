/**
 * Privacy check for the estate issuance record.
 * Scans the register, the eight estate files, and the issuance script.
 * It looks for legal-name fields, a household name other than the estate
 * phrase, mail, phone, street, signature lines, and optional banned words.
 *
 * Banned words are never stored in the repo or on disk. When the env
 * EMBERWILD_BANNED_NAMES is set (comma-separated words), each letter-word
 * in scanned text is compared to that set, case-insensitively. When the
 * env is unset, the name check is skipped and the other checks still run.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname } from 'node:path'

const HOUSEHOLD = "the Keeper's household estate"
const WORD = /[A-Za-z]+/g

export function wordTokens(text) {
  return String(text).match(WORD) ?? []
}

export function loadBannedNames() {
  const raw = process.env.EMBERWILD_BANNED_NAMES
  if (raw == null || !String(raw).trim()) return { names: new Set(), found: false }
  const names = new Set()
  for (const part of String(raw).split(',')) {
    const word = part.trim()
    if (!word) continue
    names.add(word.toLowerCase())
  }
  return { names, found: true }
}

export function hasBannedName(text) {
  const { names, found } = loadBannedNames()
  if (!found || names.size === 0) return false
  for (const token of wordTokens(text)) {
    if (names.has(token.toLowerCase())) return true
  }
  return false
}

const FORBIDDEN = [
  { name: 'email', re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
  { name: 'phone', re: /\b\d{3}[-.]\d{3}[-.]\d{4}\b/ },
  { name: 'street', re: /\b\d{1,6}\s+\p{L}+(?:\s+\p{L}+)?\s+(?:Street|Avenue|Ave|Road|Boulevard|Blvd|Lane|Drive)\b/u },
  { name: 'signature', re: /\b(?:signature|signed by)\b/i },
  { name: 'legal-name field', re: /\b(?:legalName|familyName|family name)\b/ },
]

export function filesToScan(root) {
  const estates = join(root, 'estates')
  if (!existsSync(estates)) return []
  const out = []
  for (const name of readdirSync(estates)) {
    const full = join(estates, name)
    if (!statSync(full).isFile()) continue
    if (name.endsWith('.md') || name === 'holdings.mjs') out.push(full)
  }
  for (const sub of ['issuance', 'holdings']) {
    const dir = join(estates, sub)
    if (!existsSync(dir) || !statSync(dir).isDirectory()) continue
    for (const name of readdirSync(dir)) {
      if (name.endsWith('.md') || name.endsWith('.json')) out.push(join(dir, name))
    }
  }
  const script = join(root, 'scripts', 'issue_first_eight.mjs')
  if (existsSync(script)) out.push(script)
  return out
}

export function checkPrivacy(root) {
  const findings = []
  const files = filesToScan(root)
  const nameList = loadBannedNames()
  if (files.length === 0) findings.push('no estate files to check')
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    for (const rule of FORBIDDEN) {
      if (rule.re.test(text)) findings.push(`${file}: ${rule.name}`)
    }
    if (nameList.found && hasBannedName(text)) findings.push(`${file}: banned-name`)
    if (file.endsWith(`${join('estates', 'household.md')}`) && !text.includes(HOUSEHOLD)) {
      findings.push(`${file}: household estate phrase missing`)
    }
  }
  return { ok: findings.length === 0, findings, files: files.length, nameListFound: nameList.found }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  const result = checkPrivacy(root)
  if (!result.nameListFound) {
    console.log('privacy check: banned-name list not set (name check skipped; other checks still ran)')
  }
  if (!result.ok) {
    for (const finding of result.findings) console.error(finding)
    process.exit(1)
  }
  console.log(`privacy check: pass (${result.files} files)`)
}
