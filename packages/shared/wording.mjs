/**
 * Three layers of words. Plain, a fuller reading, a welcome.
 * Paper only. Leaf stays at 0.
 */
export function wordLayers({ title = '', summary = '', sign = '' } = {}) {
  const body = String(sign || summary || title || 'A place in Emberwild').trim()
  const plain = body.split('\n')[0].slice(0, 90) || 'You are in Emberwild.'
  const reading = [title, body, summary && summary !== body ? summary : '']
    .filter(Boolean)
    .filter((line, i, all) => all.indexOf(line) === i)
    .join('\n\n')
  const welcome = `You are welcome here. ${plain} You may look, you may leave, and nothing on this page asks you for Leaf.`
  return { plain, reading, welcome, leaf: 0 }
}
