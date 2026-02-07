/**
 * Compute network-level insights/factoids from the snapshot data.
 * Pure computation — no DOM or Cytoscape dependencies.
 *
 * @param {Object} data - Snapshot data with nodes, edges
 * @returns {Object} Computed insights for the 9 factoid cards
 */
export function computeInsights(data) {
  const { nodes, edges } = data;
  const nodeById = new Map(nodes.map(n => [n.id, n]));

  // --- Degree map ---
  const degree = new Map();
  for (const n of nodes) degree.set(n.id, 0);
  for (const e of edges) {
    if (degree.has(e.source)) degree.set(e.source, degree.get(e.source) + 1);
    if (degree.has(e.target)) degree.set(e.target, degree.get(e.target) + 1);
  }

  // 1. Average degree
  const degrees = [...degree.values()];
  const totalDegree = degrees.reduce((s, d) => s + d, 0);
  const avgDegree = nodes.length ? totalDegree / nodes.length : 0;

  // Std dev for "near average" highlight
  const variance = degrees.reduce((s, d) => s + (d - avgDegree) ** 2, 0) / (nodes.length || 1);
  const stdDev = Math.sqrt(variance);
  const avgNodes = nodes
    .filter(n => Math.abs(degree.get(n.id) - avgDegree) <= stdDev)
    .map(n => n.id);

  // 2. Most connected hazard
  let mostConnected = { id: null, label: '', degree: 0, declaredDegree: 0 };
  for (const [id, deg] of degree) {
    if (deg > mostConnected.degree) {
      const n = nodeById.get(id);
      const declared = (n?.causes?.length || 0) + (n?.causedBy?.length || 0);
      mostConnected = { id, label: n?.label || id, degree: deg, declaredDegree: declared };
    }
  }

  // 3. Isolated hazards (degree 0)
  const isolatedNodes = nodes.filter(n => degree.get(n.id) === 0).map(n => n.id);

  // 4. Cross-type edge ratio
  let crossTypeCount = 0;
  const crossTypeEdgeIds = [];
  const crossTypeNodeIds = new Set();
  for (const e of edges) {
    const src = nodeById.get(e.source);
    const tgt = nodeById.get(e.target);
    if (src && tgt && src.typeName !== tgt.typeName) {
      crossTypeCount++;
      crossTypeEdgeIds.push(`edge:${e.source}->${e.target}`);
      crossTypeNodeIds.add(e.source);
      crossTypeNodeIds.add(e.target);
    }
  }
  const crossTypeRatio = edges.length ? crossTypeCount / edges.length : 0;

  // 5. Most connected type (by total edge count)
  const typeEdgeCount = new Map();
  for (const e of edges) {
    const src = nodeById.get(e.source);
    const tgt = nodeById.get(e.target);
    if (src?.typeName) typeEdgeCount.set(src.typeName, (typeEdgeCount.get(src.typeName) || 0) + 1);
    if (tgt?.typeName) typeEdgeCount.set(tgt.typeName, (typeEdgeCount.get(tgt.typeName) || 0) + 1);
  }
  let topType = { name: '', edgeCount: 0 };
  for (const [name, count] of typeEdgeCount) {
    if (count > topType.edgeCount) topType = { name, edgeCount: count };
  }
  const topTypeNodeIds = nodes.filter(n => n.typeName === topType.name).map(n => n.id);

  // 6. Densest cluster (internal edge density)
  const clusterNodes = new Map(); // clusterName -> [nodeIds]
  for (const n of nodes) {
    if (!n.clusterName) continue;
    if (!clusterNodes.has(n.clusterName)) clusterNodes.set(n.clusterName, []);
    clusterNodes.get(n.clusterName).push(n.id);
  }
  let densestCluster = { name: '', density: 0, nodeIds: [] };
  for (const [name, ids] of clusterNodes) {
    if (ids.length < 2) continue;
    const idSet = new Set(ids);
    let internal = 0;
    for (const e of edges) {
      if (idSet.has(e.source) && idSet.has(e.target)) internal++;
    }
    const maxEdges = ids.length * (ids.length - 1) / 2;
    const density = internal / maxEdges;
    if (density > densestCluster.density) {
      densestCluster = { name, density, nodeIds: ids };
    }
  }

  // 7. Declared/inferred edge analysis
  const causedBySet = new Map();
  for (const n of nodes) {
    causedBySet.set(n.id, new Set(n.causedBy || []));
  }

  let declaredEdgeCount = 0;
  const declaredDeg = new Map();
  for (const n of nodes) declaredDeg.set(n.id, 0);
  const inferredEdgeNodeIds = new Set();

  for (const e of edges) {
    const targetCausedBy = causedBySet.get(e.target);
    const isDeclared = targetCausedBy ? targetCausedBy.has(e.source) : false;
    if (isDeclared) {
      declaredEdgeCount++;
      if (declaredDeg.has(e.source)) declaredDeg.set(e.source, declaredDeg.get(e.source) + 1);
      if (declaredDeg.has(e.target)) declaredDeg.set(e.target, declaredDeg.get(e.target) + 1);
    } else {
      inferredEdgeNodeIds.add(e.source);
      inferredEdgeNodeIds.add(e.target);
    }
  }

  const reciprocationRate = edges.length ? declaredEdgeCount / edges.length : 0;

  // Average declared degree
  const totalDeclaredDegree = [...declaredDeg.values()].reduce((s, d) => s + d, 0);
  const avgDeclaredDegree = nodes.length ? totalDeclaredDegree / nodes.length : 0;

  // Inferred-only nodes: have graph connections but zero declared degree
  const inferredOnlyNodes = nodes
    .filter(n => degree.get(n.id) > 0 && declaredDeg.get(n.id) === 0)
    .map(n => n.id);

  // 8. Reference coverage
  const SOURCE_FIELDS = ['sources', 'quotedFrom', 'references', 'influencedBy', 'conformsTo'];
  const unreferencedNodes = [];
  let referencedCount = 0;
  for (const n of nodes) {
    const hasRef = SOURCE_FIELDS.some(f => n[f]?.length > 0);
    if (hasRef) {
      referencedCount++;
    } else {
      unreferencedNodes.push(n.id);
    }
  }
  const referenceCoverage = nodes.length ? referencedCount / nodes.length : 0;

  return {
    avgDegree,
    avgDeclaredDegree,
    stdDev,
    avgNodes,
    mostConnected,
    isolatedNodes,
    inferredOnlyNodes,
    reciprocationRate,
    inferredEdgeNodeIds: [...inferredEdgeNodeIds],
    crossTypeRatio,
    crossTypeEdgeIds,
    crossTypeNodeIds: [...crossTypeNodeIds],
    topType,
    topTypeNodeIds,
    densestCluster,
    referenceCoverage,
    unreferencedNodes,
  };
}
