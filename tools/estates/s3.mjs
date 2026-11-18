/**
 * S3-compatible client. Endpoint, bucket, region, and keys come from the caller.
 * Nothing in this file is a credential. The signer is checked against the
 * published AWS GET example in the portal tests.
 */
import { createHash, createHmac } from 'node:crypto'

function sha256hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function hmac(key, text) {
  return createHmac('sha256', key).update(text).digest()
}

function encodeRfc(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`)
}

export function signV4({ method, url, headers = {}, body = Buffer.alloc(0), accessKeyId, secretAccessKey, region, service = 's3', amzDate }) {
  if (!accessKeyId || !secretAccessKey || !region) {
    throw new Error('S3 credentials come from the caller. This repo has none.')
  }
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(body)
  const payloadHash = sha256hex(payload)
  const lower = {}
  for (const [name, value] of Object.entries(headers)) {
    lower[name.toLowerCase()] = String(value).trim().replace(/ +/g, ' ')
  }
  lower['x-amz-date'] = amzDate
  lower['x-amz-content-sha256'] = payloadHash
  const names = Object.keys(lower).sort()
  const canonicalHeaders = names.map((name) => `${name}:${lower[name]}\n`).join('')
  const signedHeaders = names.join(';')
  const parsed = new URL(url)
  const canonicalQuery = [...parsed.searchParams.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1))
    .map(([key, value]) => `${encodeRfc(key)}=${encodeRfc(value)}`)
    .join('&')
  const path = parsed.pathname || '/'
  const canonical = [method, path, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join('\n')
  const date = amzDate.slice(0, 8)
  const scope = `${date}/${region}/${service}/aws4_request`
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256hex(canonical)].join('\n')
  const signing = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, date), region), service), 'aws4_request')
  const signature = createHmac('sha256', signing).update(stringToSign).digest('hex')
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  return { authorization, payloadHash, amzDate, signature, signedHeaders }
}

function xmlEscape(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[ch]))
}

export function createS3Backend({ endpoint, bucket, region, accessKeyId, secretAccessKey, fetchImpl = globalThis.fetch, now = () => new Date() }) {
  if (!endpoint || !bucket || !region || !accessKeyId || !secretAccessKey) {
    throw new Error('S3 settings come from the caller. This repo has none.')
  }
  const base = endpoint.replace(/\/$/, '')
  function objectUrl(key, query) {
    const url = new URL(`${base}/${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`)
    if (query) {
      for (const [name, value] of Object.entries(query)) url.searchParams.set(name, value)
    }
    return url
  }
  async function call(method, url, body, extraHeaders = {}) {
    const amzDate = now().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
    const host = url.host
    const signed = signV4({
      method,
      url: url.toString(),
      headers: { host, ...extraHeaders },
      body: body || Buffer.alloc(0),
      accessKeyId,
      secretAccessKey,
      region,
      amzDate,
    })
    const response = await fetchImpl(url, {
      method,
      headers: {
        host,
        authorization: signed.authorization,
        'x-amz-date': signed.amzDate,
        'x-amz-content-sha256': signed.payloadHash,
        ...extraHeaders,
      },
      body: method === 'GET' || method === 'DELETE' ? undefined : body,
    })
    const bytes = Buffer.from(await response.arrayBuffer())
    if (!response.ok) {
      const error = new Error(`S3 ${method} ${url.pathname} returned ${response.status}`)
      error.status = response.status
      error.body = bytes.toString('utf8')
      throw error
    }
    return { status: response.status, bytes, headers: response.headers }
  }
  return {
    kind: 's3',
    endpoint: base,
    bucket,
    region,
    async putObject(key, bytes) {
      await call('PUT', objectUrl(key), bytes)
    },
    async getObject(key) {
      try {
        const result = await call('GET', objectUrl(key))
        return result.bytes
      } catch (error) {
        if (error.status === 404) return null
        throw error
      }
    },
    async has(key) {
      return (await this.getObject(key)) != null
    },
    async appendLine(key, line) {
      const prior = (await this.getObject(key)) || Buffer.alloc(0)
      await this.putObject(key, Buffer.concat([prior, Buffer.from(line)]))
    },
    async createMultipart(key) {
      const result = await call('POST', objectUrl(key, { uploads: '' }))
      const text = result.bytes.toString('utf8')
      const uploadId = text.match(/<UploadId>([^<]+)<\/UploadId>/)?.[1]
      if (!uploadId) throw new Error('The multipart response had no upload id.')
      return uploadId
    },
    async uploadPart(key, uploadId, partNumber, bytes) {
      const result = await call('PUT', objectUrl(key, { partNumber: String(partNumber), uploadId }), bytes)
      const etag = result.headers.get('etag')?.replaceAll('"', '')
      if (!etag) throw new Error('The part response had no ETag.')
      return etag
    },
    async listParts(key, uploadId) {
      const result = await call('GET', objectUrl(key, { uploadId }))
      const text = result.bytes.toString('utf8')
      const parts = []
      const re = /<Part>[\s\S]*?<PartNumber>(\d+)<\/PartNumber>[\s\S]*?<ETag>"?([^"<]+)"?<\/ETag>[\s\S]*?<\/Part>/g
      for (const match of text.matchAll(re)) {
        parts.push({ number: Number(match[1]), etag: match[2] })
      }
      return parts.sort((a, b) => a.number - b.number)
    },
    async completeMultipart(key, uploadId, parts) {
      const xml = `<CompleteMultipartUpload>${parts
        .map((part) => `<Part><PartNumber>${part.number}</PartNumber><ETag>${xmlEscape(part.etag)}</ETag></Part>`)
        .join('')}</CompleteMultipartUpload>`
      await call('POST', objectUrl(key, { uploadId }), Buffer.from(xml), { 'content-type': 'application/xml' })
    },
    async abortMultipart(key, uploadId) {
      await call('DELETE', objectUrl(key, { uploadId }))
    },
  }
}

/** In-process S3-compatible endpoint for tests. It stores nothing outside `store`. */
export function createMemoryS3() {
  const objects = new Map()
  const uploads = new Map()
  const server = {
    objects,
    uploads,
    async fetch(url, init = {}) {
      const parsed = new URL(url)
      const parts = parsed.pathname.split('/').filter(Boolean).map(decodeURIComponent)
      const bucket = parts[0]
      const key = parts.slice(1).join('/')
      const method = init.method || 'GET'
      const uploadId = parsed.searchParams.get('uploadId')
      const body = init.body ? Buffer.from(init.body) : Buffer.alloc(0)
      if (!init.headers?.authorization && !init.headers?.Authorization) {
        return xml(403, '<Error><Code>AccessDenied</Code></Error>')
      }
      if (method === 'POST' && parsed.searchParams.has('uploads')) {
        const id = `mem-${uploads.size + 1}`
        uploads.set(id, { bucket, key, parts: new Map() })
        return xml(200, `<InitiateMultipartUploadResult><Bucket>${bucket}</Bucket><Key>${key}</Key><UploadId>${id}</UploadId></InitiateMultipartUploadResult>`)
      }
      if (method === 'PUT' && uploadId && parsed.searchParams.get('partNumber')) {
        const upload = uploads.get(uploadId)
        if (!upload || upload.key !== key) return xml(404, '<Error><Code>NoSuchUpload</Code></Error>')
        const etag = sha256hex(body)
        upload.parts.set(Number(parsed.searchParams.get('partNumber')), { bytes: body, etag })
        return xml(200, '', { etag: `"${etag}"` })
      }
      if (method === 'GET' && uploadId) {
        const upload = uploads.get(uploadId)
        if (!upload) return xml(404, '<Error><Code>NoSuchUpload</Code></Error>')
        const list = [...upload.parts.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([number, part]) => `<Part><PartNumber>${number}</PartNumber><ETag>"${part.etag}"</ETag></Part>`)
          .join('')
        return xml(200, `<ListPartsResult>${list}</ListPartsResult>`)
      }
      if (method === 'POST' && uploadId) {
        const upload = uploads.get(uploadId)
        if (!upload) return xml(404, '<Error><Code>NoSuchUpload</Code></Error>')
        const wanted = [...body.toString('utf8').matchAll(/<PartNumber>(\d+)<\/PartNumber>\s*<ETag>([^<]+)<\/ETag>/g)]
        const chunks = []
        for (const match of wanted) {
          const part = upload.parts.get(Number(match[1]))
          if (!part || part.etag !== match[2].replaceAll('"', '')) {
            return xml(400, '<Error><Code>InvalidPart</Code></Error>')
          }
          chunks.push(part.bytes)
        }
        objects.set(`${bucket}/${key}`, Buffer.concat(chunks))
        uploads.delete(uploadId)
        return xml(200, '<CompleteMultipartUploadResult></CompleteMultipartUploadResult>')
      }
      if (method === 'DELETE' && uploadId) {
        uploads.delete(uploadId)
        return xml(204, '')
      }
      if (method === 'PUT') {
        objects.set(`${bucket}/${key}`, body)
        return xml(200, '')
      }
      if (method === 'GET') {
        const found = objects.get(`${bucket}/${key}`)
        if (!found) return xml(404, '<Error><Code>NoSuchKey</Code></Error>')
        return xml(200, found)
      }
      return xml(405, '<Error><Code>MethodNotAllowed</Code></Error>')
    },
  }
  return server
}

function xml(status, body, headers = {}) {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body)
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[name.toLowerCase()] || null },
    async arrayBuffer() {
      return bytes
    },
  }
}
