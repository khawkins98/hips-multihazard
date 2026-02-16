/**
 * @module views/edge-bundling/layout
 * Radial cluster layout using d3.cluster().
 * Positions leaves on the circumference with gaps between types and clusters.
 * Computes type arc segments and cluster sub-arcs from leaf positions.
 */
import { cluster as d3Cluster, hierarchy as d3Hierarchy } from 'd3-hierarchy';
import { TYPE_GAP_MULTIPLIER, CLUSTER_GAP_MULTIPLIER } from './constants.js';

/**
 * Compute the radial layout for the hierarchy tree.
 * @param {object} treeData - Raw tree object (root > type > cluster > hazard)
 * @param {number} radius - Radius of the circle for leaf placement
 * @returns {{ root: object, leaves: Array, typeArcs: Map, clusterArcs: Map }}
 */
export function computeRadialLayout(treeData, radius) {
  const root = d3Hierarchy(treeData);

  // Custom separation function: wider gaps between types, moderate between clusters
  const layout = d3Cluster()
    .size([360, radius])
    .separation((a, b) => {
      if (a.parent === b.parent) return 1;
      // Different clusters within same type
      if (a.parent?.parent === b.parent?.parent) return CLUSTER_GAP_MULTIPLIER;
      // Different types
      return TYPE_GAP_MULTIPLIER;
    });

  layout(root);

  const leaves = root.leaves();

  // Compute type arcs from leaf positions
  const typeArcs = new Map();
  for (const typeNode of root.children || []) {
    const typeLeaves = typeNode.leaves();
    if (typeLeaves.length === 0) continue;

    const angles = typeLeaves.map(l => l.x);
    const minAngle = Math.min(...angles);
    const maxAngle = Math.max(...angles);

    // Add half the gap on each side for the arc extent
    const leafSpacing = typeLeaves.length > 1
      ? (maxAngle - minAngle) / (typeLeaves.length - 1)
      : 2;
    const padding = leafSpacing * 0.5;

    typeArcs.set(typeNode.data.typeName, {
      startAngle: minAngle - padding,
      endAngle: maxAngle + padding,
      centerAngle: (minAngle + maxAngle) / 2,
      color: typeNode.data.color,
      label: typeNode.data.label,
      nodeCount: typeLeaves.length,
    });
  }

  // Compute cluster arcs from leaf positions
  const clusterArcs = new Map();
  for (const typeNode of root.children || []) {
    for (const clusterNode of typeNode.children || []) {
      const clusterLeaves = clusterNode.leaves();
      if (clusterLeaves.length === 0) continue;

      const angles = clusterLeaves.map(l => l.x);
      const minAngle = Math.min(...angles);
      const maxAngle = Math.max(...angles);

      clusterArcs.set(clusterNode.data.name, {
        startAngle: minAngle,
        endAngle: maxAngle,
        centerAngle: (minAngle + maxAngle) / 2,
        color: typeNode.data.color,
        label: clusterNode.data.label,
        nodeCount: clusterLeaves.length,
      });
    }
  }

  return { root, leaves, typeArcs, clusterArcs };
}

/**
 * Convert polar coordinates (angle in degrees, radius) to cartesian (x, y).
 * d3.cluster positions use: x = angle in degrees, y = radius
 * @param {number} angle - Angle in degrees
 * @param {number} radius - Distance from center
 * @returns {{ x: number, y: number }}
 */
export function polarToCartesian(angle, radius) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: radius * Math.cos(rad),
    y: radius * Math.sin(rad),
  };
}
