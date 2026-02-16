/**
 * @module views/edge-bundling/edge-bundling
 * Main orchestrator for the radial hierarchical edge bundling view.
 * Manages canvas + SVG layers, coordinates data transform, layout, and interactions.
 */
import { buildHierarchy } from './transform.js';
import { computeRadialLayout } from './layout.js';
import { precomputeEdgePaths, createEdgeRenderer } from './canvas-edges.js';
import { createSvgOverlay } from './svg-overlay.js';
import { setupInteractions } from './interactions.js';
import { DEFAULT_TENSION, RING_PADDING } from './constants.js';
import { isPathfinderActive } from '../../ui/path-finder.js';

/**
 * Create and manage the edge bundling view.
 * @param {HTMLElement} container - The graph container element
 * @param {object} data - Snapshot data
 * @param {object} bus - Event bus
 * @returns {object} View API (activate, deactivate, destroy, etc.)
 */
export function createEdgeBundlingView(container, data, bus) {
  let canvas = null;
  let svg = null;
  let edgeRenderer = null;
  let svgOverlay = null;
  let interactions = null;
  let edgePaths = [];
  let adjacency = new Map();
  let nodeById = new Map();
  let leaves = [];
  let tension = DEFAULT_TENSION;
  let edgesVisible = true;
  let hiddenTypes = new Set();
  let declaredOnly = false;
  let active = false;

  /**
   * Initialize the view: create DOM elements, compute layout, render.
   */
  function init() {
    // Create canvas element for edges
    canvas = document.createElement('canvas');
    canvas.className = 'eb-canvas';
    container.appendChild(canvas);

    // Create SVG element for nodes and arcs
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('eb-svg');
    container.appendChild(svg);

    edgeRenderer = createEdgeRenderer(canvas);
    rebuild();
  }

  /**
   * Rebuild the entire visualization from data (called on init and when filters change).
   */
  function rebuild() {
    const containerRect = container.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;

    if (width === 0 || height === 0) return;

    // Size canvas and SVG
    edgeRenderer.resize(width, height);
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);

    // Compute radius based on container size
    const radius = Math.min(width, height) / 2 - RING_PADDING;
    if (radius < 50) return;

    // Build hierarchy and layout
    const hierarchy = buildHierarchy(data, hiddenTypes, { visible: edgesVisible, declaredOnly });
    adjacency = hierarchy.adjacency;
    nodeById = hierarchy.nodeById;

    const layoutData = computeRadialLayout(hierarchy.tree, radius);
    leaves = layoutData.leaves;

    // Pre-compute edge paths
    edgePaths = precomputeEdgePaths(layoutData.root, hierarchy.edges);

    // Destroy old interactions
    if (interactions) interactions.destroy();

    // Create SVG overlay
    svgOverlay = createSvgOverlay(svg, layoutData, radius);

    // Apply type filter to SVG (hide filtered types)
    if (hiddenTypes.size > 0) {
      svgOverlay.filterTypes(hiddenTypes);
    }

    // Set up interactions
    interactions = setupInteractions({
      svg,
      svgOverlay,
      redrawEdges,
      adjacency,
      nodeById,
      leaves,
      bus,
      isPathfinderActive,
    });

    // Initial edge render
    redrawEdges(interactions.getTransform());
  }

  /**
   * Redraw edges on canvas with current state.
   * @param {{ x: number, y: number, k: number }} transform - Current zoom transform
   */
  function redrawEdges(transform) {
    if (!edgeRenderer) return;
    edgeRenderer.draw(
      edgePaths,
      tension,
      transform,
      interactions?.getHighlightedNodes?.() ?? null,
      interactions?.getHighlightedEdgeKeys?.() ?? null,
      edgesVisible,
    );
  }

  // ---- Public API ----
  return {
    type: 'web',

    activate() {
      active = true;
      init();
    },

    deactivate() {
      active = false;
      if (interactions) interactions.destroy();
      interactions = null;
      svgOverlay = null;
      edgeRenderer = null;
      if (canvas) canvas.remove();
      if (svg) svg.remove();
      canvas = null;
      svg = null;
    },

    destroy() {
      this.deactivate();
    },

    /** Update bundling tension. */
    setTension(t) {
      tension = t;
      if (interactions) {
        redrawEdges(interactions.getTransform());
      }
    },

    /** Handle type filter changes. */
    filterTypes(newHiddenTypes) {
      hiddenTypes = newHiddenTypes;
      if (active) rebuild();
    },

    /** Handle edge visibility toggle. */
    setEdgeVisibility(visible, declOnly) {
      edgesVisible = visible;
      declaredOnly = declOnly;
      if (active) rebuild();
    },

    /** Highlight specific nodes (from insights, flow matrix, etc.). */
    highlightNodes(nodeIds) {
      if (interactions) interactions.highlight(nodeIds);
    },

    /** Highlight specific edges. */
    highlightEdges(edgeKeys, nodeIds) {
      if (interactions) interactions.highlightEdges(edgeKeys, nodeIds);
    },

    /** Clear all highlights. */
    clearHighlights() {
      if (interactions) interactions.clearHighlights();
    },

    /** Focus on a specific node. */
    focusNode(nodeId) {
      if (interactions) interactions.focusNode(nodeId);
    },

    /** Zoom controls. */
    zoomIn() { if (interactions) interactions.zoomIn(); },
    zoomOut() { if (interactions) interactions.zoomOut(); },
    fit() { if (interactions) interactions.fit(); },
    reset() { if (interactions) interactions.reset(); },

    /** Handle container resize. */
    resize() {
      if (active) rebuild();
    },

    /** Get adjacency map (for pathfinder etc.). */
    getAdjacency() { return adjacency; },

    /** Get node data map. */
    getNodeById() { return nodeById; },
  };
}
