// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { esc, getEl } from './dom.js';

describe('esc()', () => {
  it('returns empty string for null', () => expect(esc(null)).toBe(''));
  it('returns empty string for undefined', () => expect(esc(undefined)).toBe(''));
  it('returns empty string for empty string', () => expect(esc('')).toBe(''));

  it('escapes < and > characters', () => {
    expect(esc('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes & ampersand', () => {
    expect(esc('a & b')).toBe('a &amp; b');
  });

  it('escapes a full XSS payload', () => {
    const result = esc('<img src=x onerror="alert(1)">');
    expect(result).not.toContain('<img');
    expect(result).toContain('&lt;');
  });

  it('passes through plain text unchanged', () => {
    expect(esc('Hello World')).toBe('Hello World');
  });

  it('coerces non-strings to string before escaping', () => {
    expect(esc(42)).toBe('42');
  });
});

describe('getEl()', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns the element when found by ID', () => {
    const div = document.createElement('div');
    div.id = 'target';
    document.body.appendChild(div);
    expect(getEl('target')).toBe(div);
  });

  it('returns null and emits a console warning when element is not found', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = getEl('missing');
    expect(result).toBeNull();
    expect(warn).toHaveBeenCalledWith('[getEl] Element not found: #missing');
    warn.mockRestore();
  });
});
