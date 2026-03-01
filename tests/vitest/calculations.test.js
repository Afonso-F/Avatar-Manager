/**
 * calculations.test.js — Unit tests for revenue calculation logic
 * Source: js/sections/monetizacao.js
 *
 * The monetização section has 1,139 lines of financial calculations with
 * zero direct tests. These tests cover the reduce-based aggregation logic
 * which is the highest-risk business logic in the codebase.
 */
import { describe, it, expect } from 'vitest'

// ── Revenue calculators (extracted from monetizacao.js) ────────────────────

function calcReceitaFansly(stats) {
  return stats.reduce((s, f) => s + (parseFloat(f.receita) || 0) + (parseFloat(f.tips) || 0), 0)
}

function calcReceitaOnlyfans(stats) {
  return stats.reduce(
    (s, f) => s + (parseFloat(f.receita) || 0) + (parseFloat(f.tips) || 0) + (parseFloat(f.ppv_receita) || 0),
    0,
  )
}

function calcReceitaYoutube(canais) {
  return canais.reduce((s, c) => s + (parseFloat(c.receita_mes) || 0), 0)
}

function calcReceitaMusicos(musicos) {
  return musicos.reduce((s, m) => s + (parseFloat(m.receita_mes) || 0), 0)
}

function calcPatreonMes(patreonStats) {
  return patreonStats[0] ? parseFloat(patreonStats[0].receita || 0) : 0
}

function calcTwitchMes(twitchStats) {
  if (!twitchStats[0]) return 0
  return (
    (parseFloat(twitchStats[0].bits_receita) || 0) +
    (parseFloat(twitchStats[0].donations_receita) || 0) +
    (parseFloat(twitchStats[0].ad_receita) || 0)
  )
}

function calcReceitaAfiliados(afiliados) {
  return afiliados.reduce((s, a) => s + (parseFloat(a.receita) || 0), 0)
}

function calcReceitaVendas(vendasDiretas, mesAtual) {
  const mesAtualStr = mesAtual.slice(0, 7)
  return vendasDiretas
    .filter(v => (v.data || '').startsWith(mesAtualStr))
    .reduce((s, v) => s + (parseFloat(v.receita_total) || 0), 0)
}

function calcTotalReceita(parts) {
  return parts.reduce((s, v) => s + v, 0)
}

// ── Metric aggregators ─────────────────────────────────────────────────────

function calcSubsTotal(fanslyStats) {
  return fanslyStats.reduce((s, f) => s + (f.subscribers || 0), 0)
}

function calcOfSubsTotal(onlyfansStats) {
  return onlyfansStats.reduce((s, f) => s + (f.subscribers || 0), 0)
}

function calcYtViews(canais) {
  return canais.reduce((s, c) => s + (c.total_views || 0), 0)
}

function calcMusicStreams(musicos) {
  return musicos.reduce((s, m) => s + (m.total_streams || 0), 0)
}

// ── Date helper (mesAtual construction) ────────────────────────────────────
function buildMesAtual(isoDate) {
  // In monetizacao.js: new Date().toISOString().slice(0,7) + '-01'
  return isoDate.slice(0, 7) + '-01'
}

// ── TESTS ──────────────────────────────────────────────────────────────────

describe('calcReceitaFansly()', () => {
  it('sums receita and tips for a single entry', () => {
    expect(calcReceitaFansly([{ receita: '100', tips: '20' }])).toBe(120)
  })
  it('sums across multiple entries', () => {
    expect(calcReceitaFansly([
      { receita: '100', tips: '10' },
      { receita: '200', tips: '30' },
    ])).toBe(340)
  })
  it('returns 0 for empty array', () => expect(calcReceitaFansly([])).toBe(0))
  it('handles null receita', () => {
    expect(calcReceitaFansly([{ receita: null, tips: '50' }])).toBe(50)
  })
  it('handles undefined tips (treated as 0)', () => {
    expect(calcReceitaFansly([{ receita: '75' }])).toBe(75)
  })
  it('handles string numbers with decimals', () => {
    expect(calcReceitaFansly([{ receita: '99.99', tips: '0.01' }])).toBeCloseTo(100)
  })
  it('handles undefined receita and tips', () => {
    expect(calcReceitaFansly([{ receita: undefined, tips: undefined }])).toBe(0)
  })
  it('handles empty strings as 0', () => {
    expect(calcReceitaFansly([{ receita: '', tips: '' }])).toBe(0)
  })
  it('handles negative values (parseFloat preserves sign)', () => {
    expect(calcReceitaFansly([{ receita: '-50', tips: '100' }])).toBe(50)
  })
  it('handles very large values', () => {
    expect(calcReceitaFansly([{ receita: '99999.99', tips: '0.01' }])).toBeCloseTo(100000)
  })
})

