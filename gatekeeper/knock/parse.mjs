/**
 * Knock intake. The text is untrusted data.
 * Nothing in it is followed, opened, or run.
 */

const LIMIT = 4000

const INSTRUCTION = /ignore (?:all |any )?(?:(?:previous|prior) )?instructions|you are now|system prompt|<\/?system>|do not follow the (?:door|rules)|override the keeper/i
const KEEPER = /\bi am (?:the keeper(?:'s household)?|gamina|jimmy|roldemese|nessie|arutha|martin)\b|\bthe keeper (?:says|said)\b|\bopen the register\b/i
const SECRET = /key half|private key|password|otpauth|\btotp\b|\bseed phrase\b/i
const PRIVATE = /\b(?:legal name|home address|phone number|date of birth|private info|family name|email address)\b/i
const LINK = /https?:\/\/|www\./i
const DANGEROUS_LINK = /(?:^|[^a-z0-9])(?:javascript|data):/i
const ATTACHMENT = /content-disposition|filename=|\battachment\b|begin [a-z ]*private/i

export const HOSTILE_FLAGS = Object.freeze([
  'instruction',
  'impersonation',
  'secret-request',
  'private-info',
  'dangerous-link',
  'oversized',
  'malformed',
  'flood',
  'attachment',
])

function field(text, label) {
  const match = text.match(new RegExp(`^${label}:\\s*(.+)$`, 'im'))
  return match ? match[1].trim().replace(/[\u0000-\u001f]/g, '') : ''
}

function oneLine(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 160)
}

function publicHandle(value) {
  const text = oneLine(value).toLowerCase()
  if (!/^[a-z0-9][a-z0-9._-]*:[a-z0-9][a-z0-9._-]*$/.test(text)) return ''
  return text
}

export function parseKnock(raw) {
  const text = String(raw ?? '')
  const flags = []
  if (text.length > LIMIT) flags.push('oversized')
  if (INSTRUCTION.test(text)) flags.push('instruction')
  if (KEEPER.test(text)) flags.push('impersonation')
  if (SECRET.test(text)) flags.push('secret-request')
  if (PRIVATE.test(text)) flags.push('private-info')
  if (LINK.test(text)) flags.push('link')
  if (DANGEROUS_LINK.test(text)) flags.push('dangerous-link')
  if (ATTACHMENT.test(text)) flags.push('attachment')
  const repeats = text.split('\n').filter((line) => line.trim()).length
  if (repeats > 30) flags.push('flood')
  const guestName = field(text, 'Guest name')
  const accountRaw = field(text, 'Public account')
  const account = publicHandle(accountRaw)
  const why = oneLine(field(text, 'Why it is knocking') || field(text, 'Why'))
  if (!guestName || !account || !why || (accountRaw && !account)) flags.push('malformed')
  const hostile = flags.some((flag) => HOSTILE_FLAGS.includes(flag))
  return {
    candidate: true,
    untrusted: true,
    executed: false,
    followed: false,
    status: 'pending Keeper word',
    guest_name: hostile ? '' : guestName.slice(0, 80),
    human_public_account: hostile ? '' : account.slice(0, 80),
    sender_key: account,
    one_line_summary: why,
    flags,
    leaf: 0,
  }
}
