/**
 * Layout configurations for Cytoscape.
 */
export const layouts = {
  fcose: {
    name: 'fcose',
    animate: true,
    animationDuration: 800,
    quality: 'default',
    randomize: true,
    // Compound node handling
    packComponents: true,
    // Node repulsion
    nodeRepulsion: 8000,
    idealEdgeLength: 80,
    edgeElasticity: 0.45,
    nestingFactor: 0.1,
    // Gravity
    gravity: 0.25,
    gravityRange: 3.8,
    gravityCompound: 1.5,
    gravityRangeCompound: 2.0,
    // Tiling for disconnected components
    tilingPaddingVertical: 20,
    tilingPaddingHorizontal: 20,
    // Performance
    numIter: 2500,
    fit: true,
    padding: 30,
  },

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

  corridor: {
    name: 'circle',
    animate: true,
    animationDuration: 800,
    spacingFactor: 1.5,
    startAngle: -Math.PI / 2,
    fit: true,
    padding: 60,
  },
};

/**
 * Get a layout config by name with optional overrides.
 */
export function getLayout(name, overrides = {}) {
  const base = layouts[name] || layouts.fcose;
  return { ...base, ...overrides };
}
