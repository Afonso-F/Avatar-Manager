/**
 * utils.test.js — Unit tests for utility functions from js/app.js
 * Functions inlined to test in isolation (same approach as tests/test.html).
 */
import { describe, it, expect } from 'vitest'

// ── Source: js/app.js ──────────────────────────────────────────────────────

function formatNumber(n) {
  if (!n && n !== 0) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k'
  return String(n)
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-PT', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtErr(e) {
  if (!e) return 'Erro desconhecido'
  if (typeof e === 'string') return e
  const pick = v => (v && typeof v === 'string') ? v : null
  return pick(e.message) || pick(e.details) || pick(e.hint) || pick(e.code)
    || (() => { try { const j = JSON.stringify(e); return j && j !== '{}' ? j : null } catch { return null } })()
    || 'Erro desconhecido'
}

function statusBadge(status) {
  const map = {
    rascunho:  '<span class="badge badge-muted">Rascunho</span>',
    agendado:  '<span class="badge badge-yellow">Agendado</span>',
    publicado: '<span class="badge badge-green">Publicado</span>',
    erro:      '<span class="badge badge-red">Erro</span>',
  }
  return map[status] || `<span class="badge badge-muted">${status}</span>`
}

function platformIcon(p) {
  const map = {
    instagram:   'fa-brands fa-instagram icon-instagram',
    tiktok:      'fa-brands fa-tiktok icon-tiktok',
    facebook:    'fa-brands fa-facebook icon-facebook',
    youtube:     'fa-brands fa-youtube icon-youtube',
    fansly:      'fa-solid fa-dollar-sign icon-fansly',
    onlyfans:    'fa-solid fa-fire icon-onlyfans',
    patreon:     'fa-brands fa-patreon icon-patreon',
    twitch:      'fa-brands fa-twitch icon-twitch',
    spotify:     'fa-brands fa-spotify icon-spotify',
    vimeo:       'fa-brands fa-vimeo-v icon-vimeo',
    rumble:      'fa-solid fa-video icon-rumble',
    dailymotion: 'fa-solid fa-play icon-dailymotion',
  }
  return `<i class="${map[p] || 'fa-solid fa-globe'}"></i>`
}

function platformLabel(p) {
  const labels = {
    instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook',
    youtube: 'YouTube', fansly: 'Fansly', onlyfans: 'OnlyFans',
    patreon: 'Patreon', twitch: 'Twitch', spotify: 'Spotify',
    vimeo: 'Vimeo', rumble: 'Rumble', dailymotion: 'Dailymotion',
  }
  return labels[p] || p.charAt(0).toUpperCase() + p.slice(1)
}

// Active avatar selection logic (from app.js)
function getActiveAvatar(avatares, activeId) {
  return avatares.find(a => String(a.id) === String(activeId)) || avatares[0] || null
}

// ── TESTS ──────────────────────────────────────────────────────────────────

describe('formatNumber()', () => {
  it('formats 1.5M', () => expect(formatNumber(1_500_000)).toBe('1.5M'))
  it('formats 2.5k', () => expect(formatNumber(2500)).toBe('2.5k'))
  it('returns number as string when < 1000', () => expect(formatNumber(42)).toBe('42'))
  it('returns — for null', () => expect(formatNumber(null)).toBe('—'))
  it('returns — for undefined', () => expect(formatNumber(undefined)).toBe('—'))
  it('returns "0" for zero', () => expect(formatNumber(0)).toBe('0'))
  it('formats 1000 as 1.0k', () => expect(formatNumber(1000)).toBe('1.0k'))
  it('formats 1_000_000 as 1.0M', () => expect(formatNumber(1_000_000)).toBe('1.0M'))
  it('formats 999 as "999"', () => expect(formatNumber(999)).toBe('999'))
  it('returns — for NaN', () => expect(formatNumber(NaN)).toBe('—'))
  it('handles very large numbers', () => expect(formatNumber(10_000_000)).toBe('10.0M'))
  it('formats 1500 as 1.5k', () => expect(formatNumber(1500)).toBe('1.5k'))
  it('handles negative numbers (returned as string)', () => expect(typeof formatNumber(-500)).toBe('string'))
})

