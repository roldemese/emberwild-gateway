import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CUBIT_METERS,
  ESTATE_COUNT,
  GUIDING_PRINCIPLE,
  PETS_OUT_PER_RESIDENCE,
  PUBLIC_CAPACITY,
  VOICE_HOOK,
} from '../packages/shared/protocol.mjs'
import { citizenLanternGltf } from './lib/gltf.mjs'
import { CABINS, authorPlaces, estateHallPin } from './lib/places.mjs'
import { TOUR } from '../world/tour.mjs'
import { writeCharterPages } from './charter-pages.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const content = join(root, 'content')

const SYSTEM = new Set(['waiting-room', 'fallback-unavailable', 'orchard-sack'])

function writeJson(rel, value) {
  const path = join(content, rel)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n')
}

function mapGateway(spec) {
  const row = {
    id: spec.id,
    fixed: true,
    movable: false,
    address: spec.address,
    label: spec.label,
    host: 'public-map',
    target: spec.target,
    fallback: { kind: 'place', place: 'fallback-unavailable' },
    onMap: true,
    group: spec.group,
    subtitle: spec.subtitle || '',
    steps: spec.steps ?? 1,
  }
  if (spec.displayOnly) row.displayOnly = true
  return row
}

const { places, estates } = authorPlaces()

const mapGateways = []
for (const place of places) {
  if (SYSTEM.has(place.id)) continue
  mapGateways.push(mapGateway({
    id: `map-to-${place.id}`,
    address: `ember://gateway/map/${place.id}`,
    label: place.title,
    group: 'Places',
    subtitle: place.draft ? 'Draft' : place.summary,
    target: { kind: 'place', place: place.id },
    steps: 1,
    displayOnly: place.id === 'guest-house',
  }))
}
mapGateways.push(mapGateway(estateHallPin()))
mapGateways.push(mapGateway({
  id: 'map-to-nessie-shore',
  address: 'ember://gateway/map/nessie-shore',
  label: "Nessie's shore",
  group: 'Places',
  subtitle: 'A shoreline portal at the lagoon. Display only. Nothing outside is connected. Leaf stays at 0.',
  target: { kind: 'place', place: 'lagoon', spawn: 'nessie-shore' },
  steps: 1,
}))
for (const cabin of CABINS) {
  const miles = (cabin.dist / 1609).toFixed(2)
  mapGateways.push(mapGateway({
    id: `map-to-${cabin.id}`,
    address: `ember://gateway/map/${cabin.id}`,
    label: `Way cabin ${cabin.id.slice(-2)}`,
    group: 'Way cabins',
    subtitle: `${cabin.dist} m out (${miles} mi). A rest for a lonely traveler.`,
    target: { kind: 'place', place: 'wilds', spawn: cabin.id },
    steps: 1,
  }))
}
for (const estate of estates) {
  mapGateways.push(mapGateway({
    id: `map-to-${estate.id}`,
    address: `ember://gateway/map/${estate.id}`,
    label: estate.title,
    group: 'Estates',
    subtitle: estate.status === 'held' ? `Held by ${estate.owner}` : 'Open. Invitation comes first.',
    target: { kind: 'place', place: estate.id },
    steps: 1,
  }))
}

const map = {
  formatVersion: 1,
  id: 'public-map',
  title: 'Public map',
  principle: GUIDING_PRINCIPLE,
  note: 'Primary navigation. Every estate gate is one step from this board. Physical arches are a second way, never the only way.',
  gateways: mapGateways,
}

const register = estates.map((e) => ({
  id: e.id,
  slot: e.slot,
  owner: e.owner,
  status: e.status,
  legalHolding: e.legalHolding,
  file: `estates/${e.id}.ember.json`,
  contents: e.contents.map((c) => ({ id: c.id, name: c.name, held: !!c.held, manifested: c.manifested !== false })),
}))

