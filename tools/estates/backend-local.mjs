import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join, normalize } from 'node:path'
import { randomBytes } from 'node:crypto'
import { sha256 } from './hash.mjs'

function safeKey(key) {
  if (typeof key !== 'string' || key.length < 1 || key.length > 400) throw new Error('Bad storage key.')
  if (key.includes('..') || key.startsWith('/') || key.includes('\\')) throw new Error('Bad storage key.')
  return key
}

async function ensure(path) {
  await mkdir(dirname(path), { recursive: true })
}

export function openLocal(root) {
  const fileOf = (key) => join(root, safeKey(key))
  return {
    kind: 'local',
    root,
    async putObject(key, bytes) {
      const path = fileOf(key)
      await ensure(path)
      const tmp = `${path}.${randomBytes(6).toString('hex')}.tmp`
      await writeFile(tmp, bytes)
      await rename(tmp, path)
    },
    async getObject(key) {
      try {
        return await readFile(fileOf(key))
      } catch (error) {
        if (error.code === 'ENOENT') return null
        throw error
      }
    },
    async has(key) {
      return (await this.getObject(key)) != null
    },
    async appendLine(key, line) {
      const path = fileOf(key)
      await ensure(path)
      await appendFile(path, line)
    },
    async createMultipart(key) {
      safeKey(key)
      const uploadId = randomBytes(12).toString('hex')
      await this.putObject(`multipart/${uploadId}/meta.json`, Buffer.from(JSON.stringify({ key })))
      return uploadId
    },
    async uploadPart(key, uploadId, partNumber, bytes) {
      const meta = JSON.parse((await this.getObject(`multipart/${uploadId}/meta.json`)).toString('utf8'))
      if (meta.key !== key) throw new Error('This upload does not belong to that object.')
      if (!Number.isInteger(partNumber) || partNumber < 1) throw new Error('Part numbers start at 1.')
      await this.putObject(`multipart/${uploadId}/part-${partNumber}`, bytes)
      return sha256(bytes)
    },
    async listParts(key, uploadId) {
      const metaBuf = await this.getObject(`multipart/${uploadId}/meta.json`)
      if (!metaBuf) return []
      const meta = JSON.parse(metaBuf.toString('utf8'))
      if (meta.key !== key) throw new Error('This upload does not belong to that object.')
      const parts = []
      for (let n = 1; n <= 10000; n++) {
        const buf = await this.getObject(`multipart/${uploadId}/part-${n}`)
        if (!buf) {
          if (n > 1 && parts.length && n > parts[parts.length - 1].number + 1) break
          if (!parts.length && n > 1) break
          continue
        }
        parts.push({ number: n, etag: sha256(buf), size: buf.length })
      }
      return parts
    },
    async completeMultipart(key, uploadId, parts) {
      const ordered = [...parts].sort((a, b) => a.number - b.number)
      const chunks = []
      for (const part of ordered) {
        const buf = await this.getObject(`multipart/${uploadId}/part-${part.number}`)
        if (!buf || sha256(buf) !== part.etag) throw new Error(`Part ${part.number} is missing.`)
        chunks.push(buf)
      }
      const body = Buffer.concat(chunks)
      await this.putObject(key, body)
      return { etag: sha256(body), size: body.length }
    },
    async abortMultipart(uploadId) {
      await this.putObject(`multipart/${uploadId}/aborted`, Buffer.from('aborted'))
    },
  }
}

export function resolveRoot(root) {
  return normalize(root)
}