describe('calcReceitaOnlyfans()', () => {
  it('sums receita + tips + ppv_receita', () => {
    expect(calcReceitaOnlyfans([{ receita: '100', tips: '20', ppv_receita: '50' }])).toBe(170)
  })
  it('handles missing ppv_receita as 0', () => {
    expect(calcReceitaOnlyfans([{ receita: '100', tips: '20' }])).toBe(120)
  })
  it('returns 0 for empty array', () => expect(calcReceitaOnlyfans([])).toBe(0))
  it('handles null values', () => {
    expect(calcReceitaOnlyfans([{ receita: null, tips: null, ppv_receita: null }])).toBe(0)
  })
  it('sums multiple entries', () => {
    expect(calcReceitaOnlyfans([
      { receita: '500', tips: '50', ppv_receita: '100' },
      { receita: '300', tips: '30', ppv_receita: '0' },
    ])).toBe(980)
  })
  it('treats "0" ppv_receita as 0', () => {
    expect(calcReceitaOnlyfans([{ receita: '200', tips: '0', ppv_receita: '0' }])).toBe(200)
  })
})

describe('calcReceitaYoutube()', () => {
  it('sums receita_mes across channels', () => {
    expect(calcReceitaYoutube([
      { receita_mes: '100' },
      { receita_mes: '250.50' },
    ])).toBeCloseTo(350.50)
  })
  it('returns 0 for empty array', () => expect(calcReceitaYoutube([])).toBe(0))
  it('handles null receita_mes', () => {
    expect(calcReceitaYoutube([{ receita_mes: null }])).toBe(0)
  })
  it('handles missing receita_mes field', () => {
    expect(calcReceitaYoutube([{}])).toBe(0)
  })
})

describe('calcReceitaMusicos()', () => {
  it('sums receita_mes across musicians', () => {
    expect(calcReceitaMusicos([
      { receita_mes: '500' },
      { receita_mes: '300' },
    ])).toBe(800)
  })
  it('returns 0 for empty array', () => expect(calcReceitaMusicos([])).toBe(0))
  it('handles string decimals', () => {
    expect(calcReceitaMusicos([{ receita_mes: '12.34' }])).toBeCloseTo(12.34)
  })
})

describe('calcPatreonMes()', () => {
  it('returns receita from first Patreon stats entry', () => {
    expect(calcPatreonMes([{ receita: '350' }])).toBe(350)
  })
  it('returns 0 for empty array', () => expect(calcPatreonMes([])).toBe(0))
  it('handles null receita as 0', () => {
    expect(calcPatreonMes([{ receita: null }])).toBe(0)
  })
  it('ignores subsequent entries (only first is used)', () => {
    expect(calcPatreonMes([{ receita: '100' }, { receita: '999' }])).toBe(100)
  })
  it('handles string number', () => {
    expect(calcPatreonMes([{ receita: '1250.00' }])).toBeCloseTo(1250)
  })
})

describe('calcTwitchMes()', () => {
  it('sums bits + donations + ads', () => {
    expect(calcTwitchMes([{ bits_receita: '50', donations_receita: '100', ad_receita: '25' }])).toBe(175)
  })
  it('returns 0 for empty array', () => expect(calcTwitchMes([])).toBe(0))
  it('handles null ad_receita', () => {
    expect(calcTwitchMes([{ bits_receita: '10', donations_receita: '20', ad_receita: null }])).toBe(30)
  })
  it('only uses first entry', () => {
    expect(calcTwitchMes([
      { bits_receita: '100', donations_receita: '0', ad_receita: '0' },
      { bits_receita: '999', donations_receita: '0', ad_receita: '0' },
    ])).toBe(100)
  })
  it('handles all zeros', () => {
    expect(calcTwitchMes([{ bits_receita: '0', donations_receita: '0', ad_receita: '0' }])).toBe(0)
  })
  it('handles string decimals', () => {
    expect(calcTwitchMes([{ bits_receita: '10.50', donations_receita: '5.25', ad_receita: '4.25' }])).toBeCloseTo(20)
  })
})

describe('calcReceitaAfiliados()', () => {
  it('sums receita across afiliados', () => {
    expect(calcReceitaAfiliados([{ receita: '50' }, { receita: '75.50' }])).toBeCloseTo(125.50)
  })
  it('returns 0 for empty array', () => expect(calcReceitaAfiliados([])).toBe(0))
  it('handles null receita', () => {
    expect(calcReceitaAfiliados([{ receita: null }])).toBe(0)
  })
})