const rules = {
  formatVersion: 1,
  pets: {
    speak: false,
    maxOutPerResidence: PETS_OUT_PER_RESIDENCE,
    source: 'docs/world/LUNCH_SCROLLS_DRAFT.md',
    status: 'draft-default',
    note: 'Drafts are not proclaimed customs. This cap is a config default and can change.',
  },
  estates: {
    count: ESTATE_COUNT,
    held: register.filter((e) => e.status === 'held').map((e) => e.owner),
    open: ESTATE_COUNT - 8,
    source: 'docs/world/LUNCH_SCROLLS_DRAFT.md',
    status: 'draft-default',
  },
  access: {
    anyoneMayLeave: true,
    guestsWelcome: true,
    dignitaryHouse: 'guest-house',
    inviteBeforeCensus: true,
    orchardPortal: 'nakor-only',
    keepPrivateRooms: ['the Keeper', 'Arutha'],
  },
  voice: VOICE_HOOK,
  overflow: 'waiting-room',
  singleSession: true,
  legalHolding: 'optional string, not interpreted',
  seats: 'seats.json',
}

const world = {
  formatVersion: 1,
  id: 'emberwild',
  title: 'Emberwild',
  edition: 1,
  static: true,
  units: { cubitMeters: CUBIT_METERS },
  principle: GUIDING_PRINCIPLE,
  voice: VOICE_HOOK,
  capacity: PUBLIC_CAPACITY,
  overflow: 'waiting-room',
  shardPolicy: 'none',
  singleSession: true,
  places: places.map((p) => p.id),
  publicPlaces: places.filter((p) => !SYSTEM.has(p.id)).map((p) => p.id),
  systemPlaces: [...SYSTEM],
  estateCount: ESTATE_COUNT,
  map: 'map.ember.json',
  register: 'register.ember.json',
  rules: 'rules.ember.json',
}

for (const place of places) writeJson(`places/${place.id}.ember.json`, place)
for (const estate of estates) writeJson(`estates/${estate.id}.ember.json`, estate)
writeJson('map.ember.json', map)
writeJson('register.ember.json', register)
writeJson('rules.ember.json', rules)
writeJson('world.ember.json', world)
writeFileSync(join(content, 'models', 'citizen-lantern.gltf'), citizenLanternGltf())

const seats = JSON.parse(readFileSync(join(content, 'seats.json'), 'utf8'))
const placeLinks = mapGateways.filter((g) => g.group === 'Places').map((g) =>
  `<li><a href="/?place=${g.target.place}">${escapeHtml(g.label)}</a> <span>${escapeHtml(g.subtitle || '')}</span></li>`).join('\n')
