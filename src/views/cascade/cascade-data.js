/**
 * @module views/cascade/cascade-data
 * Adjacency index and lazy tree builder for the cascade explorer.
 * Builds effects (what it causes) and triggers (what causes it) indices.
 */
import { MAX_CHILDREN, MAX_DEPTH, MAX_NODES } from './constants.js';

/**
 * Build adjacency indices from snapshot data.
 * @param {object} data - Snapshot data with nodes and edges
 * @returns {{ effectsIndex: Map, triggersIndex: Map, nodeById: Map }}
 */
export function buildAdjacencyIndex(data) {
  const nodeById = new Map();
  for (const node of data.nodes) {
    nodeById.set(node.id, node);
  }

  // Build causedBy lookup for declared check
  const causedBySet = new Map();
  for (const node of data.nodes) {
    causedBySet.set(node.id, new Set(node.causedBy || []));
  }

  // effectsIndex: nodeId -> Array<{ id, declared }>
  const effectsIndex = new Map();
  // triggersIndex: nodeId -> Array<{ id, declared }>
  const triggersIndex = new Map();

  for (const edge of data.edges) {
    const targetCausedBy = causedBySet.get(edge.target);
    const declared = targetCausedBy ? targetCausedBy.has(edge.source) : false;

    // source causes target -> target is an effect of source
    if (!effectsIndex.has(edge.source)) effectsIndex.set(edge.source, []);
    effectsIndex.get(edge.source).push({ id: edge.target, declared });

    // target is caused by source -> source is a trigger of target
    if (!triggersIndex.has(edge.target)) triggersIndex.set(edge.target, []);
    triggersIndex.get(edge.target).push({ id: edge.source, declared });
  }

  // Sort each list by connectionCount descending
  for (const [, arr] of effectsIndex) {
    arr.sort((a, b) => {
      const aNode = nodeById.get(a.id);
      const bNode = nodeById.get(b.id);
      const aCc = (aNode?.causes?.length || 0) + (aNode?.causedBy?.length || 0);
      const bCc = (bNode?.causes?.length || 0) + (bNode?.causedBy?.length || 0);
      return bCc - aCc;
    });
  }

  for (const [, arr] of triggersIndex) {
    arr.sort((a, b) => {
      const aNode = nodeById.get(a.id);
      const bNode = nodeById.get(b.id);
      const aCc = (aNode?.causes?.length || 0) + (aNode?.causedBy?.length || 0);
      const bCc = (bNode?.causes?.length || 0) + (bNode?.causedBy?.length || 0);
      return bCc - aCc;
    });
  }

  return { effectsIndex, triggersIndex, nodeById };
}

/**
 * Build a cascade tree from a root node in one direction.
 * @param {Map} index - effectsIndex or triggersIndex
 * @param {Map} nodeById - Node data map
 * @param {string} rootId - Root node ID
 * @param {number} maxDepth - Maximum depth to expand
 * @param {Set<string>} visited - Already visited node IDs (for cycle detection)
 * @returns {object} Tree node { id, label, typeName, color, connectionCount, children, ghost, truncated, totalChildren }
 */
export function buildCascadeTree(index, nodeById, rootId, maxDepth = 1, visited = new Set()) {
  const node = nodeById.get(rootId);
  if (!node) return null;

  const cc = (node.causes?.length || 0) + (node.causedBy?.length || 0);
  const isGhost = visited.has(rootId);

  const treeNode = {
    id: rootId,
    label: node.label || rootId,
    typeName: node.typeName || 'Unknown',
    clusterName: node.clusterName || '',
    connectionCount: cc,
    ghost: isGhost,
    children: [],
    truncated: 0,
    totalChildren: 0,
    expanded: false,
  };

  if (isGhost || maxDepth <= 0) return treeNode;

  visited.add(rootId);
  treeNode.expanded = true;

  const neighbors = index.get(rootId) || [];
  treeNode.totalChildren = neighbors.length;

  // Truncate to MAX_CHILDREN
  const shown = neighbors.slice(0, MAX_CHILDREN);
  treeNode.truncated = Math.max(0, neighbors.length - MAX_CHILDREN);

  for (const { id } of shown) {
    const child = buildCascadeTree(index, nodeById, id, maxDepth - 1, visited);
    if (child) treeNode.children.push(child);
  }

  return treeNode;
}
