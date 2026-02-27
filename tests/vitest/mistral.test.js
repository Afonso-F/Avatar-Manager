/**
 * mistral.test.js — Unit tests for AI module logic
 * Source: js/mistral.js
 *
 * Tests cover:
 * - JSON parsing of AI responses (generateCaptionsPerPlatform)
 * - Aspect ratio → size mappings (Pollinations.ai + fal.ai)
 * - Video URL extraction from fal.ai responses
 * - Polling status machine logic
 * - generateText error handling (with mocked fetch)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Pure logic extracted from js/mistral.js ────────────────────────────────

// From generateCaptionsPerPlatform()
function parseCaptionsResponse(raw) {
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    return JSON.parse(match?.[0] || raw)
  } catch {
    return { instagram: raw, tiktok: raw, youtube: raw, facebook: raw }
  }
}

// From _generateImagePollinations()
const POLLINATIONS_SIZES = {
  '1:1':  { w: 1024, h: 1024 },
  '9:16': { w: 768,  h: 1344 },
  '16:9': { w: 1344, h: 768  },
  '4:3':  { w: 1024, h: 768  },
  '3:4':  { w: 768,  h: 1024 },
}

function getPollinationsSize(aspectRatio) {
  return POLLINATIONS_SIZES[aspectRatio] || { w: 1024, h: 1024 }
}

// From _generateImageFal()
const FAL_SIZE_MAP = {
  '1:1':  'square_hd',
  '9:16': 'portrait_16_9',
  '16:9': 'landscape_16_9',
  '4:3':  'landscape_4_3',
  '3:4':  'portrait_4_3',
}

function getFalSize(aspectRatio) {
  return FAL_SIZE_MAP[aspectRatio] || 'square_hd'
}

// From _generateVideoFal() — video URL extraction
function extractVideoUrl(output) {
  return output?.video?.url
    || output?.videos?.[0]?.url
    || output?.video_url
    || null
}

// Model selection logic from generateText()
function selectModel(hasImages) {
  const TEXT_MODEL   = 'mistral-small-latest'
  const VISION_MODEL = 'pixtral-12b-2409'
  return hasImages ? VISION_MODEL : TEXT_MODEL
}

// Polling state machine (simulation of _generateVideoFal loop body)
async function simulatePollLoop(statusResponses) {
  for (const response of statusResponses) {
    if (!response.ok) continue // mirrors: if (!pollRes.ok) continue

    const status = response.status
    if (status === 'FAILED') throw new Error(response.error || 'fal.ai: geração falhou.')
    if (status === 'COMPLETED') {
      const output = response.output || response
      const videoUrl = extractVideoUrl(output)
      if (!videoUrl) throw new Error('fal.ai: URL de vídeo não encontrada na resposta.')
      return { url: videoUrl, isExternal: true }
    }
    // IN_QUEUE / IN_PROGRESS → continue
  }
  throw new Error('Timeout: fal.ai demorou mais de 10 minutos.')
}

// generateText() core logic (with injectable fetch)
async function generateTextWithFetch(prompt, { key, temperature = 0.8, maxTokens = 1024, images = [] } = {}, fetchFn) {
  if (!key) throw new Error('Mistral API key não configurada.')

  const hasImages = images && images.length > 0
  const model = selectModel(hasImages)
  const content = hasImages
    ? [{ type: 'text', text: prompt }, ...images.slice(0, 3).map(url => ({ type: 'image_url', image_url: { url } }))]
    : prompt

  const res = await fetchFn('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ model, messages: [{ role: 'user', content }], temperature, max_tokens: maxTokens }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || `Erro ${res.status}`)
  }
  const data = await res.json()
  return data?.choices?.[0]?.message?.content || ''
}

// ── TESTS ──────────────────────────────────────────────────────────────────

describe('parseCaptionsResponse()', () => {
  it('parses clean JSON response', () => {
    const raw = '{"instagram":"IG cap","tiktok":"TT cap","youtube":"YT desc","facebook":"FB post"}'
    const result = parseCaptionsResponse(raw)
    expect(result.instagram).toBe('IG cap')
    expect(result.tiktok).toBe('TT cap')
    expect(result.youtube).toBe('YT desc')
    expect(result.facebook).toBe('FB post')
  })

  it('extracts JSON embedded in surrounding text', () => {
    const raw = 'Here is your JSON: {"instagram":"hello","tiktok":"hi","youtube":"hey","facebook":"ho"} Done.'
    const result = parseCaptionsResponse(raw)
    expect(result.instagram).toBe('hello')
  })

  it('falls back to raw string for all platforms on parse failure', () => {
    const raw = 'not valid json at all'
    const result = parseCaptionsResponse(raw)
    expect(result.instagram).toBe('not valid json at all')
    expect(result.tiktok).toBe('not valid json at all')
    expect(result.youtube).toBe('not valid json at all')
    expect(result.facebook).toBe('not valid json at all')
  })

  it('falls back on syntactically invalid JSON', () => {
    const raw = '{invalid: json}'
    const result = parseCaptionsResponse(raw)
    expect(result).toHaveProperty('instagram')
  })

  it('handles multiline JSON (dotAll regex)', () => {
    const raw = '{\n  "instagram": "line1",\n  "tiktok": "line2",\n  "youtube": "line3",\n  "facebook": "line4"\n}'
    const result = parseCaptionsResponse(raw)
    expect(result.instagram).toBe('line1')
  })

  it('handles empty string — falls back to raw', () => {
    const result = parseCaptionsResponse('')
    expect(result).toHaveProperty('instagram')
    expect(result.instagram).toBe('')
  })

  it('handles JSON with special characters in values', () => {
    const raw = '{"instagram":"caf\\u00e9 & more","tiktok":"","youtube":"","facebook":""}'
    const result = parseCaptionsResponse(raw)
    expect(result.instagram).toBe('café & more')
  })

  it('returns object with 4 platform keys on fallback', () => {
    const result = parseCaptionsResponse('garbage')
    expect(Object.keys(result)).toEqual(expect.arrayContaining(['instagram', 'tiktok', 'youtube', 'facebook']))
  })
})

describe('getPollinationsSize()', () => {
  it('1:1 → 1024x1024', () => expect(getPollinationsSize('1:1')).toEqual({ w: 1024, h: 1024 }))
  it('9:16 portrait → 768x1344', () => expect(getPollinationsSize('9:16')).toEqual({ w: 768, h: 1344 }))
  it('16:9 landscape → 1344x768', () => expect(getPollinationsSize('16:9')).toEqual({ w: 1344, h: 768 }))
  it('4:3 → 1024x768', () => expect(getPollinationsSize('4:3')).toEqual({ w: 1024, h: 768 }))
  it('3:4 → 768x1024', () => expect(getPollinationsSize('3:4')).toEqual({ w: 768, h: 1024 }))
  it('unknown ratio → defaults to 1:1 (1024x1024)', () => {
    expect(getPollinationsSize('2:3')).toEqual({ w: 1024, h: 1024 })
  })
  it('empty string → defaults to 1:1', () => {
    expect(getPollinationsSize('')).toEqual({ w: 1024, h: 1024 })
  })
  it('portrait images have height > width', () => {
    const { w, h } = getPollinationsSize('9:16')
    expect(h).toBeGreaterThan(w)
  })
  it('landscape images have width > height', () => {
    const { w, h } = getPollinationsSize('16:9')
    expect(w).toBeGreaterThan(h)
  })
})

describe('getFalSize()', () => {
  it('1:1 → square_hd', () => expect(getFalSize('1:1')).toBe('square_hd'))
  it('9:16 → portrait_16_9', () => expect(getFalSize('9:16')).toBe('portrait_16_9'))
  it('16:9 → landscape_16_9', () => expect(getFalSize('16:9')).toBe('landscape_16_9'))
  it('4:3 → landscape_4_3', () => expect(getFalSize('4:3')).toBe('landscape_4_3'))
  it('3:4 → portrait_4_3', () => expect(getFalSize('3:4')).toBe('portrait_4_3'))
  it('unknown ratio → square_hd', () => expect(getFalSize('unknown')).toBe('square_hd'))
  it('empty string → square_hd', () => expect(getFalSize('')).toBe('square_hd'))
})

describe('extractVideoUrl()', () => {
  it('extracts output.video.url (primary format)', () => {
    expect(extractVideoUrl({ video: { url: 'https://cdn.fal.ai/video.mp4' } }))
      .toBe('https://cdn.fal.ai/video.mp4')
  })
  it('extracts output.videos[0].url (alternate format)', () => {
    expect(extractVideoUrl({ videos: [{ url: 'https://cdn.fal.ai/v2.mp4' }] }))
      .toBe('https://cdn.fal.ai/v2.mp4')
  })
  it('extracts output.video_url (legacy format)', () => {
    expect(extractVideoUrl({ video_url: 'https://cdn.fal.ai/v3.mp4' }))
      .toBe('https://cdn.fal.ai/v3.mp4')
  })
  it('returns null when no URL found', () => {
    expect(extractVideoUrl({})).toBeNull()
  })
  it('returns null for null input', () => {
    expect(extractVideoUrl(null)).toBeNull()
  })
  it('returns null for undefined input', () => {
    expect(extractVideoUrl(undefined)).toBeNull()
  })
  it('prefers video.url over videos[0].url', () => {
    expect(extractVideoUrl({
      video: { url: 'primary' },
      videos: [{ url: 'secondary' }],
      video_url: 'tertiary',
    })).toBe('primary')
  })
  it('falls back to videos[0].url when video.url is missing', () => {
    expect(extractVideoUrl({
      video: {},
      videos: [{ url: 'fallback' }],
    })).toBe('fallback')
  })
  it('returns null when videos array is empty', () => {
    expect(extractVideoUrl({ videos: [] })).toBeNull()
  })
})

describe('selectModel()', () => {
  it('uses text model when no images', () => {
    expect(selectModel(false)).toBe('mistral-small-latest')
  })
  it('uses vision model when images are present', () => {
    expect(selectModel(true)).toBe('pixtral-12b-2409')
  })
  it('uses text model for empty images array', () => {
    const hasImages = [].length > 0
    expect(selectModel(hasImages)).toBe('mistral-small-latest')
  })
  it('uses vision model for non-empty images array', () => {
    const hasImages = ['data:image/png;base64,...'].length > 0
    expect(selectModel(hasImages)).toBe('pixtral-12b-2409')
  })
})

describe('simulatePollLoop() — video polling state machine', () => {
  it('throws on FAILED status', async () => {
    await expect(simulatePollLoop([
      { ok: true, status: 'IN_QUEUE' },
      { ok: true, status: 'IN_PROGRESS' },
      { ok: true, status: 'FAILED', error: 'GPU out of memory' },
    ])).rejects.toThrow('GPU out of memory')
  })

  it('throws with default message when FAILED has no error field', async () => {
    await expect(simulatePollLoop([
      { ok: true, status: 'FAILED' },
    ])).rejects.toThrow('fal.ai: geração falhou.')
  })

  it('returns video URL on COMPLETED status', async () => {
    const result = await simulatePollLoop([
      { ok: true, status: 'IN_QUEUE' },
      { ok: true, status: 'IN_PROGRESS' },
      { ok: true, status: 'COMPLETED', output: { video: { url: 'https://cdn.fal.ai/done.mp4' } } },
    ])
    expect(result.url).toBe('https://cdn.fal.ai/done.mp4')
    expect(result.isExternal).toBe(true)
  })

  it('skips non-ok responses and continues polling', async () => {
    const result = await simulatePollLoop([
      { ok: false },  // network error — skip
      { ok: false },  // another skip
      { ok: true, status: 'COMPLETED', output: { video: { url: 'https://cdn.fal.ai/ok.mp4' } } },
    ])
    expect(result.url).toBe('https://cdn.fal.ai/ok.mp4')
  })

  it('throws timeout when all responses are IN_PROGRESS', async () => {
    const inProgress = Array.from({ length: 5 }, () => ({ ok: true, status: 'IN_PROGRESS' }))
    await expect(simulatePollLoop(inProgress)).rejects.toThrow('Timeout')
  })

  it('throws when COMPLETED but output has no video URL', async () => {
    await expect(simulatePollLoop([
      { ok: true, status: 'COMPLETED', output: {} },
    ])).rejects.toThrow('URL de vídeo não encontrada')
  })

  it('handles videos[0].url format from COMPLETED response', async () => {
    const result = await simulatePollLoop([
      { ok: true, status: 'COMPLETED', output: { videos: [{ url: 'https://cdn.fal.ai/vid.mp4' }] } },
    ])
    expect(result.url).toBe('https://cdn.fal.ai/vid.mp4')
  })

  it('handles video_url format from COMPLETED response', async () => {
    const result = await simulatePollLoop([
      { ok: true, status: 'COMPLETED', output: { video_url: 'https://cdn.fal.ai/legacy.mp4' } },
    ])
    expect(result.url).toBe('https://cdn.fal.ai/legacy.mp4')
  })
})

describe('generateTextWithFetch() — API call logic', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('throws when API key is missing', async () => {
    await expect(generateTextWithFetch('test', { key: '' }, null)).rejects.toThrow('Mistral API key não configurada.')
  })

  it('throws when key is null', async () => {
    await expect(generateTextWithFetch('test', { key: null }, null)).rejects.toThrow('Mistral API key')
  })

  it('throws on non-ok response (uses error.message)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    })
    await expect(generateTextWithFetch('test', { key: 'k' }, mockFetch)).rejects.toThrow('Unauthorized')
  })

  it('throws with status code when no message in error body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({}),
    })
    await expect(generateTextWithFetch('test', { key: 'k' }, mockFetch)).rejects.toThrow('Erro 429')
  })

  it('returns content from successful response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Generated text' } }] }),
    })
    const result = await generateTextWithFetch('prompt', { key: 'my-key' }, mockFetch)
    expect(result).toBe('Generated text')
  })

  it('returns empty string when choices is empty', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [] }),
    })
    const result = await generateTextWithFetch('prompt', { key: 'key' }, mockFetch)
    expect(result).toBe('')
  })

  it('uses vision model when images are passed', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'vision output' } }] }),
    })
    await generateTextWithFetch('desc', { key: 'k', images: ['data:image/png;base64,abc'] }, mockFetch)
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.model).toBe('pixtral-12b-2409')
  })

  it('uses text model when no images', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'text output' } }] }),
    })
    await generateTextWithFetch('prompt', { key: 'k', images: [] }, mockFetch)
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.model).toBe('mistral-small-latest')
  })

  it('caps images at 3 when more are provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '' } }] }),
    })
    const images = ['img1', 'img2', 'img3', 'img4', 'img5']
    await generateTextWithFetch('test', { key: 'k', images }, mockFetch)
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    // content is array: [text, img1, img2, img3] = 4 items (1 text + 3 images max)
    expect(body.messages[0].content).toHaveLength(4)
  })
})
