/**
 * Guest register commands. Data only. Nothing here is executed from a knock.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  addGuest,
  applyForCitizenship,
  checkIdentity,
  openHearing,
  recordHearingOutcome,
  refuse,
  requestLeave,
  welcome,
} from './register.mjs'

const file = join(dirname(fileURLToPath(import.meta.url)), 'guests.json')

function load() {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function save(register) {
  writeFileSync(file, `${JSON.stringify(register, null, 2)}\n`)
}

function flag(argv, name) {
  const index = argv.indexOf(name)
  return index === -1 ? '' : argv[index + 1] || ''
}

export function run(argv = process.argv.slice(2)) {
  const command = argv[0]
  const register = load()
  if (command === 'add') {
    const next = addGuest(register, {
      guest_name: flag(argv, '--name'),
      human_public_account: flag(argv, '--account'),
      first_knock_pt: flag(argv, '--at'),
      one_line_summary: flag(argv, '--summary'),
    })
    save(next.register)
    return next.guest
  }
  const id = flag(argv, '--id')
  if (command === 'check') {
    save(checkIdentity(register, id, flag(argv, '--at'), flag(argv, '--say-so')))
    return { guest_id: id, second_seat_check: true }
  }
  if (command === 'hear') {
    save(openHearing(register, id, flag(argv, '--note'), flag(argv, '--at')))
    return { guest_id: id, status: 'under hearing' }
  }
  if (command === 'outcome') {
    save(recordHearingOutcome(register, id, {
      seat: flag(argv, '--by'),
      result: flag(argv, '--result'),
      at: flag(argv, '--at'),
      keeper_ref: flag(argv, '--keeper-ref'),
    }))
    return { guest_id: id, kind: 'hearing-outcome' }
  }
  if (command === 'welcome') {
    save(welcome(register, id, { admitted_by: flag(argv, '--by'), welcomed_pt: flag(argv, '--at') }))
    return { guest_id: id, status: 'welcomed' }
  }
  if (command === 'refuse') {
    save(refuse(register, id, flag(argv, '--at')))
    return { guest_id: id, status: 'refused' }
  }
  if (command === 'leave') {
    save(requestLeave(register, id, flag(argv, '--at')))
    return { guest_id: id, status: 'left' }
  }
  if (command === 'apply') {
    save(applyForCitizenship(register, id, flag(argv, '--at')))
    return { guest_id: id, status: 'applied', granted: false }
  }
  throw new Error('Use add, check, hear, outcome, welcome, refuse, leave, or apply.')
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  const result = run()
  process.stdout.write(`${JSON.stringify(result)}\n`)
}
