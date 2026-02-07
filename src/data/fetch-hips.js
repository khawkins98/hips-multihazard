/**
 * @module data/fetch-hips
 * Fetches HIPs data from the local snapshot (preferred) or live API.
 * Falls back to a minimal client-side JSON-LD transform if the snapshot is unavailable.
 */
import { str, refId, toArray } from '../utils/jsonld.js';

const SNAPSHOT_URL = import.meta.env.BASE_URL + 'data/hips.json';
const API_URL = 'https://www.preventionweb.net/api/terms/hips';

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
        validateData(data);
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
  const result = transformRawApi(raw);
  validateData(result);
  return result;
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
