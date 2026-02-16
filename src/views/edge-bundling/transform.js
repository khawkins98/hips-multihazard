/**
 * @module views/edge-bundling/transform
 * Converts snapshot data into a d3.hierarchy tree and flat edge array
 * for the radial hierarchical edge bundling view.
 *
 * Tree structure:
 *   root
 *     Type (8, ordered by TYPE_ORDER)
 *       Cluster (sorted alphabetically)
 *         Hazard (sorted by connectionCount descending)
 */
import { TYPE_ORDER } from './constants.js';
import { getTypeDef } from '../../data/hazard-types.js';

/**
 * Build the hierarchy tree and edge list from snapshot data.
 * @param {object} data - Snapshot data with nodes and edges arrays
 * @param {Set<string>} [hiddenTypes] - Set of type names to exclude
 * @param {{ visible: boolean, declaredOnly: boolean }} [edgeOpts] - Edge visibility options
 * @returns {{ tree: object, edges: Array, nodeById: Map, adjacency: Map }}
 */
export function buildHierarchy(data, hiddenTypes = new Set(), edgeOpts = { visible: true, declaredOnly: false }) {
  const nodeById = new Map();
  const connectionCount = new Map();

  // Pre-compute connection counts
  for (const node of data.nodes) {
    const cc = (node.causes?.length || 0) + (node.causedBy?.length || 0);
    connectionCount.set(node.id, cc);
    nodeById.set(node.id, node);
  }

  // Build causedBy lookup for declared/inferred check
  const causedBySet = new Map();
  for (const node of data.nodes) {
    causedBySet.set(node.id, new Set(node.causedBy || []));
  }

  // Group nodes by type > cluster
  const typeMap = new Map(); // typeName -> Map<clusterName, Array<node>>
  for (const typeName of TYPE_ORDER) {
    typeMap.set(typeName, new Map());
  }

  for (const node of data.nodes) {
    const typeName = node.typeName || 'Unknown';
    if (hiddenTypes.has(typeName)) continue;
    if (!typeMap.has(typeName)) typeMap.set(typeName, new Map());

    const clusterName = node.clusterName || 'Unclustered';
    const clusterMap = typeMap.get(typeName);
    if (!clusterMap.has(clusterName)) clusterMap.set(clusterName, []);
    clusterMap.get(clusterName).push(node);
  }

  // Build the tree object for d3.hierarchy
  const children = [];
  for (const typeName of TYPE_ORDER) {
    const clusterMap = typeMap.get(typeName);
    if (!clusterMap || clusterMap.size === 0) continue;

    const typeDef = getTypeDef(typeName);
    const clusterChildren = [];

    // Sort clusters alphabetically
    const sortedClusters = [...clusterMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    for (const [clusterName, nodes] of sortedClusters) {
      // Sort hazards by connectionCount descending
      const sorted = [...nodes].sort((a, b) =>
        (connectionCount.get(b.id) || 0) - (connectionCount.get(a.id) || 0)
      );

      const hazardChildren = sorted.map(node => ({
        name: node.id,
        label: node.label,
        typeName,
        clusterName,
        color: typeDef.color,
        connectionCount: connectionCount.get(node.id) || 0,
        identifier: node.identifier,
      }));

      clusterChildren.push({
        name: `cluster:${typeName}:${clusterName}`,
        label: clusterName,
        typeName,
        color: typeDef.color,
        children: hazardChildren,
      });
    }

    children.push({
      name: `type:${typeName}`,
      label: typeName,
      typeName,
      color: typeDef.color,
      children: clusterChildren,
    });
  }

  const tree = { name: 'root', children };

  // Build edge array with declared/inferred flag
  const validIds = new Set();
  for (const node of data.nodes) {
    if (!hiddenTypes.has(node.typeName)) validIds.add(node.id);
  }

  const edges = [];
  for (const edge of data.edges) {
    if (!validIds.has(edge.source) || !validIds.has(edge.target)) continue;

    const targetCausedBy = causedBySet.get(edge.target);
    const declared = targetCausedBy ? targetCausedBy.has(edge.source) : false;

    if (edgeOpts.declaredOnly && !declared) continue;

    edges.push({
      source: edge.source,
      target: edge.target,
      declared,
    });
  }

  // Build adjacency map for interactions (O(1) neighbor lookup)
  const adjacency = new Map(); // nodeId -> Set<nodeId>
  for (const edge of edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
    adjacency.get(edge.source).add(edge.target);
    adjacency.get(edge.target).add(edge.source);
  }

  return { tree, edges, nodeById, adjacency };
}
