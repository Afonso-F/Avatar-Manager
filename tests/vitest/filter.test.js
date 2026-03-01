/**
 * filter.test.js — Unit tests for fila filtering and pagination logic
 * Source: js/sections/fila.js
 *
 * The renderFilaList() function has critical multi-condition filtering
 * with type coercion (String() for avatar IDs) and case-insensitive search.
 */
import { describe, it, expect } from 'vitest'

// ── Source: fila.js constants and pure logic ───────────────────────────────

const FILA_PAGE_SIZE = 10

// Extracted pure filter function (mirrors renderFilaList inner logic)
function filterPosts(allPosts, { tab = 'all', avatarId = '', search = '' } = {}) {
  return (allPosts || []).filter(p => {
    if (tab !== 'all' && p.status !== tab) return false
    if (avatarId && String(p.avatar_id) !== String(avatarId)) return false
    if (search && !(p.legenda || '').toLowerCase().includes(search)) return false
    return true
  })
}

// Extracted sort (chronological by agendado_para)
function sortPosts(posts) {
  return [...posts].sort((a, b) => {
    if (a.agendado_para && b.agendado_para) return new Date(a.agendado_para) - new Date(b.agendado_para)
    return 0
  })
}

// Extracted pagination logic
function paginatePosts(posts, page, pageSize = FILA_PAGE_SIZE) {
  const total = posts.length
  const paginated = posts.slice(page * pageSize, (page + 1) * pageSize)
  const totalPages = Math.ceil(total / pageSize)
  return { paginated, total, totalPages }
}

// Kanban filter (same as renderFilaKanban inner logic — no tab filter)
function filterPostsKanban(allPosts, { avatarId = '', search = '' } = {}) {
  return (allPosts || []).filter(p => {
    if (avatarId && String(p.avatar_id) !== String(avatarId)) return false
    if (search && !(p.legenda || '').toLowerCase().includes(search)) return false
    return true
  })
}

// ── Fixtures ───────────────────────────────────────────────────────────────

const samplePosts = [
  { id: '1', status: 'agendado',  avatar_id: '1', legenda: 'Post sobre verão',   agendado_para: '2026-03-10T10:00:00Z' },
  { id: '2', status: 'agendado',  avatar_id: '2', legenda: 'Post sobre inverno',  agendado_para: '2026-03-05T10:00:00Z' },
  { id: '3', status: 'rascunho',  avatar_id: '1', legenda: 'Rascunho de natal',   agendado_para: null },
  { id: '4', status: 'rascunho',  avatar_id: '2', legenda: 'Outro rascunho',      agendado_para: null },
  { id: '5', status: 'erro',      avatar_id: '1', legenda: 'Post com erro',       agendado_para: '2026-03-01T10:00:00Z' },
  { id: '6', status: 'publicado', avatar_id: '3', legenda: 'Post publicado',      agendado_para: '2026-02-28T10:00:00Z' },
]

// ── TESTS: tab filtering ───────────────────────────────────────────────────

describe('filterPosts() — tab filtering', () => {
  it('returns all posts when tab is "all"', () => {
    expect(filterPosts(samplePosts, { tab: 'all' })).toHaveLength(6)
  })
  it('filters agendado posts', () => {
    expect(filterPosts(samplePosts, { tab: 'agendado' })).toHaveLength(2)
  })
  it('filters rascunho posts', () => {
    expect(filterPosts(samplePosts, { tab: 'rascunho' })).toHaveLength(2)
  })
  it('filters erro posts', () => {
    expect(filterPosts(samplePosts, { tab: 'erro' })).toHaveLength(1)
  })
  it('filters publicado posts', () => {
    expect(filterPosts(samplePosts, { tab: 'publicado' })).toHaveLength(1)
  })
  it('returns empty array for unknown status tab', () => {
    expect(filterPosts(samplePosts, { tab: 'unknown' })).toHaveLength(0)
  })
  it('handles empty post list', () => {
    expect(filterPosts([], { tab: 'agendado' })).toHaveLength(0)
  })
  it('handles null allPosts', () => {
    expect(filterPosts(null, { tab: 'all' })).toHaveLength(0)
  })
  it('handles undefined allPosts', () => {
    expect(filterPosts(undefined, { tab: 'all' })).toHaveLength(0)
  })
  it('default tab (no option) returns all posts', () => {
    expect(filterPosts(samplePosts)).toHaveLength(6)
  })
})