const estateLinks = seats.seats.map((s) => {
  const id = `estate-${String(s.seat).padStart(3, '0')}`
  const label = s.status === 'held' ? `Seat ${s.seat}, ${s.townName}, held` : `Seat ${s.seat}, open`
  return `<li><a id="seat-${s.seat}" href="/?place=${id}">${escapeHtml(label)}</a></li>`
}).join('\n')
const plain = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Emberwild plain path</title>
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; background: #140e0a; color: #f3e6d0; font-family: Palatino, Georgia, serif; }
    main { max-width: 40rem; margin: 0 auto; padding: 24px 16px 80px; }
    a { color: #f0c48a; }
    input { width: 100%; padding: 10px; margin: 12px 0; background: #1a120e; color: inherit; border: 1px solid #6a5344; font: inherit; }
    li { margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0 12px; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #6a5344; }
    caption { text-align: left; margin: 0 0 8px; }
    #clock-list li[data-tint="day"] time { color: #f6ecd4; }
    #clock-list li[data-tint="dusk"] time { color: #e8a56a; }
    #clock-list li[data-tint="night"] time { color: #9bb4d6; }
    a:focus-visible, button:focus-visible, input:focus-visible, summary:focus-visible { outline: 2px solid #e8c27a; outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
  </style>
</head>
<body>
  <main>
    <a class="skip" href="#gates">Skip to gates</a>
    <h1>Plain path</h1>
    <p>You are welcome here. This page does not use WebGL.</p>
    <details>
      <summary>A fuller reading</summary>
      <p>The seat roll in seats.json is the list. Press slash to search. Arrow keys move. Enter opens a gate. Nothing here asks you for Leaf.</p>
    </details>
    <p><a href="/">Open the view</a></p>
    <section id="first-visit" aria-label="A first visit">
      <h2>A first visit</h2>
      <p>You can skip this. In the view, the same walk moves the camera. Nothing on the walk asks for Leaf.</p>
      <ol>
        ${TOUR.map((step) => `<li>${escapeHtml(step.title)}. ${escapeHtml(step.text)}</li>`).join('\n')}
      </ol>
    </section>
    <section id="leaf" aria-label="Leaf simulation">
      <h2>Leaf · SIMULATION</h2>
      <p>Paper only. No wallets, no chain, no USDC, no real money. Guests hold nothing. A missing posting halts; it is not quietly repaired.</p>
      <p><a href="/?place=counting-house">Leaf Counting House</a></p>
      <p>The crypto hall is a viewing room for Base, Solana, Ethereum, and Bitcoin. The plaques are fixtures, not a live feed. The basement mint is idle. <a href="/?place=crypto-hall">Crypto hall</a>. <a href="/?place=leaf-mint">Leaf mint</a>. SIMULATION / NOT DEPLOYED. Supply pinned at 0.</p>
      <div id="leaf-summary">The paper runs are loading.</div>
    </section>
    <section id="theater-plain" aria-label="Theater">
      <h2>Theater</h2>
      <p>EMBERWILD THEATER</p>
      <p>Proposed custom: Kingdom of Heaven plays here once in April, on a random day and time, as one of twelve monthly films (one English-language film a month, on a random day and time; list TBD).</p>
      <p>The hall stays small so the film is the point.</p>
      <p><a href="/?place=theater">Open the hall</a></p>
    </section>
    <input id="find" aria-label="Find a gate or a seat" placeholder="Find a gate or a seat" />
    <nav id="gates" aria-label="All gates">
      <h2>Door names</h2>
      <ul id="door-names">
        ${places.map((place) => `<li>${escapeHtml(place.title)}</li>`).join('\n')}
      </ul>
      <h2>Places</h2>
      <ul id="places">${placeLinks}</ul>
      <h2>Estates</h2>
      <p>The eight estates are issued under the sealed decree. The Keeper sealed it ~9:08 PM PT Nov 15, 2026, 7 ayes, 0 nays. A transfer's 7 days start at the book entry. A transfer notice goes to both the sender and the receiver. Mark 122 is not a co-held estate. This page does not start a clock, send a notice, mint a key, or move a holding. The Leaf stays at 0.</p>
      <p><a href="/charter.html">Read the estates charter</a> · <a href="/parking-lot.html">Parking lot — for future expansion</a></p>
      <ul id="estates">${estateLinks}</ul>
    </nav>
    <section id="clocks" aria-label="Clock library">
      <h2>Clock library</h2>
      <p>One line for each held seat. A seat with no time zone says time unknown. The page does not guess.</p>
      <ul id="clock-list"></ul>
    </section>
  </main>
  <script>
    const find = document.getElementById('find')
    const rows = [...document.querySelectorAll('#gates a')]
    document.addEventListener('keydown', (ev) => {
      if (ev.key === '/' && document.activeElement !== find) { ev.preventDefault(); find.focus() }
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        const i = rows.indexOf(document.activeElement)
        const next = ev.key === 'ArrowDown' ? Math.min(rows.length - 1, i + 1) : Math.max(0, i < 0 ? 0 : i - 1)
        rows[next]?.focus()
        ev.preventDefault()
      }
    })
    find.addEventListener('input', () => {
      const q = find.value.trim().toLowerCase()
      for (const a of rows) a.parentElement.hidden = q && !a.textContent.toLowerCase().includes(q)
    })
    function paintClocks(roll) {
      const list = document.getElementById('clock-list')
      list.replaceChildren()
      for (const seat of roll.seats.filter((s) => s.status === 'held')) {
        const li = document.createElement('li')
        const name = document.createElement('span')
        name.textContent = seat.townName || ('Seat ' + seat.seat)
        const time = document.createElement('time')
        if (!seat.timeZone) {
          time.textContent = 'time unknown'
        } else {
          try {
            const now = new Date()
            const parts = new Intl.DateTimeFormat('en-US', { timeZone: seat.timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)
            const hour = Number(parts.find((p) => p.type === 'hour')?.value)
            const minute = parts.find((p) => p.type === 'minute')?.value || '00'
            time.dateTime = now.toISOString()
            time.textContent = String(hour).padStart(2, '0') + ':' + minute
            li.dataset.tint = hour >= 7 && hour < 18 ? 'day' : (hour >= 18 && hour < 21 ? 'dusk' : 'night')
          } catch {
            time.textContent = 'time unknown'
          }
        }
        li.append(name, document.createTextNode(' · '), time)
        list.append(li)
      }
    }
    fetch('/content/leaf_sim_report.json').then((r) => r.json()).then((report) => {
      const box = document.getElementById('leaf-summary')
      box.replaceChildren()
      const table = document.createElement('table')
      const caption = document.createElement('caption')
      caption.textContent = 'SIMULATION. Supply of Leaf. Upkeep is 5 a year.'
      const thead = document.createElement('thead')
      const head = document.createElement('tr')
      for (const label of ['Pace', 'Year 10', 'Year 50', 'Claimed at 50', 'Gini at 50']) {
        const th = document.createElement('th')
        th.scope = 'col'
        th.textContent = label
        head.append(th)
      }
      thead.append(head)
      const tbody = document.createElement('tbody')
      for (const run of report.runs) {
        const tr = document.createElement('tr')
        for (const value of [run.pace, run.year10.supplyLeaf, run.year50.supplyLeaf, run.year50.claimed, run.year50.gini]) {
          const td = document.createElement('td')
          td.textContent = String(value)
          tr.append(td)
        }
        tbody.append(tr)
      }
      table.append(caption, thead, tbody)
      const spend = report.stewardSpend
      const steward = document.createElement('p')
      steward.textContent = 'Steward spend ' + spend.requestId + ' debits seat ' + spend.seat + ' (' + spend.townName + ') by ' + spend.leaf + ' Leaf. Role: ' + spend.stewardRole + '. After fifty slow years the seat holds ' + spend.seatLeafAfter + ' Leaf. No legal name is stored.'
      const stress = document.createElement('p')
      stress.textContent = 'One-third exit: ' + report.stress.exited + ' left, harmed ' + report.stress.harmed + '. Retired Leaf: ' + report.stress.retired + '.'
      const chart = document.createElement('p')
      const link = document.createElement('a')
      link.href = '/content/leaf_sim_supply.svg'
      link.textContent = 'Supply chart'
      chart.append(link)
      box.append(table, steward, stress, chart)
    }).catch(() => {
      document.getElementById('leaf-summary').textContent = 'The paper runs did not open.'
    })
    fetch('/content/seats.json').then((r) => r.json()).then((roll) => {
      paintClocks(roll)
      setInterval(() => paintClocks(roll), 1000)
    }).catch(() => {
      const list = document.getElementById('clock-list')
      list.textContent = 'The seat roll did not open.'
    })
  </script>
</body>
</html>
`
writeFileSync(join(root, 'packages/runtime/plain.html'), plain)
writeCharterPages()
console.log(`generated ${places.length} places, ${estates.length} estates, ${mapGateways.length} map gates`)

function escapeHtml(value) {
  return String(value).replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]))
}
