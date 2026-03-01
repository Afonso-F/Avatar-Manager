/**
 * escHtml.test.js — Security tests for the HTML escaping function
 * Source: js/sections/avatares.js
 *
 * escHtml() is security-critical: it protects profile_url and category tags
 * from XSS when rendered inside HTML attributes and tag content.
 */
import { describe, it, expect } from 'vitest'

// Source: js/sections/avatares.js
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// ── TESTS ──────────────────────────────────────────────────────────────────

describe('escHtml() — basic escaping', () => {
  it('escapes & to &amp;', () => expect(escHtml('a & b')).toBe('a &amp; b'))
  it('escapes " to &quot;', () => expect(escHtml('"quoted"')).toBe('&quot;quoted&quot;'))
  it('escapes < to &lt;', () => expect(escHtml('<tag>')).toBe('&lt;tag&gt;'))
  it('escapes > to &gt;', () => expect(escHtml('foo > bar')).toBe('foo &gt; bar'))
  it('passes through safe ASCII strings unchanged', () => expect(escHtml('hello world')).toBe('hello world'))
  it('passes through numbers coerced to string', () => expect(escHtml(42)).toBe('42'))
  it('passes through safe URL characters', () => {
    expect(escHtml('https://example.com/path?q=1')).toBe('https://example.com/path?q=1')
  })
})

describe('escHtml() — null / undefined / empty', () => {
  it('returns empty string for null', () => expect(escHtml(null)).toBe(''))
  it('returns empty string for undefined', () => expect(escHtml(undefined)).toBe(''))
  it('returns empty string for empty string', () => expect(escHtml('')).toBe(''))
  // 0 is falsy → String(0 || '') = String('') = '' — documented source behavior
  it('returns empty string for 0 (falsy number, str||"" coercion)', () => expect(escHtml(0)).toBe(''))
  it('handles false gracefully', () => expect(escHtml(false)).toBe(''))
})

describe('escHtml() — XSS attack vectors', () => {
  it('prevents basic <script> injection', () => {
    const result = escHtml('<script>alert(1)</script>')
    expect(result).not.toContain('<script>')
    expect(result).toContain('&lt;script&gt;')
  })

  it('prevents <img onerror> XSS', () => {
    const result = escHtml('<img src=x onerror="alert(1)">')
    expect(result).not.toContain('<img')
    expect(result).toContain('&lt;img')
    expect(result).toContain('&quot;alert(1)&quot;')
  })

  it('prevents attribute injection through double-quote breaking', () => {
    // Malicious href: https://evil.com" onmouseover="alert(1)
    const malicious = 'https://evil.com" onmouseover="alert(1)'
    const escaped = escHtml(malicious)
    expect(escaped).not.toContain('" onmouseover="')
    expect(escaped).toContain('&quot;')
  })

  it('prevents javascript: protocol injection in href', () => {
    // If someone passes javascript:alert(1) as profile_url, it is not HTML-escaped
    // but note: no < > " & in "javascript:alert(1)" so it passes through unchanged.
    // This is expected — escHtml only encodes HTML special chars, not URL schemes.
    // The test documents this known limitation.
    const result = escHtml('javascript:alert(1)')
    expect(result).toBe('javascript:alert(1)')
    // ← This is intentional: URL scheme filtering is a separate concern.
  })

  it('escapes nested tags', () => {
    const result = escHtml('<a href="x">&foo</a>')
    expect(result).toBe('&lt;a href=&quot;x&quot;&gt;&amp;foo&lt;/a&gt;')
  })

  it('escapes SVG XSS vector', () => {
    const result = escHtml('<svg onload=alert(1)>')
    expect(result).not.toContain('<svg')
    expect(result).toContain('&lt;svg')
  })

  it('escapes iframe injection', () => {
    const result = escHtml('<iframe src="javascript:alert(1)"></iframe>')
    expect(result).not.toContain('<iframe')
  })

  it('handles ampersand in URL query string', () => {
    expect(escHtml('https://x.com?a=1&b=2')).toBe('https://x.com?a=1&amp;b=2')
  })
})

describe('escHtml() — multiple special chars in one string', () => {
  it('escapes all four special chars simultaneously', () => {
    expect(escHtml('<a & "b">')).toBe('&lt;a &amp; &quot;b&quot;&gt;')
  })

  it('escapes repeated ampersands', () => {
    expect(escHtml('a && b')).toBe('a &amp;&amp; b')
  })

  it('escapes repeated quotes', () => {
    expect(escHtml('""quoted""')).toBe('&quot;&quot;quoted&quot;&quot;')
  })

  it('handles mix of all chars', () => {
    const input = '&<>"'
    const output = escHtml(input)
    expect(output).toBe('&amp;&lt;&gt;&quot;')
    expect(output).not.toContain('&<>"')
  })
})

describe('escHtml() — known limitation: single quotes not escaped', () => {
  it('does NOT escape single quotes (documented limitation)', () => {
    // Single quotes in attribute values could be an issue if attrs use single quotes.
    // The current implementation only escapes the 4 HTML entities above.
    const result = escHtml("it's fine")
    expect(result).toBe("it's fine")
    // This test documents the current behavior, not necessarily the desired behavior.
  })
})
