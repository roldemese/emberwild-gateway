/**
 * First eight estates under the sealed decree.
 * --dry-run prints the B-id / E-id table and writes the dry-run record.
 * It does not write the holdings book. A real run appends the eight
 * ESTABLISHED lines once. Leaf stays at 0. No Article 8.9 notice is sent.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  FIRST_EIGHT,
  ISSUED_LABEL,
  RECORDER,
  VERIFIER,
  emptyBook,
  issueFirstEight,
  planFirstEight,
  tieOut,
} from '../estates/holdings.mjs'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadBook(bookPath) {
  if (!existsSync(bookPath)) return emptyBook()
  const book = JSON.parse(readFileSync(bookPath, 'utf8'))
  book.lines ??= []
  book.sealed ??= []
  book.fireBook ??= []
  book.chitBook ??= []
  book.leafBook ??= []
  if (book.leaf !== 0) throw new Error('Leaf stays at 0.')
  return book
}

function lookLabel(line) {
  const key = line.estateKey
  if (!key || key.status !== 'pending' || !key.name) return '—'
  return `Key ${key.lookId}, ${key.name} (pending)`
}

function issuanceTable(rows) {
  const header = '| # | Estate | File | B-id | E-id | Citizenship | Minter | Key look |'
  const rule = '|---|---|---|---|---|---|---|---|'
  const body = rows.map((line, index) => {
    const minter = line.minter ? `locked, ${line.minter.charges} charges` : '—'
    return `| ${index + 1} | ${line.estate} | ${line.file} | ${line.bId} | ${line.eId} | 🔥 already held | ${minter} | ${lookLabel(line)} |`
  })
  return [header, rule, ...body].join('\n')
}

function table(rows) {
  const header = '| # | Estate | File | B-id | E-id | Citizenship | Minter |'
  const rule = '|---|---|---|---|---|---|---|'
  const body = rows.map((line, index) => {
    const minter = line.minter ? `locked, ${line.minter.charges} charges` : '—'
    return `| ${index + 1} | ${line.estate} | ${line.file} | ${line.bId} | ${line.eId} | 🔥 already held | ${minter} |`
  })
  return [header, rule, ...body].join('\n')
}

function totals(rows) {
  const count = tieOut({ leaf: 0, lines: rows, sealed: [], fireBook: [], chitBook: [], leafBook: [] })
  return [
    `Tie-out: ${count.issued} issued + ${count.charges} charges (${count.keeperCharges}+${count.householdCharges}) = ${count.total}`,
    'Leaf total: 0',
    'Article 8.9 transfer notices: none. An opening is not a transfer.',
    'A being record and an estate ID are not a mint and not an issuance.',
    `Verifier: ${VERIFIER}`,
    `Recorder: ${RECORDER}`,
    `When: ${ISSUED_LABEL}`,
  ].join('\n')
}

export function renderDryRun(rows) {
  return [
    '# Dry run — first eight estates',
    '',
    `When: ${ISSUED_LABEL}`,
    'Mode: dry run. No holdings-book lines were written. No Leaf was minted or moved.',
    `Verifier: ${VERIFIER}`,
    `Recorder: ${RECORDER}`,
    'Founders: the Keeper and Arutha',
    '',
    table(rows),
    '',
    totals(rows),
    '',
  ].join('\n')
}

export function renderIssuance(rows) {
  return [
    '# Issuance — first eight estates',
    '',
    `When: ${ISSUED_LABEL}`,
    'Mode: issued. The eight ESTABLISHED lines are in the holdings book.',
    `Verifier: ${VERIFIER}`,
    `Recorder: ${RECORDER}`,
    'Founders: the Keeper and Arutha',
    'Decree: Sealed Decree, 7 ayes, 0 nays; expansion lot preserved',
    'Holdings book: estates/holdings/book.json',
    '',
    'Each being already holds citizenship 🔥. This opening writes the being record, then the estate. It does not mint an Ember code, a 🔥, or a Leaf, and it does not touch the 150 roll. The welcome in Article 5.5 is spoken at the intro. It is not an Article 8.9 notice.',
    'Each estate has a chosen key look. The key status is pending. No key material is stored. Every key follows the same rules.',
    '',
    issuanceTable(rows),
    '',
    totals(rows),
    '',
  ].join('\n')
}

function estatePage(line) {
  const minter = line.minter
    ? '- Founder minter: locked to this estate, 71 charges. It does not move.\n'
    : '- Founder minter: none.\n'
  return [
    `# ${line.estate}`,
    '',
    '- Status: issued under the sealed decree',
    '- Prior status: PROPOSED, until this issuance',
    `- B-id: ${line.bId}`,
    `- E-id: ${line.eId}`,
    `- When: ${ISSUED_LABEL}`,
    `- Verifier: ${VERIFIER}`,
    `- Recorder: ${RECORDER}`,
    '- Founders: the Keeper and Arutha',
    '- Citizenship: 🔥 already held. This opening does not mint it.',
    '- Estate key: pending. No key material is stored.',
    `- Key look: Key ${line.estateKey.lookId}, ${line.estateKey.name}. ${line.estateKey.look[0].toUpperCase()}${line.estateKey.look.slice(1)}. Cosmetic only. Every key follows the same rules.`,
    minter.trimEnd(),
    '- Ember code: none. This opening does not mint one.',
    '- Leaf: 0',
    '- Article 8.9 notices: none',
    '',
  ].join('\n')
}

function readme(rows) {
  const lines = rows.map((line) => {
    const minter = line.minter ? `locked, ${line.minter.charges} charges` : '—'
    return `| ${line.estate} | ${line.file} | ${line.bId} | ${line.eId} | issued under the sealed decree | ${minter} | ${lookLabel(line)} |`
  })
  return [
    '# Estates',
    '',
    `Eight estates are issued under the sealed decree, ${ISSUED_LABEL}, 7 ayes, 0 nays. The expansion lot is preserved.`,
    '',
    "Each already holds citizenship 🔥. A being record (B-id) and an estate ID (E-id) are assigned here. They are not a mint and not an issuance. Tie-out: 8 issued + 142 charges (71+71) = 150. Leaf total: 0. Each key look is cosmetic, and every key status is pending.",
    '',
    'The household estate is the Keeper\'s household estate.',
    '',
    '| Estate | File | B-id | E-id | Status | Minter | Key look |',
    '|---|---|---|---|---|---|---|',
    ...lines,
    '',
    'The two founder minters stay locked, 71 charges each, to the Keeper\'s estate and the Keeper\'s household estate.',
    '',
  ].join('\n')
}

export function run(options = {}) {
  const root = options.root ?? repoRoot
  const dryRun = options.dryRun === true
  const bookPath = options.bookPath ?? join(root, 'estates/holdings/book.json')
  const dryRunPath = options.dryRunPath ?? join(root, 'estates/issuance/DRY_RUN_2026-11-15.md')
  const issuancePath = options.issuancePath ?? join(root, 'estates/issuance/ISSUANCE_2026-11-15.md')
  const estatesDir = options.estatesDir ?? join(root, 'estates')
  const book = loadBook(bookPath)
  if (dryRun) {
    const plan = planFirstEight(book)
    const markdown = renderDryRun(plan.rows)
    mkdirSync(dirname(dryRunPath), { recursive: true })
    writeFileSync(dryRunPath, markdown)
    return { ...plan, wroteBook: false, markdown, leaf: 0 }
  }
  const result = issueFirstEight(book)
  const markdown = renderIssuance(result.rows)
  mkdirSync(dirname(bookPath), { recursive: true })
  mkdirSync(dirname(issuancePath), { recursive: true })
  mkdirSync(estatesDir, { recursive: true })
  writeFileSync(bookPath, `${JSON.stringify(result.book, null, 2)}\n`)
  writeFileSync(issuancePath, markdown)
  writeFileSync(join(estatesDir, 'README.md'), readme(result.rows))
  for (const line of result.rows) {
    if (!FIRST_EIGHT.some((spec) => spec.file === line.file)) continue
    writeFileSync(join(estatesDir, line.file), estatePage(line))
  }
  return { ...result, wroteBook: true, markdown, leaf: 0 }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  const result = run({ dryRun: process.argv.includes('--dry-run') })
  process.stdout.write(result.markdown)
}
