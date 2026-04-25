import { describe, it, expect } from 'vitest';
import { formatSnapshotInfo } from './snapshot-info.js';

// 2026-04-25 in en-GB long format is "25 Apr 2026"; using a fixed ISO
// timestamp keeps the assertions deterministic across timezones.
const FETCHED = '2026-02-19T14:10:01.914Z';
const FETCHED_LABEL = '19 Feb 2026';

function payload({ source, origin, nodeCount = 281, fetchedAt = FETCHED } = {}) {
  return {
    _source: source,
    nodes: new Array(nodeCount),
    edges: [],
    meta: { fetchedAt, nodeCount, ...(origin ? { origin } : {}) },
  };
}

describe('formatSnapshotInfo()', () => {
  it('shows hazard count and the upstream fetch date', () => {
    const out = formatSnapshotInfo(payload({ source: 'snapshot', origin: 'snapshot' }));
    expect(out).toContain('281 hazards');
    expect(out).toContain(`Data: ${FETCHED_LABEL}`);
  });

  it('labels a fresh live-API fetch as "Live API"', () => {
    const out = formatSnapshotInfo(payload({ source: 'api', origin: 'api' }));
    expect(out).toContain('(Live API)');
    expect(out).not.toMatch(/cached/i);
  });

  it('labels a fresh snapshot fetch as "Snapshot"', () => {
    const out = formatSnapshotInfo(payload({ source: 'snapshot', origin: 'snapshot' }));
    expect(out).toContain('(Snapshot)');
    expect(out).not.toMatch(/cached/i);
  });

  it('preserves snapshot provenance when reading from cache', () => {
    // The bug: cached snapshot used to show "Cached 4m ago", which read
    // as if the data itself was fresh. The upstream date is what matters.
    const out = formatSnapshotInfo(payload({ source: 'cache', origin: 'snapshot' }));
    expect(out).toContain('(Snapshot)');
    expect(out).not.toMatch(/cached/i);
  });

  it('preserves live-API provenance when reading from cache', () => {
    const out = formatSnapshotInfo(payload({ source: 'cache', origin: 'api' }));
    expect(out).toContain('(Live API)');
    expect(out).not.toMatch(/cached/i);
  });

  it('falls back to "Cached" for legacy cached payloads with no origin marker', () => {
    const out = formatSnapshotInfo(payload({ source: 'cache' }));
    expect(out).toContain('(Cached)');
  });

  it('marks stale-cache fallback as offline so a network failure is visible', () => {
    const apiOffline = formatSnapshotInfo(payload({ source: 'stale-cache', origin: 'api' }));
    expect(apiOffline).toContain('Live API');
    expect(apiOffline).toMatch(/offline/i);

    const legacyOffline = formatSnapshotInfo(payload({ source: 'stale-cache' }));
    expect(legacyOffline).toMatch(/offline/i);
  });

  it('handles missing fetchedAt without throwing', () => {
    const out = formatSnapshotInfo({
      _source: 'snapshot',
      meta: { origin: 'snapshot', nodeCount: 281 },
      nodes: new Array(281),
      edges: [],
    });
    expect(out).toContain('unknown');
  });

  it('uses meta.nodeCount when available, otherwise falls back to nodes.length', () => {
    const withMeta = formatSnapshotInfo(payload({ source: 'snapshot', origin: 'snapshot', nodeCount: 42 }));
    expect(withMeta).toContain('42 hazards');

    const noMeta = formatSnapshotInfo({
      _source: 'snapshot',
      meta: { fetchedAt: FETCHED, origin: 'snapshot' },
      nodes: new Array(7),
      edges: [],
    });
    expect(noMeta).toContain('7 hazards');
  });
});