describe('formatDate()', () => {
  it('returns — for null', () => expect(formatDate(null)).toBe('—'))
  it('returns — for undefined', () => expect(formatDate(undefined)).toBe('—'))
  it('returns — for empty string', () => expect(formatDate('')).toBe('—'))
  it('includes the year in formatted output', () => expect(formatDate('2026-03-01T10:00:00Z')).toContain('2026'))
  it('result is non-empty string for valid ISO', () => expect(formatDate('2026-01-01T00:00:00Z')).toBeTruthy())
  it('formats different months without crashing', () => expect(formatDate('2026-12-31T23:59:00Z')).toContain('2026'))
  it('handles date-only ISO strings', () => expect(formatDate('2026-06-15')).toContain('2026'))
})

describe('fmtErr()', () => {
  it('passes strings directly', () => expect(fmtErr('Network error')).toBe('Network error'))
  it('extracts .message from Error objects', () => expect(fmtErr(new Error('oops'))).toBe('oops'))
  it('extracts .message from plain objects', () => expect(fmtErr({ message: 'Token expired' })).toBe('Token expired'))
  it('extracts .details when no .message', () => expect(fmtErr({ details: 'FK violation' })).toBe('FK violation'))
  it('extracts .hint when no .message or .details', () => expect(fmtErr({ hint: 'Use another field' })).toBe('Use another field'))
  it('extracts .code as last resort', () => expect(fmtErr({ code: 'P0001' })).toBe('P0001'))
  it('returns Erro desconhecido for null', () => expect(fmtErr(null)).toBe('Erro desconhecido'))
  it('returns Erro desconhecido for undefined', () => expect(fmtErr(undefined)).toBe('Erro desconhecido'))
  it('serializes unknown objects as JSON', () => expect(fmtErr({ foo: 'bar' })).toContain('bar'))
  it('prefers .message over .details', () => expect(fmtErr({ message: 'A', details: 'B' })).toBe('A'))
  it('prefers .details over .hint', () => expect(fmtErr({ details: 'D', hint: 'H' })).toBe('D'))
  it('prefers .hint over .code', () => expect(fmtErr({ hint: 'H', code: 'C' })).toBe('H'))
  it('returns Erro desconhecido for empty object', () => expect(fmtErr({})).toBe('Erro desconhecido'))
  it('handles objects with circular refs by catching JSON error', () => {
    const obj = {}
    obj.self = obj
    const result = fmtErr(obj)
    expect(result).toBe('Erro desconhecido')
  })
})

describe('statusBadge()', () => {
  it('green badge for publicado', () => {
    const result = statusBadge('publicado')
    expect(result).toContain('badge-green')
    expect(result).toContain('Publicado')
  })
  it('red badge for erro', () => {
    const result = statusBadge('erro')
    expect(result).toContain('badge-red')
    expect(result).toContain('Erro')
  })
  it('yellow badge for agendado', () => {
    const result = statusBadge('agendado')
    expect(result).toContain('badge-yellow')
    expect(result).toContain('Agendado')
  })
  it('muted badge for rascunho', () => {
    const result = statusBadge('rascunho')
    expect(result).toContain('badge-muted')
    expect(result).toContain('Rascunho')
  })
  it('generic badge with text for unknown status', () => {
    expect(statusBadge('xpto')).toContain('badge-muted')
    expect(statusBadge('xpto')).toContain('xpto')
  })
  it('all results are HTML <span> elements', () => {
    for (const s of ['publicado', 'erro', 'agendado', 'rascunho', 'unknown']) {
      expect(statusBadge(s)).toContain('<span')
    }
  })
})

