/**
 * @module data/centrality
 * Compute centrality metrics (betweenness, PageRank, closeness) for all nodes.
 * Uses Cytoscape.js built-in graph algorithms.
 */

/**
 * Compute centrality metrics for all non-compound nodes.
 * @param {object} cy - Cytoscape instance
 * @returns {Map<string, object>} Map of nodeId -> { betweenness, pageRank, closeness, betweennessRank, pageRankRank, closenessRank }
 */
export function computeCentrality(cy) {
  const nodes = cy.nodes('[!isCompound]');
  const elements = cy.elements().filter('[!isCompound]');
  const metrics = new Map();

  // Betweenness centrality
  const bc = elements.betweennessCentrality({ directed: true });

  // PageRank
  const pr = elements.pageRank({ dampingFactor: 0.85 });

  // Collect raw values
  nodes.forEach(node => {
    const id = node.id();
    metrics.set(id, {
      betweenness: bc.betweenness(node),
      pageRank: pr.rank(node),
      closeness: 0,
    });
  });

  // Closeness centrality: average shortest path distance from each node
  // Using dijkstra from each node (directed)
  nodes.forEach(node => {
    const dijkstra = elements.dijkstra({
      root: node,
      directed: true,
      weight: () => 1,
    });
    let totalDist = 0;
    let reachable = 0;
    nodes.forEach(other => {
      if (other.id() === node.id()) return;
      const d = dijkstra.distanceTo(other);
      if (d !== Infinity && isFinite(d)) {
        totalDist += d;
        reachable++;
      }
    });
    const m = metrics.get(node.id());
    m.closeness = reachable > 0 ? reachable / totalDist : 0;
  });

  // Compute ranks for each metric
  addRanks(metrics, 'betweenness', 'betweennessRank');
  addRanks(metrics, 'pageRank', 'pageRankRank');
  addRanks(metrics, 'closeness', 'closenessRank');

  return metrics;
}

/**
 * Add integer rank values for a given metric key.
 * Rank 1 = highest value.
 */
function addRanks(metrics, valueKey, rankKey) {
  const entries = [...metrics.entries()].sort((a, b) => b[1][valueKey] - a[1][valueKey]);
  entries.forEach(([, m], i) => {
    m[rankKey] = i + 1;
  });
}
