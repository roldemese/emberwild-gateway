export type Inbound = Record<string, unknown> & { type: string }

export class PresenceClient {
  ws: WebSocket | null = null
  selfId = ''
  onMessage: (msg: Inbound) => void = () => {}
  onQuiet: (quiet: boolean) => void = () => {}
  private url = ''
  private joinBody: Record<string, unknown> | null = null
  private timer = 0

  connect(url: string, joinBody: Record<string, unknown>) {
    this.url = url
    this.joinBody = joinBody
    this.open()
  }

  private open() {
    if (!this.joinBody) return
    let ws: WebSocket
    try {
      ws = new WebSocket(this.url)
    } catch {
      this.schedule()
      return
    }
    this.ws = ws
    ws.addEventListener('open', () => {
      this.onQuiet(false)
      ws.send(JSON.stringify({ type: 'join', ...this.joinBody }))
    })
    ws.addEventListener('message', (ev) => {
      let msg: Inbound
      try { msg = JSON.parse(String(ev.data)) } catch { return }
      if (msg.type === 'welcome' && typeof msg.selfId === 'string') this.selfId = msg.selfId
      this.onMessage(msg)
    })
    ws.addEventListener('close', () => {
      this.ws = null
      this.onQuiet(true)
      this.schedule()
    })
    ws.addEventListener('error', () => {
      this.onQuiet(true)
    })
  }

  private schedule() {
    window.clearTimeout(this.timer)
    this.timer = window.setTimeout(() => this.open(), 4000)
  }

  send(msg: Record<string, unknown>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg))
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN
  }

  close() {
    window.clearTimeout(this.timer)
    this.joinBody = null
    this.ws?.close()
  }
}
