// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchHipsData } from './fetch-hips.js';

// Minimal valid snapshot-format payload
const VALID_DATA = {
  meta: { source: 'test', fetchedAt: '2024-01-01T00:00:00Z', nodeCount: 1, edgeCount: 0 },
  nodes: [{ id: 'n1', label: 'Flood' }],
  edges: [],
};

// Minimal valid JSON-LD API payload (transformRawApi handles this format)
const API_RESPONSE = { '@graph': [] };

function setFreshCache(data) {
  localStorage.setItem('hips-data', JSON.stringify(data));
  localStorage.setItem('hips-data-ts', String(Date.now()));
}

function setStaleCache(data) {
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  localStorage.setItem('hips-data', JSON.stringify(data));
  localStorage.setItem('hips-data-ts', String(twoHoursAgo));
}

beforeEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchHipsData() — cache hit', () => {
  it('returns fresh cached data without calling fetch', async () => {
    setFreshCache(VALID_DATA);
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const result = await fetchHipsData();
    expect(result._source).toBe('cache');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('propagates nodes from cache', async () => {
    setFreshCache(VALID_DATA);
    vi.stubGlobal('fetch', vi.fn());
    const result = await fetchHipsData();
    expect(result.nodes).toEqual(VALID_DATA.nodes);
  });
});

describe('fetchHipsData() — corrupt or invalid cache', () => {
  it('ignores corrupt cache JSON and falls through to fetch', async () => {
    localStorage.setItem('hips-data', 'not-valid-json');
    localStorage.setItem('hips-data-ts', String(Date.now()));
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => API_RESPONSE,
    });
    vi.stubGlobal('fetch', fetchFn);
    const result = await fetchHipsData();
    expect(['api', 'snapshot']).toContain(result._source);
  });

  it('ignores cache with invalid shape (missing nodes) and falls through', async () => {
    localStorage.setItem('hips-data', JSON.stringify({ foo: 'bar' }));
    localStorage.setItem('hips-data-ts', String(Date.now()));
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => API_RESPONSE,
    });
    vi.stubGlobal('fetch', fetchFn);
    const result = await fetchHipsData();
    expect(['api', 'snapshot']).toContain(result._source);
  });
});

describe('fetchHipsData() — live API', () => {
  it('fetches from API on cache miss and sets _source to "api"', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => API_RESPONSE,
    });
    vi.stubGlobal('fetch', fetchFn);
    const result = await fetchHipsData();
    expect(result._source).toBe('api');
  });

  it('writes result to localStorage after a successful API fetch', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => API_RESPONSE,
    });
    vi.stubGlobal('fetch', fetchFn);
    await fetchHipsData();
    expect(localStorage.getItem('hips-data')).toBeTruthy();
    expect(localStorage.getItem('hips-data-ts')).toBeTruthy();
  });

  it('falls back to snapshot when API returns a non-ok status', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, json: async () => VALID_DATA });
    vi.stubGlobal('fetch', fetchFn);
    const result = await fetchHipsData();
    expect(result._source).toBe('snapshot');
  });

  it('falls back to snapshot on a CORS/network TypeError', async () => {
    const fetchFn = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({ ok: true, json: async () => VALID_DATA });
    vi.stubGlobal('fetch', fetchFn);
    const result = await fetchHipsData();
    expect(result._source).toBe('snapshot');
  });
});

describe('fetchHipsData() — origin marker', () => {
  it('stamps meta.origin = "api" on a fresh API fetch', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => API_RESPONSE,
    });
    vi.stubGlobal('fetch', fetchFn);
    const result = await fetchHipsData();
    expect(result.meta.origin).toBe('api');
  });

  it('stamps meta.origin = "snapshot" on snapshot fallback', async () => {
    const fetchFn = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({ ok: true, json: async () => VALID_DATA });
    vi.stubGlobal('fetch', fetchFn);
    const result = await fetchHipsData();
    expect(result.meta.origin).toBe('snapshot');
  });

  it('persists meta.origin into localStorage so cached reads keep provenance', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => API_RESPONSE,
    });
    vi.stubGlobal('fetch', fetchFn);
    await fetchHipsData();
    const cached = JSON.parse(localStorage.getItem('hips-data'));
    expect(cached.meta.origin).toBe('api');
  });
});

describe('fetchHipsData() — stale cache fallback', () => {
  it('uses stale cache when all network sources fail', async () => {
    setStaleCache(VALID_DATA);
    const fetchFn = vi.fn().mockRejectedValue(new TypeError('Network failure'));
    vi.stubGlobal('fetch', fetchFn);
    const result = await fetchHipsData();
    expect(result._source).toBe('stale-cache');
  });
});

describe('fetchHipsData() — all sources fail', () => {
  it('throws a descriptive error when no source is available', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError('No network'));
    vi.stubGlobal('fetch', fetchFn);
    await expect(fetchHipsData()).rejects.toThrow('Unable to load hazard data');
  });
});
