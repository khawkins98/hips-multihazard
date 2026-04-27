/**
 * @module ui/snapshot-info
 * Pure formatter for the footer "snapshot info" label.
 *
 * Two distinct timestamps used to compete for the same UI slot:
 *  - `meta.fetchedAt`: when the upstream HIP data was pulled from
 *    PreventionWeb (stamped by `scripts/snapshot.js` at build time, or
 *    by the runtime API fetch).
 *  - `localStorage 'hips-data-ts'`: when the browser last refreshed its
 *    local copy.
 * Surfacing the cache write time as "Cached Xm ago" was misleading
 * because it implied the underlying data was that fresh. We now show
 * provenance (Live API / Snapshot / Cached / offline) alongside
 * `meta.fetchedAt` and drop the cache write time from the user-facing
 * label.
 */

/**
 * Decide the source label for a loaded HIPs dataset.
 * @param {string} source - data._source ('api' | 'snapshot' | 'cache' | 'stale-cache')
 * @param {string|undefined} origin - data.meta.origin ('api' | 'snapshot' | undefined)
 * @returns {string}
 */
function sourceLabel(source, origin) {
  const stale = source === 'stale-cache';
  let kind;
  if (origin === 'api' || source === 'api') kind = 'Live API';
  else if (origin === 'snapshot' || source === 'snapshot') kind = 'Snapshot';
  else kind = 'Cached';
  return stale ? `${kind} · offline` : kind;
}

/**
 * Build the footer label, e.g. `281 hazards · Data: 19 Feb 2026 (Snapshot)`.
 * @param {{meta?: object, nodes?: Array, _source: string}} data
 * @returns {string}
 */
export function formatSnapshotInfo(data) {
  const meta = data?.meta || {};
  const date = meta.fetchedAt
    ? new Date(meta.fetchedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'unknown';
  const count = meta.nodeCount ?? data?.nodes?.length ?? 0;
  return `${count} hazards · Data: ${date} (${sourceLabel(data?._source, meta.origin)})`;
}
