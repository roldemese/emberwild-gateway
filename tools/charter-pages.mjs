/**
 * Readable pages for the estates charter. Display only.
 * Nothing here enforces, mints, sends a notice, or moves a holding.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inline(text) {
  let html = escapeHtml(text)
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
    html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, href) => {
    const safe = href
      .replace('EXPANSION_LOT.md', '/parking-lot.html')
      .replace('CHARTER_v8.md', '/charter.html')
      .replace('CHARTER_v7.md', '/charter-v7.html')
    if (!safe.startsWith('/') && !safe.startsWith('#')) return label
    return `<a href="${safe}">${label}</a>`
  })
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
  return html
}

function isTableLine(line) {
  return /^\s*\|/.test(line)
}

function splitRow(line) {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split('|').map((cell) => cell.trim())
}

function isSeparator(line) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line)
}

export function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const out = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.trim() === '') {
      i += 1
      continue
    }
    if (/^---+$/.test(line.trim())) {
      out.push('<hr>')
      i += 1
      continue
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      const level = heading[1].length
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`)
      i += 1
      continue
    }
    if (line.startsWith('>')) {
      const quote = []
      while (i < lines.length && lines[i].startsWith('>')) {
        quote.push(lines[i].replace(/^>\s?/, ''))
        i += 1
      }
      out.push(`<blockquote><p>${inline(quote.join(' '))}</p></blockquote>`)
      continue
    }
    if (isTableLine(line)) {
      const rows = []
      while (i < lines.length && isTableLine(lines[i])) {
        if (!isSeparator(lines[i])) rows.push(splitRow(lines[i]))
        i += 1
      }
      if (rows.length) {
        const head = rows[0]
        const body = rows.slice(1)
        const headHtml = head.map((cell) => `<th>${inline(cell)}</th>`).join('')
        const bodyHtml = body.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')
        out.push(`<table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`)
      }
      continue
    }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line)
      const marker = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/
      const items = []
      while (i < lines.length) {
        while (i < lines.length && lines[i].trim() === '') {
          const peek = lines.slice(i + 1).find((row) => row.trim() !== '')
          if (peek && marker.test(peek)) i += 1
          else break
        }
        if (!(i < lines.length && marker.test(lines[i]))) break
        const text = lines[i].replace(marker, '')
        i += 1
        const nested = []
        while (i < lines.length && /^\s{2,}[-*]\s+/.test(lines[i])) {
          nested.push(lines[i].replace(/^\s*[-*]\s+/, ''))
          i += 1
        }
        const nestedHtml = nested.length
          ? `<ul>${nested.map((item) => `<li>${inline(item)}</li>`).join('')}</ul>`
          : ''
        items.push(`<li>${inline(text)}${nestedHtml}</li>`)
      }
      out.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`)
      continue
    }
    const para = []
    while (
      i < lines.length
      && lines[i].trim() !== ''
      && !lines[i].startsWith('>')
      && !lines[i].startsWith('#')
      && !isTableLine(lines[i])
      && !/^\s*[-*]\s+/.test(lines[i])
      && !/^\s*\d+\.\s+/.test(lines[i])
      && !/^---+$/.test(lines[i].trim())
    ) {
      para.push(lines[i].trim())
      i += 1
    }
    out.push(`<p>${inline(para.join(' '))}</p>`)
  }
  return out.join('\n')
}

function page({ title, banner, back, body }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; background: #140e0a; color: #f3e6d0; font-family: Palatino, Georgia, serif; line-height: 1.45; }
    main { max-width: 46rem; margin: 0 auto; padding: 24px 16px 80px; }
    a { color: #f0c48a; }
    h1, h2, h3 { line-height: 1.25; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0 20px; font-size: 0.95rem; }
    th, td { text-align: left; vertical-align: top; padding: 6px 8px; border-bottom: 1px solid #6a5344; }
    blockquote { margin: 12px 0; padding: 8px 12px; border-left: 3px solid #e8a56a; background: #1c1410; }
    code { font-family: ui-monospace, monospace; font-size: 0.9em; }
    .banner { padding: 12px 14px; background: #2a1c14; border: 1px solid #e8a56a; }
    nav { margin: 12px 0 20px; }
    a:focus-visible { outline: 2px solid #e8c27a; outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    <p class="banner">${banner}</p>
    <nav>${back}</nav>
    <article>
${body}
    </article>
  </main>
</body>
</html>
`
}

export function writeCharterPages() {
  const charter = readFileSync(join(root, 'estates/charter/CHARTER_v8.md'), 'utf8')
  const history = readFileSync(join(root, 'estates/charter/CHARTER_v7.md'), 'utf8')
  const lot = readFileSync(join(root, 'estates/charter/EXPANSION_LOT.md'), 'utf8')
  const dir = join(root, 'packages/runtime')
  mkdirSync(dir, { recursive: true })
  const charterHtml = page({
    title: 'Estates charter v8',
    banner: 'Sealed Decree: sealed by the Keeper ~9:08 PM PT Nov 15, 2026 🍂🔥🕰️, 7 ayes, 0 nays; expansion lot preserved. This page is for reading. It does not enforce a rule, mint a key, send a notice, or move a holding. The Leaf stays at 0.',
    back: '<a href="/plain.html">Plain path</a> · <a href="/parking-lot.html">Parking lot — for future expansion</a> · <a href="/charter-v7.html">Charter v7, kept as history</a>',
    body: renderMarkdown(charter),
  })
  const historyHtml = page({
    title: 'Estates charter v7',
    banner: 'History. Version 7 is kept for the record. It is not the current text. The sealed decree is version 8. This page does not enforce, mint, send, or move anything.',
    back: '<a href="/charter.html">Estates charter v8</a> · <a href="/plain.html">Plain path</a>',
    body: renderMarkdown(history),
  })
  const lotHtml = page({
    title: 'Parking lot — for future expansion',
    banner: 'PARKED. Everything on this page is parked for a later amendment. It is not a rule, not in force, and not a design that runs. Nothing here enforces, mints a key, sends a notice, or moves a holding. The Leaf stays at 0.',
    back: '<a href="/charter.html">Estates charter v8 (sealed decree)</a> · <a href="/plain.html">Plain path</a>',
    body: renderMarkdown(lot),
  })
  writeFileSync(join(dir, 'charter.html'), charterHtml)
  writeFileSync(join(dir, 'charter-v7.html'), historyHtml)
  writeFileSync(join(dir, 'parking-lot.html'), lotHtml)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) writeCharterPages()