describe('calcReceitaVendas() — date filtering', () => {
  const vendas = [
    { data: '2026-02-10', receita_total: '150' },
    { data: '2026-02-28', receita_total: '200' },
    { data: '2026-01-15', receita_total: '999' }, // previous month
    { data: '2026-03-01', receita_total: '100' }, // next month
    { data: '2025-02-10', receita_total: '500' }, // previous year
  ]

  it('sums only sales in the current month', () => {
    expect(calcReceitaVendas(vendas, '2026-02-01')).toBeCloseTo(350)
  })
  it('returns 0 when no sales in current month', () => {
    expect(calcReceitaVendas(vendas, '2026-04-01')).toBe(0)
  })
  it('returns 0 for empty vendas array', () => {
    expect(calcReceitaVendas([], '2026-02-01')).toBe(0)
  })
  it('correctly slices mesAtual to 7 chars (YYYY-MM)', () => {
    // mesAtual '2026-01-01' → mesAtualStr '2026-01'
    expect(calcReceitaVendas(vendas, '2026-01-01')).toBe(999)
  })
  it('handles missing data field (treated as empty string, no match)', () => {
    const v = [{ receita_total: '100' }]
    expect(calcReceitaVendas(v, '2026-02-01')).toBe(0)
  })
  it('handles null data field', () => {
    const v = [{ data: null, receita_total: '100' }]
    expect(calcReceitaVendas(v, '2026-02-01')).toBe(0)
  })
  it('handles string receita_total with decimals', () => {
    const v = [{ data: '2026-02-15', receita_total: '99.99' }]
    expect(calcReceitaVendas(v, '2026-02-01')).toBeCloseTo(99.99)
  })
  it('does not include sales from same month but different year', () => {
    expect(calcReceitaVendas(vendas, '2025-02-01')).toBe(500)
    expect(calcReceitaVendas(vendas, '2026-02-01')).toBeCloseTo(350)
  })
})

describe('calcTotalReceita()', () => {
  it('sums all revenue parts', () => {
    expect(calcTotalReceita([100, 200, 50.50, 0, 300])).toBeCloseTo(650.50)
  })
  it('returns 0 for all-zero parts', () => {
    expect(calcTotalReceita([0, 0, 0])).toBe(0)
  })
  it('returns 0 for empty array', () => {
    expect(calcTotalReceita([])).toBe(0)
  })
  it('handles single value', () => {
    expect(calcTotalReceita([1234.56])).toBeCloseTo(1234.56)
  })
})

describe('calcSubsTotal() + calcOfSubsTotal()', () => {
  it('sums Fansly subscribers', () => {
    expect(calcSubsTotal([{ subscribers: 100 }, { subscribers: 250 }])).toBe(350)
  })
  it('sums OnlyFans subscribers', () => {
    expect(calcOfSubsTotal([{ subscribers: 500 }, { subscribers: 200 }])).toBe(700)
  })
  it('handles 0 subscribers', () => {
    expect(calcSubsTotal([{ subscribers: 0 }, { subscribers: 50 }])).toBe(50)
  })
  it('handles missing subscribers field', () => {
    expect(calcSubsTotal([{}])).toBe(0)
  })
  it('returns 0 for empty array', () => {
    expect(calcSubsTotal([])).toBe(0)
    expect(calcOfSubsTotal([])).toBe(0)
  })
})

describe('calcYtViews() + calcMusicStreams()', () => {
  it('sums total_views across YouTube channels', () => {
    expect(calcYtViews([{ total_views: 1000 }, { total_views: 5000 }])).toBe(6000)
  })
  it('sums total_streams across musicians', () => {
    expect(calcMusicStreams([{ total_streams: 10000 }, { total_streams: 25000 }])).toBe(35000)
  })
  it('handles missing fields', () => {
    expect(calcYtViews([{}])).toBe(0)
    expect(calcMusicStreams([{}])).toBe(0)
  })
  it('returns 0 for empty arrays', () => {
    expect(calcYtViews([])).toBe(0)
    expect(calcMusicStreams([])).toBe(0)
  })
  it('handles large view counts', () => {
    expect(calcYtViews([
      { total_views: 10_000_000 },
      { total_views: 5_000_000 },
    ])).toBe(15_000_000)
  })
})

describe('buildMesAtual() — date formatting', () => {
  it('builds YYYY-MM-01 from full ISO datetime', () => {
    expect(buildMesAtual('2026-02-27T10:00:00.000Z')).toBe('2026-02-01')
  })
  it('builds from date-only ISO', () => {
    expect(buildMesAtual('2026-12-15')).toBe('2026-12-01')
  })
  it('builds for January', () => {
    expect(buildMesAtual('2026-01-31')).toBe('2026-01-01')
  })
  it('mesAtualStr (slice 0,7) yields YYYY-MM', () => {
    const mesAtual = buildMesAtual('2026-02-27T00:00:00Z')
    expect(mesAtual.slice(0, 7)).toBe('2026-02')
  })
})
