/**
 * @module views/edge-bundling/canvas-edges
 * Canvas rendering of bundled Bezier edges for performance.
 * Uses d3.lineRadial + curveBundle for hierarchical edge bundling.
 */
import { lineRadial, curveBundle } from 'd3-shape';
import {
  EDGE_ALPHA_DECLARED, EDGE_ALPHA_INFERRED,
  EDGE_ALPHA_DIM, EDGE_ALPHA_HIGHLIGHT,
  EDGE_WIDTH, EDGE_WIDTH_HIGHLIGHT,
} from './constants.js';

/**
 * Pre-compute edge paths through the hierarchy.
 * Each edge path is the list of nodes from source to target via their
 * lowest common ancestor (using node.path(other)).
 * @param {object} root - d3.hierarchy root
 * @param {Array} edges - Array of { source, target, declared }
 * @returns {Array} Edge data with path control points
 */
export function precomputeEdgePaths(root, edges) {
  // Build leaf lookup: nodeId -> hierarchy leaf node
  const leafMap = new Map();
  for (const leaf of root.leaves()) {
    leafMap.set(leaf.data.name, leaf);
  }

  const edgePaths = [];
  for (const edge of edges) {
    const sourceLeaf = leafMap.get(edge.source);
    const targetLeaf = leafMap.get(edge.target);
    if (!sourceLeaf || !targetLeaf) continue;

    // node.path(target) returns the path from this node to target through the tree
    const path = sourceLeaf.path(targetLeaf);

    edgePaths.push({
      source: edge.source,
      target: edge.target,
      declared: edge.declared,
      path,
    });
  }

  return edgePaths;
}

/**
 * Create the canvas edge renderer.
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @returns {object} Renderer with draw methods
 */
export function createEdgeRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  // The line generator converts hierarchy path nodes to radial Bezier curves.
  // x = angle (radians), y = radius
  function createLineGen(tension) {
    return lineRadial()
      .curve(curveBundle.beta(tension))
      .angle(d => (d.x * Math.PI) / 180)
      .radius(d => d.y);
  }

  /**
   * Draw all edges on the canvas.
   * @param {Array} edgePaths - Pre-computed edge paths
   * @param {number} tension - Bundling tension (0-1)
   * @param {object} transform - Current zoom/pan { x, y, k }
   * @param {Set<string>|null} highlightedNodes - Node IDs to highlight, null for no highlight mode
   * @param {Set<string>|null} highlightedEdgeKeys - Edge keys "source->target" to highlight
   * @param {boolean} edgesVisible - Whether edges are visible at all
   */
  function draw(edgePaths, tension, transform, highlightedNodes, highlightedEdgeKeys, edgesVisible) {
    // Use CSS pixel dimensions (context already has DPR scaling from resize())
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    ctx.clearRect(0, 0, cssW, cssH);

    if (!edgesVisible || edgePaths.length === 0) return;

    const lineGen = createLineGen(tension);

    ctx.save();
    // transform.x/y already include center offset from d3-zoom's initial translate
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    const isHighlighting = highlightedNodes !== null || highlightedEdgeKeys !== null;

    if (isHighlighting) {
      // Two-pass rendering: dim pass first, then bright pass
      // Dim pass
      ctx.lineWidth = EDGE_WIDTH / transform.k;
      for (const edge of edgePaths) {
        const edgeKey = `${edge.source}->${edge.target}`;
        const isHighlighted = highlightedEdgeKeys
          ? highlightedEdgeKeys.has(edgeKey)
          : (highlightedNodes.has(edge.source) && highlightedNodes.has(edge.target));

        if (isHighlighted) continue; // Skip highlighted edges in dim pass

        ctx.globalAlpha = EDGE_ALPHA_DIM;
        ctx.strokeStyle = '#999';
        ctx.beginPath();
        lineGen.context(ctx)(edge.path);
        ctx.stroke();
      }

      // Bright pass
      for (const edge of edgePaths) {
        const edgeKey = `${edge.source}->${edge.target}`;
        const isHighlighted = highlightedEdgeKeys
          ? highlightedEdgeKeys.has(edgeKey)
          : (highlightedNodes.has(edge.source) && highlightedNodes.has(edge.target));

        if (!isHighlighted) continue;

        ctx.globalAlpha = EDGE_ALPHA_HIGHLIGHT;
        ctx.lineWidth = EDGE_WIDTH_HIGHLIGHT / transform.k;

        // Color edges by source type
        const sourceLeaf = edge.path[0];
        ctx.strokeStyle = sourceLeaf?.data?.color || '#999';

        if (!edge.declared) {
          ctx.setLineDash([4 / transform.k, 4 / transform.k]);
        } else {
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        lineGen.context(ctx)(edge.path);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else {
      // Normal rendering: all edges at their default alpha
      ctx.lineWidth = EDGE_WIDTH / transform.k;
      for (const edge of edgePaths) {
        const alpha = edge.declared ? EDGE_ALPHA_DECLARED : EDGE_ALPHA_INFERRED;
        ctx.globalAlpha = alpha;

        // Color by source type
        const sourceLeaf = edge.path[0];
        ctx.strokeStyle = sourceLeaf?.data?.color || '#999';

        if (!edge.declared) {
          ctx.setLineDash([3 / transform.k, 3 / transform.k]);
        } else {
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        lineGen.context(ctx)(edge.path);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    ctx.restore();
  }

  /**
   * Resize the canvas to match container dimensions.
   * @param {number} width
   * @param {number} height
   */
  function resize(width, height) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);
  }

  return { draw, resize, ctx };
}
