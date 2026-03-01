/**
 * supabase.test.js — Unit tests for Supabase client logic
 * Source: js/supabase-client.js
 *
 * Tests cover:
 * - Base64/dataUrl conversion logic (uploadPostImage)
 * - MIME type extraction
 * - File extension parsing
 * - DB readiness guard patterns
 * - not-connected error responses
 */
import { describe, it, expect } from 'vitest'

// ── Extracted pure logic from js/supabase-client.js ───────────────────────

// From uploadPostImage() and uploadAvatarReferenceImage()
function extractMimeFromDataUrl(dataUrl) {
  const [meta] = dataUrl.split(',')
  const match = meta.match(/:(.*?);/)
  if (!match) throw new Error('Invalid data URL format: MIME not found')
  return match[1]
}

function extractExtension(mime) {
  return mime.split('/')[1]?.split('+')[0] || 'png'
}

// Pure conversion: dataUrl → Uint8Array bytes
// (mirrors the for-loop in uploadPostImage)
function dataUrlToBytes(dataUrl, atobFn = globalThis.atob) {
  const [, b64] = dataUrl.split(',')
  const binary = atobFn(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

// DB readiness logic
function isDbReady(client) { return !!client }

// Guard patterns used in all DB methods
async function guardedGet(client, tableName) {
  if (!client) return { data: [], error: 'not connected' }
  return client.from(tableName).select('*')
}

async function guardedUpsert(client, tableName, row) {
  if (!client) return { error: 'not connected' }
  return client.from(tableName).upsert(row).select().single()
}

async function guardedDelete(client, tableName, id) {
  if (!client) return { error: 'not connected' }
  return client.from(tableName).delete().eq('id', id)
}

// Auth guard patterns
async function guardedSignIn(client, email, password) {
  if (!client) return { error: { message: 'Supabase não configurado' } }
  return client.auth.signInWithPassword({ email, password })
}

async function guardedGetSession(client) {
  if (!client) return null
  const { data } = await client.auth.getSession()
  return data?.session || null
}

// Storage upload path building
function buildUploadPath(filename, ext) {
  return `${filename || Date.now()}.${ext}`
}

// ── TESTS ──────────────────────────────────────────────────────────────────

describe('extractMimeFromDataUrl()', () => {
  it('extracts image/png', () => {
    expect(extractMimeFromDataUrl('data:image/png;base64,abc123')).toBe('image/png')
  })
  it('extracts image/jpeg', () => {
    expect(extractMimeFromDataUrl('data:image/jpeg;base64,abc123')).toBe('image/jpeg')
  })
  it('extracts image/webp', () => {
    expect(extractMimeFromDataUrl('data:image/webp;base64,abc123')).toBe('image/webp')
  })
  it('extracts video/mp4', () => {
    expect(extractMimeFromDataUrl('data:video/mp4;base64,abc123')).toBe('video/mp4')
  })
  it('extracts image/gif', () => {
    expect(extractMimeFromDataUrl('data:image/gif;base64,R0lGO')).toBe('image/gif')
  })
  it('extracts image/svg+xml', () => {
    expect(extractMimeFromDataUrl('data:image/svg+xml;base64,abc')).toBe('image/svg+xml')
  })
  it('throws for missing comma separator (no base64 part)', () => {
    expect(() => extractMimeFromDataUrl('data:image/png')).toThrow('Invalid data URL format')
  })
  it('throws for completely invalid string', () => {
    expect(() => extractMimeFromDataUrl('not-a-data-url')).toThrow('Invalid data URL format')
  })
  it('throws for empty string', () => {
    expect(() => extractMimeFromDataUrl('')).toThrow()
  })
})

describe('extractExtension()', () => {
  it('extracts png from image/png', () => {
    expect(extractExtension('image/png')).toBe('png')
  })
  it('extracts jpeg from image/jpeg', () => {
    expect(extractExtension('image/jpeg')).toBe('jpeg')
  })
  it('extracts mp4 from video/mp4', () => {
    expect(extractExtension('video/mp4')).toBe('mp4')
  })
  it('extracts gif from image/gif', () => {
    expect(extractExtension('image/gif')).toBe('gif')
  })
  it('extracts webp from image/webp', () => {
    expect(extractExtension('image/webp')).toBe('webp')
  })
  it('strips +xml suffix: image/svg+xml → svg', () => {
    expect(extractExtension('image/svg+xml')).toBe('svg')
  })
  it('falls back to "png" for MIME without slash', () => {
    expect(extractExtension('invalid')).toBe('png')
  })
  it('falls back to "png" for empty string', () => {
    expect(extractExtension('')).toBe('png')
  })
  it('handles video/quicktime', () => {
    expect(extractExtension('video/quicktime')).toBe('quicktime')
  })
})

describe('dataUrlToBytes()', () => {
  // 'hello' in base64 is 'aGVsbG8='
  const helloDataUrl = 'data:text/plain;base64,aGVsbG8='
  // 'ABC' in base64 is 'QUJD'
  const abcDataUrl = 'data:text/plain;base64,QUJD'

  it('returns a Uint8Array', () => {
    expect(dataUrlToBytes(helloDataUrl)).toBeInstanceOf(Uint8Array)
  })
  it('correct length for "hello" (5 bytes)', () => {
    expect(dataUrlToBytes(helloDataUrl).length).toBe(5)
  })
  it('correct byte values for "hello"', () => {
    const bytes = dataUrlToBytes(helloDataUrl)
    expect(bytes[0]).toBe(104) // 'h'
    expect(bytes[1]).toBe(101) // 'e'
    expect(bytes[2]).toBe(108) // 'l'
    expect(bytes[3]).toBe(108) // 'l'
    expect(bytes[4]).toBe(111) // 'o'
  })
  it('correct byte values for "ABC"', () => {
    const bytes = dataUrlToBytes(abcDataUrl)
    expect(bytes[0]).toBe(65)  // 'A'
    expect(bytes[1]).toBe(66)  // 'B'
    expect(bytes[2]).toBe(67)  // 'C'
  })
  it('handles image/png data URL structure (parses correctly)', () => {
    // 1x1 transparent PNG in base64
    const pngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    const bytes = dataUrlToBytes(pngDataUrl)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(0)
    // PNG magic bytes: 0x89 0x50 0x4E 0x47
    expect(bytes[0]).toBe(0x89)
    expect(bytes[1]).toBe(0x50) // 'P'
    expect(bytes[2]).toBe(0x4E) // 'N'
    expect(bytes[3]).toBe(0x47) // 'G'
  })
})

describe('buildUploadPath()', () => {
  it('builds path with filename and extension', () => {
    expect(buildUploadPath('my-image', 'png')).toBe('my-image.png')
  })
  it('uses Date.now() when filename is falsy', () => {
    const path = buildUploadPath(null, 'jpeg')
    expect(path).toMatch(/^\d+\.jpeg$/)
  })
  it('handles webp extension', () => {
    expect(buildUploadPath('avatar-ref', 'webp')).toBe('avatar-ref.webp')
  })
  it('handles mp4 extension', () => {
    expect(buildUploadPath('video-post', 'mp4')).toBe('video-post.mp4')
  })
})

describe('isDbReady() — DB readiness check', () => {
  it('returns false for null client', () => expect(isDbReady(null)).toBe(false))
  it('returns false for undefined client', () => expect(isDbReady(undefined)).toBe(false))
  it('returns false for 0 (falsy)', () => expect(isDbReady(0)).toBe(false))
  it('returns true for object (mock client)', () => expect(isDbReady({})).toBe(true))
  it('returns true for non-null values', () => expect(isDbReady('connected')).toBe(true))
})

describe('guardedGet() — not-connected guard', () => {
  it('returns { data: [], error: "not connected" } when client is null', async () => {
    const result = await guardedGet(null, 'avatares')
    expect(result.data).toEqual([])
    expect(result.error).toBe('not connected')
  })
  it('returns { data: [], error: "not connected" } when client is undefined', async () => {
    const result = await guardedGet(undefined, 'posts')
    expect(result.error).toBe('not connected')
  })
})

describe('guardedUpsert() — not-connected guard', () => {
  it('returns { error: "not connected" } when client is null', async () => {
    const result = await guardedUpsert(null, 'avatares', { nome: 'test' })
    expect(result.error).toBe('not connected')
  })
})

describe('guardedDelete() — not-connected guard', () => {
  it('returns { error: "not connected" } when client is null', async () => {
    const result = await guardedDelete(null, 'posts', 'post-id-1')
    expect(result.error).toBe('not connected')
  })
})

describe('guardedSignIn() — auth guard', () => {
  it('returns error object when client is null', async () => {
    const result = await guardedSignIn(null, 'test@example.com', 'pass')
    expect(result.error).toBeDefined()
    expect(result.error.message).toContain('Supabase não configurado')
  })
})

describe('guardedGetSession() — session guard', () => {
  it('returns null when client is null', async () => {
    const result = await guardedGetSession(null)
    expect(result).toBeNull()
  })

  it('returns null when client is undefined', async () => {
    const result = await guardedGetSession(undefined)
    expect(result).toBeNull()
  })

  it('returns session when client is valid', async () => {
    const mockClient = {
      auth: {
        getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }),
      },
    }
    const result = await guardedGetSession(mockClient)
    expect(result).toEqual({ user: { id: 'u1' } })
  })

  it('returns null when session data is null', async () => {
    const mockClient = {
      auth: {
        getSession: async () => ({ data: { session: null } }),
      },
    }
    const result = await guardedGetSession(mockClient)
    expect(result).toBeNull()
  })
})
