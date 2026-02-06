/**
 * Fetches HIPs data from the local snapshot (preferred) or live API.
 */
const SNAPSHOT_URL = import.meta.env.BASE_URL + 'data/hips.json';
const API_URL = 'https://www.preventionweb.net/api/terms/hips';

/**
 * Load HIPs hazard data, trying the local snapshot first and falling back to the live API.
 * @returns {Promise<{meta: Object, nodes: Array, edges: Array}>} Normalized hazard dataset
 */
export async function fetchHipsData() {
  // Try snapshot first
  try {
    const res = await fetch(SNAPSHOT_URL);
    if (res.ok) {
      const data = await res.json();
      if (data.nodes && data.edges) {
        console.log(`Loaded snapshot: ${data.nodes.length} nodes, ${data.edges.length} edges`);
        return data;
      }
    }
  } catch (e) {
    console.warn('Snapshot not available, falling back to API:', e.message);
  }

  // Fall back to live API
  console.log('Fetching from live API...');
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  const raw = await res.json();

  // Do a minimal client-side transform (the snapshot.js script does this more thoroughly)
  return transformRawApi(raw);
}

/** Extract a plain string from a JSON-LD value ({@language, @value} or string). */
function str(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (val['@value']) return val['@value'];
  return '';
}

/** Extract the @id URI from a JSON-LD reference ({@id} or string). */
function refId(val) {
  if (!val) return null;
  if (typeof val === 'string') return val;
  return val['@id'] || null;
}

/** Normalize a value to an array (handles null, single value, or existing array). */
function toArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
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
