/**
 * @module data/fetch-hips
 * Fetches HIPs data from the local snapshot (preferred) or live API.
 * Caches data in localStorage (1-hour TTL) so repeated visits avoid re-fetching.
 * Falls back gracefully when the live API is blocked by CORS/network rules.
 */
import { str, refId, toArray } from '../utils/jsonld.js';

const SNAPSHOT_URL = import.meta.env.BASE_URL + 'data/hips.json';
const API_URL = 'https://www.preventionweb.net/api/terms/hips';
const CACHE_KEY = 'hips-data';
const CACHE_TS_KEY = 'hips-data-ts';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Validate that data has the expected shape with nodes and edges arrays.
 * @param {object} data - Data to validate
 * @throws {Error} If data shape is invalid
 */
function validateData(data) {
  if (!data || !Array.isArray(data.nodes)) {
    throw new Error('Invalid data: missing nodes array');
  }
  if (!Array.isArray(data.edges)) {
    throw new Error('Invalid data: missing edges array');
  }
}

/**
 * Try to read cached data from localStorage.
 * @returns {object|null} Cached data if valid and fresh, null otherwise
 */
function readCache() {
  try {
    const ts = parseInt(localStorage.getItem(CACHE_TS_KEY), 10);
    if (!ts || Date.now() - ts > CACHE_TTL) return null;
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    validateData(data);
    return data;
  } catch {
    return null;
  }
}

/**
 * Write data to localStorage cache.
 * @param {object} data - Validated data to cache
 */
function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

/**
 * Detect whether a fetch error is likely a CORS or network block.
 * @param {Error} err
 * @returns {boolean}
 */
function isCorsOrNetworkError(err) {
  if (err.name === 'TypeError') return true; // fetch throws TypeError on CORS/network failure
  return false;
}

/**
 * Load HIPs hazard data. Priority:
 *   1. localStorage cache (if < 1 hour old)
 *   2. Local snapshot (bundled static file)
 *   3. Live API (with CORS fallback to stale cache or snapshot)
 * @returns {Promise<{meta: Object, nodes: Array, edges: Array}>} Normalized hazard dataset
 */
export async function fetchHipsData() {
  // 1. Try localStorage cache
  const cached = readCache();
  if (cached) {
    console.log(`Using cached data: ${cached.nodes.length} nodes (${cached.meta?.source || 'cache'})`);
    return cached;
  }

  // 2. Try snapshot (bundled static file — no CORS issues)
  let snapshotData = null;
  try {
    const res = await fetch(SNAPSHOT_URL);
    if (res.ok) {
      const data = await res.json();
      if (data.nodes && data.edges) {
        validateData(data);
        snapshotData = data;
        console.log(`Loaded snapshot: ${data.nodes.length} nodes, ${data.edges.length} edges`);
        writeCache(data);
        return data;
      }
    }
  } catch (e) {
    console.warn('Snapshot not available, trying live API:', e.message);
  }

  // 3. Try live API (may be blocked by CORS/firewall)
  try {
    console.log('Fetching from live API...');
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const raw = await res.json();
    const result = transformRawApi(raw);
    validateData(result);
    writeCache(result);
    return result;
  } catch (e) {
    if (isCorsOrNetworkError(e)) {
      console.warn('Live API blocked (CORS/network):', e.message);
    } else {
      console.warn('Live API failed:', e.message);
    }

    // 4. Return snapshot if we partially loaded one
    if (snapshotData) return snapshotData;

    // 5. Try stale localStorage cache
    const stale = readStaleCache();
    if (stale) {
      console.warn('Using stale cached data as fallback');
      return stale;
    }

    // 6. Last resort: load the hard-coded bundled snapshot (baked into JS at build time)
    try {
      const bundled = await import('./hips-snapshot.json');
      const data = bundled.default || bundled;
      validateData(data);
      console.warn('Using bundled snapshot as last-resort fallback');
      writeCache(data);
      return data;
    } catch (importErr) {
      console.warn('Bundled snapshot also failed:', importErr.message);
    }

    throw new Error(
      'Unable to load hazard data. The data source may be blocked by your network. ' +
      'Try refreshing or accessing from a different network.'
    );
  }
}

/**
 * Read cache ignoring TTL — used as a last-resort fallback.
 * @returns {object|null}
 */
function readStaleCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    validateData(data);
    return data;
  } catch {
    return null;
  }
}

/**
 * Minimal client-side transform of raw JSON-LD API response into the snapshot format.
 * Used as a fallback when the pre-built snapshot is unavailable.
 * @param {Object} raw - Raw JSON-LD response from the PreventionWeb API
 * @returns {{meta: Object, nodes: Array, edges: Array}}
 */
function transformRawApi(raw) {
  const graph = raw['@graph'] || raw;
  const nodes = [];
  const edges = [];

  for (const item of graph) {
    const types = toArray(item['@type']);
    if (!types.includes('skos:Concept')) continue;

    const id = item['@id'];
    const broaders = toArray(item['skos:broader']);

    let typeId = null, typeName = null, clusterId = null, clusterName = null;
    for (const b of broaders) {
      if (typeof b !== 'object') continue;
      const bDctType = str(b['dct:type']);
      if (bDctType === 'type') { typeId = b['@id']; typeName = str(b['skos:prefLabel']); }
      else if (bDctType === 'cluster') { clusterId = b['@id']; clusterName = str(b['skos:prefLabel']); }
    }

    const causes = toArray(item['xkos:causes']).map(refId).filter(Boolean);
    const causedBy = toArray(item['xkos:causedBy']).map(refId).filter(Boolean);

    const scopeNotes = {};
    for (const note of toArray(item['skos:scopeNote'])) {
      const noteType = str(note?.['dct:type']);
      const noteValue = str(note);
      if (noteType && noteValue) scopeNotes[noteType] = noteValue;
    }

    nodes.push({
      id, label: str(item['skos:prefLabel']), identifier: str(item['dct:identifier']),
      definition: str(item['skos:definition']),
      altLabels: toArray(item['skos:altLabel']).map(str).filter(Boolean),
      typeId, typeName, clusterId, clusterName, scopeNotes, causes, causedBy,
      sources: [], quotedFrom: [], references: [], influencedBy: [],
      conformsTo: [], hasPart: [], related: [],
    });

    for (const target of causes) {
      edges.push({ source: id, target, type: 'causes' });
    }
  }

  return {
    meta: { source: API_URL, fetchedAt: new Date().toISOString(), nodeCount: nodes.length, edgeCount: edges.length },
    nodes, edges,
  };
}
