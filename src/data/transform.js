/**
 * Transforms snapshot data into Cytoscape elements (nodes + edges).
 * Supports compound node grouping by Type > Cluster > Hazard,
 * plus a "corridor" mode that aggregates edges between type groups.
 */
import { getTypeDef, HAZARD_TYPES } from './hazard-types.js';

/**
 * @param {Object} data - Snapshot data with nodes, edges, meta
 * @param {'type'|'cluster'|'flat'|'corridor'} grouping - Grouping mode
 * @returns {{ elements: Array, nodeDataMap: Map, corridorStats?: Map }}
 */
export function transformToElements(data, grouping = 'type') {
  if (grouping === 'corridor') {
    return buildCorridorElements(data);
  }

  const elements = [];
  const nodeDataMap = new Map(); // id -> full node data for detail panel

  const typeSet = new Set();
  const clusterSet = new Set();

  // First pass: collect types and clusters
  for (const node of data.nodes) {
    if (node.typeId && node.typeName) typeSet.add(JSON.stringify({ id: node.typeId, name: node.typeName }));
    if (node.clusterId && node.clusterName) clusterSet.add(JSON.stringify({ id: node.clusterId, name: node.clusterName, typeId: node.typeId }));
  }

  // Create compound parent nodes for types
  if (grouping === 'type' || grouping === 'cluster') {
    for (const raw of typeSet) {
      const { id, name } = JSON.parse(raw);
      const typeDef = getTypeDef(name);
      elements.push({
        group: 'nodes',
        data: {
          id: `type:${id}`,
          label: name,
          isCompound: true,
          compoundType: 'type',
          color: typeDef.color,
        },
      });
    }
  }

  // Create compound parent nodes for clusters
  if (grouping === 'cluster') {
    for (const raw of clusterSet) {
      const { id, name, typeId } = JSON.parse(raw);
      elements.push({
        group: 'nodes',
        data: {
          id: `cluster:${id}`,
          label: name,
          parent: `type:${typeId}`,
          isCompound: true,
          compoundType: 'cluster',
        },
      });
    }
  }

  // Build set of valid node IDs for edge filtering
  const validNodeIds = new Set(data.nodes.map(n => n.id));

  // Create hazard nodes
  for (const node of data.nodes) {
    const typeDef = getTypeDef(node.typeName);
    const connectionCount = (node.causes?.length || 0) + (node.causedBy?.length || 0);

    let parent = undefined;
    if (grouping === 'cluster' && node.clusterId) {
      parent = `cluster:${node.clusterId}`;
    } else if (grouping === 'type' && node.typeId) {
      parent = `type:${node.typeId}`;
    }

    elements.push({
      group: 'nodes',
      data: {
        id: node.id,
        label: node.label,
        parent,
        color: typeDef.color,
        typeName: node.typeName || 'Unknown',
        clusterName: node.clusterName || '',
        connectionCount,
        identifier: node.identifier,
        isCompound: false,
      },
    });

    nodeDataMap.set(node.id, node);
  }

  // Create edges (only for valid node pairs)
  for (const edge of data.edges) {
    if (!validNodeIds.has(edge.source) || !validNodeIds.has(edge.target)) continue;
    elements.push({
      group: 'edges',
      data: {
        id: `edge:${edge.source}->${edge.target}`,
        source: edge.source,
        target: edge.target,
        edgeType: edge.type,
      },
    });
  }

  return { elements, nodeDataMap };
}

/**
 * Build corridor-mode elements: 8 type meta-nodes with weighted aggregate edges.
 * @param {Object} data - Snapshot data
 * @returns {{ elements: Array, nodeDataMap: Map, corridorStats: Map }}
 */
function buildCorridorElements(data) {
  const elements = [];
  const nodeDataMap = new Map();

  // Build node→type lookup
  const nodeTypeMap = new Map();
  const typeCounts = new Map();
  for (const node of data.nodes) {
    const typeName = node.typeName || 'Unknown';
    nodeTypeMap.set(node.id, typeName);
    typeCounts.set(typeName, (typeCounts.get(typeName) || 0) + 1);
  }

  // Aggregate edges by type pair
  const pairCounts = new Map(); // "srcType→tgtType" -> count
  for (const edge of data.edges) {
    const srcType = nodeTypeMap.get(edge.source);
    const tgtType = nodeTypeMap.get(edge.target);
    if (!srcType || !tgtType) continue;
    const key = `${srcType}\u2192${tgtType}`;
    pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
  }

  // Find max weight for style mapping
  let maxWeight = 1;
  for (const w of pairCounts.values()) {
    if (w > maxWeight) maxWeight = w;
  }

  // Create 8 meta-nodes
  for (const [typeName, count] of typeCounts) {
    const typeDef = getTypeDef(typeName);
    const id = `corridor:${typeName}`;
    elements.push({
      group: 'nodes',
      data: {
        id,
        label: typeDef.short,
        fullTypeName: typeName,
        hazardCount: count,
        color: typeDef.color,
        isCorridor: true,
        isCompound: false,
      },
    });
    nodeDataMap.set(id, { id, label: typeDef.short, typeName, hazardCount: count });
  }

  // Create weighted corridor edges
  for (const [key, weight] of pairCounts) {
    const [srcType, tgtType] = key.split('\u2192');
    const srcDef = getTypeDef(srcType);
    const tgtDef = getTypeDef(tgtType);
    const isSelf = srcType === tgtType;
    elements.push({
      group: 'edges',
      data: {
        id: `corridor-edge:${srcType}\u2192${tgtType}`,
        source: `corridor:${srcType}`,
        target: `corridor:${tgtType}`,
        weight,
        maxWeight,
        label: String(weight),
        sourceTypeName: srcDef.short,
        targetTypeName: tgtDef.short,
        sourceFullType: srcType,
        targetFullType: tgtType,
        isCorridor: true,
        selfLoop: isSelf,
      },
    });
  }

  // Build corridorStats for the detail panel
  const corridorStats = new Map();
  for (const [typeName] of typeCounts) {
    corridorStats.set(typeName, { outbound: [], inbound: [], intra: 0 });
  }
  for (const [key, weight] of pairCounts) {
    const [srcType, tgtType] = key.split('\u2192');
    if (srcType === tgtType) {
      corridorStats.get(srcType).intra = weight;
    } else {
      corridorStats.get(srcType).outbound.push({ type: tgtType, count: weight });
      corridorStats.get(tgtType).inbound.push({ type: srcType, count: weight });
    }
  }
  // Sort by count descending
  for (const stats of corridorStats.values()) {
    stats.outbound.sort((a, b) => b.count - a.count);
    stats.inbound.sort((a, b) => b.count - a.count);
  }

  return { elements, nodeDataMap, corridorStats };
}
