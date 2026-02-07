/**
 * Fetches the HIPs API data and writes an optimized snapshot to public/data/hips.json
 * Run: npm run snapshot
 */
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { str, refId, toArray } from '../src/utils/jsonld.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_URL = 'https://www.preventionweb.net/api/terms/hips';
const OUT_PATH = join(__dirname, '..', 'public', 'data', 'hips.json');

/**
 * Fetch the full HIPs JSON-LD dataset from PreventionWeb, extract hazard nodes
 * and causal edges, and write the optimized snapshot to public/data/hips.json.
 */
async function fetchAndTransform() {
  console.log(`Fetching from ${API_URL}...`);
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  const raw = await res.json();

  const graph = raw['@graph'] || raw;
  console.log(`Received ${graph.length} items`);

  const nodes = [];
  const edges = [];
  const typeMap = new Map();
  const clusterMap = new Map();

  for (const item of graph) {
    const id = item['@id'];
    const types = toArray(item['@type']);

    // Skip non-Concept items (ConceptScheme, Collection, etc.)
    if (!types.includes('skos:Concept')) continue;

    // Determine hazard type and cluster from skos:broader
    const broaders = toArray(item['skos:broader']);

    let typeId = null;
    let typeName = null;
    let clusterId = null;
    let clusterName = null;

    for (const b of broaders) {
      if (typeof b !== 'object') continue;
      const bId = b['@id'];
      const bDctType = str(b['dct:type']);
      const bLabel = str(b['skos:prefLabel']);

      if (bDctType === 'type') {
        typeId = bId;
        typeName = bLabel;
      } else if (bDctType === 'cluster') {
        clusterId = bId;
        clusterName = bLabel;
      }
    }

    // Parse scope notes
    const scopeNotes = {};
    for (const note of toArray(item['skos:scopeNote'])) {
      const noteType = str(note?.['dct:type']);
      const noteValue = str(note);
      if (noteType && noteValue) {
        scopeNotes[noteType] = noteValue;
      }
    }

    // Parse causes/causedBy
    const causes = toArray(item['xkos:causes']).map(refId).filter(Boolean);
    const causedBy = toArray(item['xkos:causedBy']).map(refId).filter(Boolean);

    // Parse link fields
    const getLinks = (field) => toArray(item[field]).map(v => refId(v) || str(v)).filter(Boolean);

    // Parse alt labels
    const altLabels = toArray(item['skos:altLabel']).map(str).filter(Boolean);

    // Track types and clusters
    if (typeId && typeName) typeMap.set(typeId, typeName);
    if (clusterId && clusterName) clusterMap.set(clusterId, { name: clusterName, typeId });

    nodes.push({
      id,
      label: str(item['skos:prefLabel']),
      identifier: str(item['dct:identifier']),
      definition: str(item['skos:definition']),
      altLabels,
      typeId,
      typeName,
      clusterId,
      clusterName,
      scopeNotes,
      causes,
      causedBy,
      sources: getLinks('dct:source'),
      quotedFrom: getLinks('prov:wasQuotedFrom'),
      references: getLinks('dct:references'),
      influencedBy: getLinks('prov:wasInfluencedBy'),
      conformsTo: getLinks('dct:conformsTo'),
      hasPart: getLinks('dct:hasPart'),
      related: getLinks('skos:related'),
      versionInfo: str(item['owl:versionInfo']),
      rights: str(item['dct:rights']),
    });

    // Create edges from causes
    for (const target of causes) {
      edges.push({ source: id, target, type: 'causes' });
    }
  }

  const snapshot = {
    meta: {
      source: API_URL,
      fetchedAt: new Date().toISOString(),
      nodeCount: nodes.length,
      edgeCount: edges.length,
      types: Object.fromEntries(typeMap),
      clusters: Object.fromEntries(
        [...clusterMap.entries()].map(([k, v]) => [k, v])
      ),
    },
    nodes,
    edges,
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(snapshot));

  const sizeMB = (Buffer.byteLength(JSON.stringify(snapshot)) / 1024 / 1024).toFixed(2);
  console.log(`Written ${OUT_PATH}`);
  console.log(`  ${nodes.length} nodes, ${edges.length} edges`);
  console.log(`  ${typeMap.size} types, ${clusterMap.size} clusters`);
  console.log(`  ${sizeMB} MB`);
}

fetchAndTransform().catch(err => {
  console.error('Snapshot failed:', err);
  process.exit(1);
});
