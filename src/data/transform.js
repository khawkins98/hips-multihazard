/**
 * @module data/transform
 * Transforms snapshot data into Cytoscape elements (nodes + edges).
 * Supports compound node grouping by Type > Cluster > Hazard.
 */
import { getTypeDef } from './hazard-types.js';

/**
 * @param {Object} data - Snapshot data with nodes, edges, meta
 * @param {'type'|'cluster'|'flat'} grouping - Grouping mode
 * @returns {{ elements: Array, nodeDataMap: Map }}
 */
export function transformToElements(data, grouping = 'type') {
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

  // Build causedBy lookup for reciprocation check
  const causedBySet = new Map();
  for (const node of data.nodes) {
    causedBySet.set(node.id, new Set(node.causedBy || []));
  }

  // Create edges (only for valid node pairs)
  // Mark each edge as declared (target acknowledges source in causedBy) or inferred
  for (const edge of data.edges) {
    if (!validNodeIds.has(edge.source) || !validNodeIds.has(edge.target)) continue;
    const targetCausedBy = causedBySet.get(edge.target);
    const declared = targetCausedBy ? targetCausedBy.has(edge.source) : false;
    elements.push({
      group: 'edges',
      data: {
        id: `edge:${edge.source}->${edge.target}`,
        source: edge.source,
        target: edge.target,
        edgeType: edge.type,
        declared,
      },
    });
  }

  return { elements, nodeDataMap };
}