describe('platformIcon()', () => {
  it('instagram icon', () => expect(platformIcon('instagram')).toContain('fa-instagram'))
  it('tiktok icon', () => expect(platformIcon('tiktok')).toContain('fa-tiktok'))
  it('facebook icon', () => expect(platformIcon('facebook')).toContain('fa-facebook'))
  it('youtube icon', () => expect(platformIcon('youtube')).toContain('fa-youtube'))
  it('fansly icon', () => expect(platformIcon('fansly')).toContain('fa-dollar-sign'))
  it('onlyfans icon', () => expect(platformIcon('onlyfans')).toContain('fa-fire'))
  it('patreon icon', () => expect(platformIcon('patreon')).toContain('fa-patreon'))
  it('twitch icon', () => expect(platformIcon('twitch')).toContain('fa-twitch'))
  it('spotify icon', () => expect(platformIcon('spotify')).toContain('fa-spotify'))
  it('vimeo icon', () => expect(platformIcon('vimeo')).toContain('fa-vimeo'))
  it('rumble icon', () => expect(platformIcon('rumble')).toContain('fa-video'))
  it('dailymotion icon', () => expect(platformIcon('dailymotion')).toContain('fa-play'))
  it('globe icon for unknown platform', () => expect(platformIcon('snapchat')).toContain('fa-globe'))
  it('result is <i> tag', () => expect(platformIcon('instagram')).toContain('<i '))
  it('globe for empty string', () => expect(platformIcon('')).toContain('fa-globe'))
})

describe('platformLabel()', () => {
  it('Instagram', () => expect(platformLabel('instagram')).toBe('Instagram'))
  it('TikTok', () => expect(platformLabel('tiktok')).toBe('TikTok'))
  it('Facebook', () => expect(platformLabel('facebook')).toBe('Facebook'))
  it('YouTube', () => expect(platformLabel('youtube')).toBe('YouTube'))
  it('Fansly', () => expect(platformLabel('fansly')).toBe('Fansly'))
  it('OnlyFans', () => expect(platformLabel('onlyfans')).toBe('OnlyFans'))
  it('Patreon', () => expect(platformLabel('patreon')).toBe('Patreon'))
  it('Twitch', () => expect(platformLabel('twitch')).toBe('Twitch'))
  it('Spotify', () => expect(platformLabel('spotify')).toBe('Spotify'))
  it('Vimeo', () => expect(platformLabel('vimeo')).toBe('Vimeo'))
  it('Rumble', () => expect(platformLabel('rumble')).toBe('Rumble'))
  it('Dailymotion', () => expect(platformLabel('dailymotion')).toBe('Dailymotion'))
  it('capitalizes unknown platform first letter', () => expect(platformLabel('snapchat')).toBe('Snapchat'))
  it('handles uppercase unknown (capitalize only first char)', () => expect(platformLabel('xXx')).toBe('XXx'))
})

describe('getActiveAvatar()', () => {
  const avatares = [
    { id: '1', nome: 'Luna' },
    { id: '2', nome: 'Aria' },
    { id: '3', nome: 'Nova' },
  ]

  it('returns avatar matching activeId (string match)', () => {
    expect(getActiveAvatar(avatares, '2').nome).toBe('Aria')
  })
  it('returns avatar when activeId is a number (type coercion)', () => {
    expect(getActiveAvatar(avatares, 2).nome).toBe('Aria')
  })
  it('falls back to first avatar when activeId not found', () => {
    expect(getActiveAvatar(avatares, '99').nome).toBe('Luna')
  })
  it('falls back to first avatar when activeId is null', () => {
    expect(getActiveAvatar(avatares, null).nome).toBe('Luna')
  })
  it('returns null for empty avatar list', () => {
    expect(getActiveAvatar([], '1')).toBeNull()
  })
  it('returns first avatar when activeId is undefined', () => {
    expect(getActiveAvatar(avatares, undefined).nome).toBe('Luna')
  })
})
