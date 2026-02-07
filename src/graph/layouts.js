/**
 * @module graph/layouts
 * Layout configurations for Cytoscape force-directed and hierarchical layouts.
 * Provides grouping-aware variants of fcose with tuned parameters.
 */

// Shared fcose base — high repulsion + long edges + weak gravity for readability
const fcoseBase = {
  name: 'fcose',
  animate: true,
  animationDuration: 800,
  quality: 'proof',
  randomize: false,
  packComponents: true,
  numIter: 5000,
  fit: true,
  padding: 40,
};

// Per-grouping overrides with parameter rationale:
const fcoseVariants = {
  type: {
    nodeRepulsion: 80000,      // High repulsion keeps type clusters well-separated
    idealEdgeLength: 350,      // Long edges prevent overlap between densely-connected types
    edgeElasticity: 0.08,      // Low elasticity allows edges to stretch without pulling clusters together
    nestingFactor: 0.12,       // Low nesting keeps children loosely bound inside type groups
    gravity: 0.04,             // Weak gravity lets the graph spread across the viewport
    gravityRange: 1.2,         // Moderate range prevents distant nodes from drifting off
    gravityCompound: 3.5,      // Strong compound gravity keeps children within type boundaries
    gravityRangeCompound: 4.0, // Wide compound range ensures all children feel the pull
    tilingPaddingVertical: 60,
    tilingPaddingHorizontal: 60,
  },
  cluster: {
    nodeRepulsion: 65000,      // Lower repulsion than type mode since clusters are smaller groups
    idealEdgeLength: 300,      // Shorter edges for tighter cluster grouping
    edgeElasticity: 0.06,      // Slightly stiffer edges to maintain cluster cohesion
    nestingFactor: 0.18,       // Higher nesting factor for the two-level hierarchy (type > cluster)
    gravity: 0.03,             // Weaker gravity compensated by stronger compound gravity
    gravityRange: 1.0,
    gravityCompound: 4.5,      // Very strong to keep clusters visually distinct within types
    gravityRangeCompound: 5.0, // Wide range to reach all cluster members
    tilingPaddingVertical: 50,
    tilingPaddingHorizontal: 50,
  },
  flat: {
    nodeRepulsion: 90000,      // Highest repulsion — no grouping structure to constrain layout
    idealEdgeLength: 380,      // Longest edges for maximum readability with 281 loose nodes
    edgeElasticity: 0.1,       // Higher elasticity since there are no compound boundaries
    nestingFactor: 0.1,        // Minimal — no compound nodes in flat mode
    gravity: 0.06,             // Stronger gravity prevents the graph from expanding unbounded
    gravityRange: 1.5,         // Wider range gathers outlier nodes
    gravityCompound: 1.0,      // Inactive — no compound nodes
    gravityRangeCompound: 1.0,
    tilingPaddingVertical: 70,
    tilingPaddingHorizontal: 70,
  },
};

/**
 * Get a grouping-aware fcose layout config.
 * @param {'type'|'cluster'|'flat'} grouping
 */
export function getFcoseLayout(grouping = 'type') {
  const variant = fcoseVariants[grouping] || fcoseVariants.type;
  return { ...fcoseBase, ...variant };
}

export const layouts = {
  fcose: { ...fcoseBase, ...fcoseVariants.type },

  dagre: {
    name: 'dagre',
    animate: true,
    animationDuration: 800,
    rankDir: 'TB',
    rankSep: 80,
    nodeSep: 30,
    edgeSep: 10,
    fit: true,
    padding: 30,
  },

  concentric: {
    name: 'concentric',
    animate: true,
    animationDuration: 800,
    concentric(node) {
      return node.data('connectionCount') || 0;
    },
    levelWidth() {
      return 3;
    },
    minNodeSpacing: 30,
    fit: true,
    padding: 30,
  },

};

/**
 * Get a layout config by name with optional overrides.
 */
export function getLayout(name, overrides = {}) {
  const base = layouts[name] || layouts.fcose;
  return { ...base, ...overrides };
}
