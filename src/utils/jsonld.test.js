import { describe, it, expect } from 'vitest';
import { str, refId, toArray } from './jsonld.js';

describe('str()', () => {
  it('returns empty string for null', () => expect(str(null)).toBe(''));
  it('returns empty string for undefined', () => expect(str(undefined)).toBe(''));
  it('returns plain string unchanged', () => expect(str('hello')).toBe('hello'));
  it('extracts @value from language-tagged object', () => {
    expect(str({ '@language': 'en', '@value': 'Flood' })).toBe('Flood');
  });
  it('extracts @value from plain value object', () => {
    expect(str({ '@value': 'Earthquake' })).toBe('Earthquake');
  });
  it('returns empty string for object with no @value', () => {
    expect(str({ foo: 'bar' })).toBe('');
  });
});

describe('refId()', () => {
  it('returns null for null', () => expect(refId(null)).toBeNull());
  it('returns null for undefined', () => expect(refId(undefined)).toBeNull());
  it('returns plain string unchanged', () => expect(refId('urn:hips:123')).toBe('urn:hips:123'));
  it('extracts @id from reference object', () => {
    expect(refId({ '@id': 'urn:hips:123' })).toBe('urn:hips:123');
  });
  it('returns null for object without @id', () => {
    expect(refId({ foo: 'bar' })).toBeNull();
  });
});

describe('toArray()', () => {
  it('returns empty array for null', () => expect(toArray(null)).toEqual([]));
  it('returns empty array for undefined', () => expect(toArray(undefined)).toEqual([]));
  it('wraps a single string in an array', () => expect(toArray('val')).toEqual(['val']));
  it('returns an existing array unchanged', () => expect(toArray([1, 2, 3])).toEqual([1, 2, 3]));
  it('wraps an object in an array', () => expect(toArray({ a: 1 })).toEqual([{ a: 1 }]));
  it('returns empty array for empty array input', () => expect(toArray([])).toEqual([]));
});