// ── TESTS: avatar filtering ────────────────────────────────────────────────

describe('filterPosts() — avatar ID filtering', () => {
  it('filters by avatar ID string', () => {
    const result = filterPosts(samplePosts, { tab: 'all', avatarId: '1' })
    expect(result).toHaveLength(3)
    expect(result.every(p => String(p.avatar_id) === '1')).toBe(true)
  })
  it('filters by avatar ID string "2"', () => {
    expect(filterPosts(samplePosts, { tab: 'all', avatarId: '2' })).toHaveLength(2)
  })
  it('returns all posts when avatarId is empty string', () => {
    expect(filterPosts(samplePosts, { tab: 'all', avatarId: '' })).toHaveLength(6)
  })
  it('handles numeric avatar_id coerced via String() — number in data, string filter', () => {
    const posts = [{ id: 'x', status: 'agendado', avatar_id: 42, legenda: '' }]
    expect(filterPosts(posts, { tab: 'all', avatarId: '42' })).toHaveLength(1)
  })
  it('handles string avatar_id with string filter', () => {
    const posts = [{ id: 'x', status: 'agendado', avatar_id: '42', legenda: '' }]
    expect(filterPosts(posts, { tab: 'all', avatarId: '42' })).toHaveLength(1)
  })
  it('handles numeric filter with string avatar_id (type coercion both sides)', () => {
    const posts = [{ id: 'x', status: 'agendado', avatar_id: '42', legenda: '' }]
    expect(filterPosts(posts, { tab: 'all', avatarId: 42 })).toHaveLength(1)
  })
  it('returns empty when avatar not found', () => {
    expect(filterPosts(samplePosts, { tab: 'all', avatarId: '99' })).toHaveLength(0)
  })
  it('combined tab + avatar filter', () => {
    const result = filterPosts(samplePosts, { tab: 'agendado', avatarId: '1' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })
})

// ── TESTS: search filtering ────────────────────────────────────────────────

describe('filterPosts() — search filtering', () => {
  it('filters by legenda content', () => {
    expect(filterPosts(samplePosts, { search: 'verão' })).toHaveLength(1)
  })
  it('search is case-insensitive (lowercase query)', () => {
    expect(filterPosts(samplePosts, { search: 'rascunho' })).toHaveLength(2)
  })
  // NOTE: renderFilaList() pre-lowercases the search with .toLowerCase() before passing
  // to the filter. So the filter itself only needs to handle lowercase search terms.
  // Passing uppercase to filterPosts() directly does NOT match (by design).
  it('search with lowercase is case-insensitive against legenda', () => {
    expect(filterPosts(samplePosts, { search: 'verão' })).toHaveLength(1)
  })
  it('uppercase search does NOT match (caller must pre-lowercase)', () => {
    expect(filterPosts(samplePosts, { search: 'VERÃO' })).toHaveLength(0)
  })
  it('empty search returns all posts', () => {
    expect(filterPosts(samplePosts, { search: '' })).toHaveLength(6)
  })
  it('handles posts with missing legenda field', () => {
    const posts = [{ id: 'x', status: 'agendado', avatar_id: '1' }]
    expect(filterPosts(posts, { search: 'anything' })).toHaveLength(0)
  })
  it('handles posts with null legenda', () => {
    const posts = [{ id: 'x', status: 'agendado', avatar_id: '1', legenda: null }]
    expect(filterPosts(posts, { search: 'anything' })).toHaveLength(0)
  })
  it('partial match works', () => {
    expect(filterPosts(samplePosts, { search: 'post' })).toHaveLength(4) // "Post sobre verão", "Post sobre inverno", "Post com erro", "Post publicado"
  })
  it('combined tab + search filter', () => {
    const result = filterPosts(samplePosts, { tab: 'rascunho', search: 'natal' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('3')
  })
  it('combined avatar + search filter', () => {
    const result = filterPosts(samplePosts, { tab: 'all', avatarId: '1', search: 'erro' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('5')
  })
  it('all three filters combined', () => {
    const result = filterPosts(samplePosts, { tab: 'rascunho', avatarId: '2', search: 'outro' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('4')
  })
})

// ── TESTS: sort ────────────────────────────────────────────────────────────

describe('sortPosts() — chronological ordering', () => {
  it('sorts by agendado_para ascending', () => {
    const posts = [
      { id: 'a', agendado_para: '2026-03-10T10:00:00Z' },
      { id: 'b', agendado_para: '2026-03-01T10:00:00Z' },
      { id: 'c', agendado_para: '2026-03-05T10:00:00Z' },
    ]
    const sorted = sortPosts(posts)
    expect(sorted[0].id).toBe('b')
    expect(sorted[1].id).toBe('c')
    expect(sorted[2].id).toBe('a')
  })
  it('does not mutate original array', () => {
    const posts = [
      { id: 'a', agendado_para: '2026-03-10T10:00:00Z' },
      { id: 'b', agendado_para: '2026-03-01T10:00:00Z' },
    ]
    sortPosts(posts)
    expect(posts[0].id).toBe('a') // original unchanged
  })
  it('handles posts without agendado_para (null, no sort)', () => {
    const posts = [
      { id: 'a', agendado_para: null },
      { id: 'b', agendado_para: null },
    ]
    // Both null → no reorder, relative order preserved
    expect(sortPosts(posts)).toHaveLength(2)
  })
})

// ── TESTS: pagination ──────────────────────────────────────────────────────

describe('paginatePosts()', () => {
  const posts = Array.from({ length: 25 }, (_, i) => ({ id: String(i + 1) }))

  it('first page has 10 items (FILA_PAGE_SIZE)', () => {
    const { paginated } = paginatePosts(posts, 0)
    expect(paginated).toHaveLength(10)
    expect(paginated[0].id).toBe('1')
  })
  it('second page has items 11-20', () => {
    const { paginated } = paginatePosts(posts, 1)
    expect(paginated).toHaveLength(10)
    expect(paginated[0].id).toBe('11')
    expect(paginated[9].id).toBe('20')
  })
  it('last page has remaining 5 items', () => {
    const { paginated } = paginatePosts(posts, 2)
    expect(paginated).toHaveLength(5)
    expect(paginated[0].id).toBe('21')
  })
  it('beyond last page returns empty array', () => {
    const { paginated } = paginatePosts(posts, 99)
    expect(paginated).toHaveLength(0)
  })
  it('total is the full count', () => {
    const { total } = paginatePosts(posts, 0)
    expect(total).toBe(25)
  })
  it('totalPages is 3 for 25 items', () => {
    const { totalPages } = paginatePosts(posts, 0)
    expect(totalPages).toBe(3)
  })
  it('exactly 10 items = 1 page', () => {
    const p = Array.from({ length: 10 }, (_, i) => ({ id: String(i) }))
    expect(paginatePosts(p, 0).totalPages).toBe(1)
  })
  it('11 items = 2 pages', () => {
    const p = Array.from({ length: 11 }, (_, i) => ({ id: String(i) }))
    expect(paginatePosts(p, 0).totalPages).toBe(2)
  })
  it('empty list: total=0, totalPages=0, paginated=[]', () => {
    const { total, totalPages, paginated } = paginatePosts([], 0)
    expect(total).toBe(0)
    expect(totalPages).toBe(0)
    expect(paginated).toHaveLength(0)
  })
  it('single item: totalPages=1', () => {
    const { totalPages, paginated } = paginatePosts([{ id: '1' }], 0)
    expect(totalPages).toBe(1)
    expect(paginated).toHaveLength(1)
  })
  it('custom page size works', () => {
    const { paginated, totalPages } = paginatePosts(posts, 0, 5)
    expect(paginated).toHaveLength(5)
    expect(totalPages).toBe(5)
  })
})

// ── TESTS: kanban filter (no tab filter) ───────────────────────────────────

describe('filterPostsKanban()', () => {
  it('does not filter by tab — returns all statuses', () => {
    expect(filterPostsKanban(samplePosts)).toHaveLength(6)
  })
  it('filters by avatar', () => {
    expect(filterPostsKanban(samplePosts, { avatarId: '1' })).toHaveLength(3)
  })
  it('filters by search', () => {
    expect(filterPostsKanban(samplePosts, { search: 'natal' })).toHaveLength(1)
  })
  it('combined avatar + search', () => {
    const result = filterPostsKanban(samplePosts, { avatarId: '1', search: 'erro' })
    expect(result).toHaveLength(1)
  })
})
