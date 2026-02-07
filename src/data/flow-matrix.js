/**
 * @module data/flow-matrix
 * Compute a type-to-type flow matrix from edge data.
 * Counts directed edges from each hazard type to each other type.
 */

/**
 * Build the flow matrix from snapshot data.
 * @param {object} data - Snapshot data with nodes and edges arrays
 * @returns {{ typeNames: string[], matrix: number[][], edgeMap: Map<string, Array<{source, target}>> }}
 */
export function computeFlowMatrix(data) {
  // Build node -> typeName lookup
  const nodeType = new Map();
  for (const node of data.nodes) {
    nodeType.set(node.id, node.typeName);
  }

  // Collect unique type names in a stable order
  const typeNames = [...new Set(data.nodes.map(n => n.typeName))].filter(Boolean).sort();
  const typeIndex = new Map(typeNames.map((name, i) => [name, i]));
  const n = typeNames.length;

  // Initialize matrix and edge map
  const matrix = Array.from({ length: n }, () => Array(n).fill(0));
  const edgeMap = new Map(); // "row,col" -> [{source, target}]

  for (const edge of data.edges) {
    const srcType = nodeType.get(edge.source);
    const tgtType = nodeType.get(edge.target);
    if (!srcType || !tgtType) continue;

    const ri = typeIndex.get(srcType);
    const ci = typeIndex.get(tgtType);
    if (ri === undefined || ci === undefined) continue;

    matrix[ri][ci]++;

    const key = `${ri},${ci}`;
    if (!edgeMap.has(key)) edgeMap.set(key, []);
    edgeMap.get(key).push({ source: edge.source, target: edge.target });
  }

  return { typeNames, matrix, edgeMap };
}
