/**
 * csv.test.js — Unit tests for CSV generation functions
 * Sources: js/sections/fila.js (buildFilaCsv) and js/sections/publicados.js (buildPublicadosCsv)
 */
import { describe, it, expect } from 'vitest'

// ── Source: js/sections/fila.js ───────────────────────────────────────────
function buildFilaCsv(posts, avatares) {
  const header = 'Data agendada,Avatar,Status,Plataformas,Legenda,Hashtags\n'
  const rows = posts.map(p => {
    const av  = avatares.find(a => String(a.id) === String(p.avatar_id))
    const leg = (p.legenda  || '').replace(/"/g, '""')
    const hsh = (p.hashtags || '').replace(/"/g, '""')
    return `${p.agendado_para || ''},${av?.nome || ''},${p.status},"${(p.plataformas || []).join(' ')}","${leg}","${hsh}"`
  }).join('\n')
  return header + rows
}

// ── Source: js/sections/publicados.js ────────────────────────────────────
function buildPublicadosCsv(data, avatares) {
  const header = 'Data publicação,Avatar,Plataforma,Legenda,Likes,Comentários,Views\n'
  const rows = data.map(p => {
    const av  = avatares.find(a => String(a.id) === String(p.avatar_id))
    const leg = (p.posts?.legenda || '').replace(/"/g, '""')
    return `${p.publicado_em || ''},${av?.nome || ''},${p.plataforma},"${leg}",${p.likes || 0},${p.comentarios || 0},${p.visualizacoes || 0}`
  }).join('\n')
  return header + rows
}

// ── Fixtures ───────────────────────────────────────────────────────────────

const avatares = [
  { id: '1', nome: 'Luna' },
  { id: '2', nome: 'Aria' },
]

const singlePost = [{
  id: 'p1',
  avatar_id: '1',
  status: 'agendado',
  plataformas: ['instagram', 'tiktok'],
  legenda: 'Bom dia mundo',
  hashtags: '#hello #world',
  agendado_para: '2026-03-01T10:00:00Z',
}]

// ── TESTS: buildFilaCsv() ──────────────────────────────────────────────────

describe('buildFilaCsv() — header', () => {
  it('includes header as first line', () => {
    const csv = buildFilaCsv([], avatares)
    expect(csv.split('\n')[0]).toBe('Data agendada,Avatar,Status,Plataformas,Legenda,Hashtags')
  })
  it('header has 6 columns', () => {
    const header = buildFilaCsv([], avatares).split('\n')[0]
    expect(header.split(',').length).toBe(6)
  })
})

describe('buildFilaCsv() — data rows', () => {
  it('includes avatar name', () => expect(buildFilaCsv(singlePost, avatares)).toContain('Luna'))
  it('includes post status', () => expect(buildFilaCsv(singlePost, avatares)).toContain('agendado'))
  it('includes platforms space-separated', () => expect(buildFilaCsv(singlePost, avatares)).toContain('instagram tiktok'))
  it('includes legenda', () => expect(buildFilaCsv(singlePost, avatares)).toContain('Bom dia mundo'))
  it('includes hashtags', () => expect(buildFilaCsv(singlePost, avatares)).toContain('#hello #world'))
  it('includes agendado_para date', () => expect(buildFilaCsv(singlePost, avatares)).toContain('2026-03-01'))
})

describe('buildFilaCsv() — CSV escaping', () => {
  it('escapes double quotes in legenda', () => {
    const p = [{ ...singlePost[0], legenda: 'Ele disse "olá"', hashtags: '' }]
    expect(buildFilaCsv(p, avatares)).toContain('Ele disse ""olá""')
  })
  it('escapes double quotes in hashtags', () => {
    const p = [{ ...singlePost[0], hashtags: '#tag "quoted"' }]
    expect(buildFilaCsv(p, avatares)).toContain('#tag ""quoted""')
  })
  it('wraps legenda in double quotes', () => {
    const csv = buildFilaCsv(singlePost, avatares)
    expect(csv).toContain('"Bom dia mundo"')
  })
  it('wraps hashtags in double quotes', () => {
    const csv = buildFilaCsv(singlePost, avatares)
    expect(csv).toContain('"#hello #world"')
  })
  it('wraps plataformas in double quotes', () => {
    const csv = buildFilaCsv(singlePost, avatares)
    expect(csv).toContain('"instagram tiktok"')
  })
})

describe('buildFilaCsv() — edge cases', () => {
  it('returns only header for empty posts array', () => {
    expect(buildFilaCsv([], avatares)).toBe('Data agendada,Avatar,Status,Plataformas,Legenda,Hashtags\n')
  })
  it('uses empty avatar name when avatar not found', () => {
    const p = [{ ...singlePost[0], avatar_id: '99' }]
    const firstDataRow = buildFilaCsv(p, avatares).split('\n')[1]
    expect(firstDataRow.split(',')[1]).toBe('')
  })
  it('handles numeric avatar_id with type coercion', () => {
    const p = [{ ...singlePost[0], avatar_id: 1 }] // number instead of string
    expect(buildFilaCsv(p, avatares)).toContain('Luna')
  })
  it('handles missing plataformas (undefined → empty list)', () => {
    const p = [{ ...singlePost[0], plataformas: undefined }]
    expect(() => buildFilaCsv(p, avatares)).not.toThrow()
  })
  it('handles missing legenda (undefined → empty string)', () => {
    const p = [{ ...singlePost[0], legenda: undefined }]
    expect(() => buildFilaCsv(p, avatares)).not.toThrow()
  })
  it('handles missing hashtags (undefined → empty string)', () => {
    const p = [{ ...singlePost[0], hashtags: undefined }]
    expect(() => buildFilaCsv(p, avatares)).not.toThrow()
  })
  it('handles null agendado_para (becomes empty)', () => {
    const p = [{ ...singlePost[0], agendado_para: null }]
    const csv = buildFilaCsv(p, avatares)
    const firstDataRow = csv.split('\n')[1]
    expect(firstDataRow.startsWith(',')).toBe(true) // date column is empty
  })
  it('handles single platform', () => {
    const p = [{ ...singlePost[0], plataformas: ['youtube'] }]
    expect(buildFilaCsv(p, avatares)).toContain('"youtube"')
  })
})

describe('buildFilaCsv() — multiple posts', () => {
  const posts = [
    { id: 'p1', avatar_id: '1', status: 'agendado', plataformas: ['instagram'], legenda: 'Post 1', hashtags: '', agendado_para: '2026-03-01' },
    { id: 'p2', avatar_id: '2', status: 'rascunho', plataformas: ['tiktok'],    legenda: 'Post 2', hashtags: '', agendado_para: '2026-03-02' },
    { id: 'p3', avatar_id: '1', status: 'erro',     plataformas: ['youtube'],   legenda: 'Post 3', hashtags: '', agendado_para: '2026-03-03' },
  ]

  it('produces header + N data rows', () => {
    const lines = buildFilaCsv(posts, avatares).split('\n')
    expect(lines).toHaveLength(4) // header + 3 posts
  })
  it('each row has correct avatar', () => {
    const lines = buildFilaCsv(posts, avatares).split('\n')
    expect(lines[1]).toContain('Luna')
    expect(lines[2]).toContain('Aria')
    expect(lines[3]).toContain('Luna')
  })
  it('each row has correct status', () => {
    const lines = buildFilaCsv(posts, avatares).split('\n')
    expect(lines[1]).toContain('agendado')
    expect(lines[2]).toContain('rascunho')
    expect(lines[3]).toContain('erro')
  })
})

// ── TESTS: buildPublicadosCsv() ────────────────────────────────────────────

const pubAvatares = [{ id: 'av1', nome: 'Zara' }]
const pubData = [{
  avatar_id: 'av1',
  plataforma: 'instagram',
  publicado_em: '2026-02-20T15:00:00Z',
  posts: { legenda: 'Foto verão' },
  likes: 1200,
  comentarios: 55,
  visualizacoes: 9800,
}]

describe('buildPublicadosCsv() — header', () => {
  it('includes correct header', () => {
    expect(buildPublicadosCsv([], pubAvatares))
      .toContain('Data publicação,Avatar,Plataforma,Legenda,Likes,Comentários,Views')
  })
  it('header has 7 columns', () => {
    const header = buildPublicadosCsv([], pubAvatares).split('\n')[0]
    expect(header.split(',').length).toBe(7)
  })
})

describe('buildPublicadosCsv() — data rows', () => {
  it('includes avatar name', () => expect(buildPublicadosCsv(pubData, pubAvatares)).toContain('Zara'))
  it('includes platform', () => expect(buildPublicadosCsv(pubData, pubAvatares)).toContain('instagram'))
  it('includes legenda', () => expect(buildPublicadosCsv(pubData, pubAvatares)).toContain('Foto verão'))
  it('includes likes', () => expect(buildPublicadosCsv(pubData, pubAvatares)).toContain('1200'))
  it('includes comentarios', () => expect(buildPublicadosCsv(pubData, pubAvatares)).toContain('55'))
  it('includes visualizacoes', () => expect(buildPublicadosCsv(pubData, pubAvatares)).toContain('9800'))
  it('includes publicado_em date', () => expect(buildPublicadosCsv(pubData, pubAvatares)).toContain('2026-02-20'))
})

describe('buildPublicadosCsv() — edge cases', () => {
  it('returns only header for empty data', () => {
    expect(buildPublicadosCsv([], pubAvatares))
      .toBe('Data publicação,Avatar,Plataforma,Legenda,Likes,Comentários,Views\n')
  })
  it('uses 0 for undefined likes', () => {
    const d = [{ ...pubData[0], likes: undefined }]
    expect(buildPublicadosCsv(d, pubAvatares)).toContain(',0,')
  })
  it('uses 0 for null comentarios', () => {
    const d = [{ ...pubData[0], comentarios: null }]
    const csv = buildPublicadosCsv(d, pubAvatares)
    expect(csv).toMatch(/,0,\d+$|,0,0$/)
  })
  it('uses 0 for all missing metrics simultaneously', () => {
    const d = [{ ...pubData[0], likes: undefined, comentarios: null, visualizacoes: 0 }]
    expect(buildPublicadosCsv(d, pubAvatares)).toContain(',0,0,0')
  })
  it('handles missing posts object (undefined)', () => {
    const d = [{ ...pubData[0], posts: undefined }]
    expect(() => buildPublicadosCsv(d, pubAvatares)).not.toThrow()
  })
  it('handles missing posts.legenda', () => {
    const d = [{ ...pubData[0], posts: {} }]
    expect(() => buildPublicadosCsv(d, pubAvatares)).not.toThrow()
  })
  it('escapes double quotes in legenda', () => {
    const d = [{ ...pubData[0], posts: { legenda: 'Ele disse "olá"' } }]
    expect(buildPublicadosCsv(d, pubAvatares)).toContain('Ele disse ""olá""')
  })
  it('handles numeric avatar_id with type coercion', () => {
    const d = [{ ...pubData[0], avatar_id: 'av1' }]
    expect(buildPublicadosCsv(d, pubAvatares)).toContain('Zara')
  })
  it('uses empty avatar name when avatar not found', () => {
    const d = [{ ...pubData[0], avatar_id: 'unknown' }]
    const row = buildPublicadosCsv(d, pubAvatares).split('\n')[1]
    expect(row.split(',')[1]).toBe('')
  })
  it('handles null publicado_em', () => {
    const d = [{ ...pubData[0], publicado_em: null }]
    const csv = buildPublicadosCsv(d, pubAvatares)
    expect(csv.split('\n')[1].startsWith(',')).toBe(true)
  })
})

describe('buildPublicadosCsv() — multiple rows', () => {
  const data = [
    { avatar_id: 'av1', plataforma: 'instagram', publicado_em: '2026-02-01', posts: { legenda: 'P1' }, likes: 100, comentarios: 5, visualizacoes: 1000 },
    { avatar_id: 'av1', plataforma: 'tiktok',    publicado_em: '2026-02-02', posts: { legenda: 'P2' }, likes: 200, comentarios: 10, visualizacoes: 2000 },
  ]

  it('produces header + 2 rows', () => {
    const lines = buildPublicadosCsv(data, pubAvatares).split('\n')
    expect(lines).toHaveLength(3)
  })
  it('each row has correct platform', () => {
    const lines = buildPublicadosCsv(data, pubAvatares).split('\n')
    expect(lines[1]).toContain('instagram')
    expect(lines[2]).toContain('tiktok')
  })
})
