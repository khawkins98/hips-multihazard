/**
 * Layout configurations for Cytoscape.
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

// Per-grouping overrides: type groups need compound cohesion,
// cluster mode needs stronger nesting, flat needs maximum spread
const fcoseVariants = {
  type: {
    nodeRepulsion: 80000,
    idealEdgeLength: 350,
    edgeElasticity: 0.08,
    nestingFactor: 0.12,
    gravity: 0.04,
    gravityRange: 1.2,
    gravityCompound: 3.5,
    gravityRangeCompound: 4.0,
    tilingPaddingVertical: 60,
    tilingPaddingHorizontal: 60,
  },
  cluster: {
    nodeRepulsion: 65000,
    idealEdgeLength: 300,
    edgeElasticity: 0.06,
    nestingFactor: 0.18,
    gravity: 0.03,
    gravityRange: 1.0,
    gravityCompound: 4.5,
    gravityRangeCompound: 5.0,
    tilingPaddingVertical: 50,
    tilingPaddingHorizontal: 50,
  },
  flat: {
    nodeRepulsion: 90000,
    idealEdgeLength: 380,
    edgeElasticity: 0.1,
    nestingFactor: 0.1,
    gravity: 0.06,
    gravityRange: 1.5,
    gravityCompound: 1.0,
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
