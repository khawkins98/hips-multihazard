/**
 * @module views/edge-bundling/interactions
 * Zoom, hover, and click interactions for the edge bundling view.
 * Synchronizes d3.zoom on SVG with canvas edge rendering.
 */
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';
import 'd3-transition'; // patches selection.transition()
import { polarToCartesian } from './layout.js';
import { esc } from '../../utils/dom.js';
import {
  LABEL_ZOOM_ALL_HIDDEN, LABEL_ZOOM_HUBS_VISIBLE, LABEL_ZOOM_ALL_VISIBLE,
  HUB_QUANTILE, LABEL_DEBOUNCE_MS,
} from './constants.js';

/**
 * Set up all interactions for the edge bundling view.
 * @param {object} params
 * @param {SVGElement} params.svg - SVG element
 * @param {object} params.svgOverlay - SVG overlay API
 * @param {Function} params.redrawEdges - Callback to redraw canvas edges with current state
 * @param {Map} params.adjacency - Node adjacency map
 * @param {Map} params.nodeById - Node data map
 * @param {Array} params.leaves - Hierarchy leaf nodes
 * @param {object} params.bus - Event bus
 * @param {Function} params.isPathfinderActive - Returns true if pathfinder mode is active
 * @returns {object} Interaction API with cleanup and zoom methods
 */
export function setupInteractions({
  svg, svgOverlay, redrawEdges, adjacency, nodeById, leaves, bus, isPathfinderActive,
}) {
  const svgSel = select(svg);
  const svgRect = svg.getBoundingClientRect();
  const centerX = svgRect.width / 2;
  const centerY = svgRect.height / 2;
  const initialTransform = zoomIdentity.translate(centerX, centerY);
  let currentTransform = initialTransform;
  let hoveredNodeId = null;
  let selectedNodeId = null;
  let highlightedNodes = null;
  let highlightedEdgeKeys = null;

  // Compute hub threshold (top 20% by connectionCount)
  const sortedConns = leaves
    .map(l => l.data.connectionCount || 0)
    .filter(c => c > 0)
    .sort((a, b) => a - b);
  const hubThreshold = sortedConns[Math.floor(sortedConns.length * HUB_QUANTILE)] || 1;

  // Create tooltip element
  const tooltip = createTooltip(svg.parentElement);

  // Debounced label visibility update (must be declared before zoom setup,
  // because setting the initial transform fires the zoom handler synchronously)
  let labelTimeout = null;
  function debouncedLabelUpdate() {
    clearTimeout(labelTimeout);
    labelTimeout = setTimeout(updateLabelVisibility, LABEL_DEBOUNCE_MS);
  }

  function updateLabelVisibility() {
    const k = currentTransform.k;
    if (highlightedNodes) {
      svgOverlay.showLabelsFor(highlightedNodes);
    } else if (k < LABEL_ZOOM_ALL_HIDDEN) {
      svgOverlay.setLabelVisibility('none', hubThreshold);
    } else if (k < LABEL_ZOOM_HUBS_VISIBLE) {
      svgOverlay.setLabelVisibility('none', hubThreshold);
    } else if (k < LABEL_ZOOM_ALL_VISIBLE) {
      svgOverlay.setLabelVisibility('hubs', hubThreshold);
    } else {
      svgOverlay.setLabelVisibility('all', hubThreshold);
    }
  }

  // ---- Zoom behavior ----
  const zoomBehavior = d3Zoom()
    .scaleExtent([0.3, 8])
    .on('zoom', (event) => {
      currentTransform = event.transform;
      svgOverlay.g.attr('transform', currentTransform.toString());
      redrawEdges(getTransformForCanvas());
      debouncedLabelUpdate();
    });

  svgSel.call(zoomBehavior);
  // Set initial transform to center the radial layout
  svgSel.call(zoomBehavior.transform, initialTransform);

  // Initial label state
  updateLabelVisibility();

  // ---- Node interactions ----
  const nodeEls = svgSel.selectAll('.eb-node');

  nodeEls.on('mouseenter', function (event, d) {
    const nodeId = d.data.name;
    hoveredNodeId = nodeId;

    // Show tooltip regardless of selection state
    const nodeData = nodeById.get(nodeId);
    if (nodeData) {
      const cc = (nodeData.causes?.length || 0) + (nodeData.causedBy?.length || 0);
      tooltip.show(
        `<strong>${esc(nodeData.label)}</strong><br>` +
        `<span class="tt-type">${esc(nodeData.typeName || '')}</span>` +
        (nodeData.clusterName ? ` · ${esc(nodeData.clusterName)}` : '') +
        `<br><span class="tt-conns">${cc} causal link${cc !== 1 ? 's' : ''}</span>`,
        event
      );
    }

    // Skip highlight changes when a node is already selected (click-only when active)
    if (selectedNodeId) return;

    // Build highlight set: node + neighbors
    const neighbors = adjacency.get(nodeId) || new Set();
    const allIds = new Set([nodeId, ...neighbors]);
    highlightedNodes = allIds;
    highlightedEdgeKeys = null;

    svgOverlay.highlightNodes(allIds);
    svgOverlay.showLabelsFor(allIds);
    redrawEdges(getTransformForCanvas());
  });

  nodeEls.on('mousemove', function (event) {
    tooltip.move(event);
  });

  nodeEls.on('mouseleave', function () {
    hoveredNodeId = null;
    tooltip.hide();

    if (!selectedNodeId) {
      highlightedNodes = null;
      highlightedEdgeKeys = null;
      svgOverlay.highlightNodes(null);
      updateLabelVisibility();
      redrawEdges(getTransformForCanvas());
    }
  });

  nodeEls.on('click', function (event, d) {
    event.stopPropagation();
    const nodeId = d.data.name;

    if (isPathfinderActive()) {
      const nodeData = nodeById.get(nodeId);
      bus.emit('pathfinder:select', { id: nodeId, label: nodeData?.label || nodeId });
      return;
    }

    selectedNodeId = nodeId;
    const neighbors = adjacency.get(nodeId) || new Set();
    const allIds = new Set([nodeId, ...neighbors]);
    highlightedNodes = allIds;
    highlightedEdgeKeys = null;

    svgOverlay.highlightNodes(allIds);
    svgOverlay.showLabelsFor(allIds);
    redrawEdges(getTransformForCanvas());
    bus.emit('node:selected', { id: nodeId });
  });

  // ---- Type arc interactions ----
  const arcEls = svgSel.selectAll('.eb-type-arc');

  arcEls.on('mouseenter', function (event, d) {
    // Skip highlight changes when a node is already selected
    if (selectedNodeId) return;

    const typeName = d.typeName;
    // Highlight all nodes of this type and their edges
    const typeNodeIds = new Set();
    for (const leaf of leaves) {
      if (leaf.data.typeName === typeName) {
        typeNodeIds.add(leaf.data.name);
      }
    }
    highlightedNodes = typeNodeIds;
    highlightedEdgeKeys = null;
    svgOverlay.highlightNodes(typeNodeIds);
    svgOverlay.highlightTypeArcs(new Set([typeName]));
    redrawEdges(getTransformForCanvas());
  });

  arcEls.on('mouseleave', function () {
    if (!selectedNodeId) {
      highlightedNodes = null;
      highlightedEdgeKeys = null;
      svgOverlay.highlightNodes(null);
      svgOverlay.highlightTypeArcs(null);
      updateLabelVisibility();
      redrawEdges(getTransformForCanvas());
    }
  });

  arcEls.style('cursor', 'pointer');
  nodeEls.style('cursor', 'pointer');

  // ---- Background click to deselect ----
  svgSel.on('click', function (event) {
    if (event.target === svg || event.target.classList.contains('eb-bg')) {
      clearSelection();
      bus.emit('node:deselected');
    }
  });

  // ---- Utility ----
  function getTransformForCanvas() {
    return {
      x: currentTransform.x,
      y: currentTransform.y,
      k: currentTransform.k,
    };
  }

  function clearSelection() {
    selectedNodeId = null;
    highlightedNodes = null;
    highlightedEdgeKeys = null;
    svgOverlay.highlightNodes(null);
    svgOverlay.highlightTypeArcs(null);
    updateLabelVisibility();
    redrawEdges(getTransformForCanvas());
  }

  return {
    /**
     * Get current zoom transform for canvas sync.
     */
    getTransform: getTransformForCanvas,

    /** Get current highlighted node IDs (for canvas rendering). */
    getHighlightedNodes() { return highlightedNodes; },

    /** Get current highlighted edge keys (for canvas rendering). */
    getHighlightedEdgeKeys() { return highlightedEdgeKeys; },

    /**
     * Programmatically highlight specific nodes.
     * @param {Set<string>|null} nodeIds
     */
    highlight(nodeIds) {
      highlightedNodes = nodeIds;
      highlightedEdgeKeys = null;
      if (nodeIds) {
        svgOverlay.highlightNodes(nodeIds);
        svgOverlay.showLabelsFor(nodeIds);
      } else {
        svgOverlay.highlightNodes(null);
        updateLabelVisibility();
      }
      redrawEdges(getTransformForCanvas());
    },

    /**
     * Programmatically highlight specific edges by their source->target keys.
     * @param {Set<string>|null} edgeKeys - "source->target" keys
     * @param {Set<string>|null} nodeIds - Associated node IDs to highlight
     */
    highlightEdges(edgeKeys, nodeIds) {
      highlightedEdgeKeys = edgeKeys;
      highlightedNodes = nodeIds;
      if (nodeIds) {
        svgOverlay.highlightNodes(nodeIds);
        svgOverlay.showLabelsFor(nodeIds);
      } else {
        svgOverlay.highlightNodes(null);
        updateLabelVisibility();
      }
      redrawEdges(getTransformForCanvas());
    },

    /**
     * Clear all highlights.
     */
    clearHighlights: clearSelection,

    /**
     * Focus on a specific node (zoom + select).
     * @param {string} nodeId
     */
    focusNode(nodeId) {
      const leaf = svgOverlay.leafMap.get(nodeId);
      if (!leaf) return;

      const pos = polarToCartesian(leaf.x, leaf.y);
      const targetK = 2.5;

      const targetTransform = zoomIdentity
        .translate(centerX, centerY)
        .scale(targetK)
        .translate(-pos.x, -pos.y);

      svgSel.transition()
        .duration(400)
        .call(zoomBehavior.transform, targetTransform);

      // Select the node after transition
      setTimeout(() => {
        selectedNodeId = nodeId;
        const neighbors = adjacency.get(nodeId) || new Set();
        const allIds = new Set([nodeId, ...neighbors]);
        highlightedNodes = allIds;
        highlightedEdgeKeys = null;
        svgOverlay.highlightNodes(allIds);
        svgOverlay.showLabelsFor(allIds);
        redrawEdges(getTransformForCanvas());
        bus.emit('node:selected', { id: nodeId });
      }, 420);
    },

    /**
     * Zoom to fit all content.
     */
    fit() {
      svgSel.transition()
        .duration(300)
        .call(zoomBehavior.transform, initialTransform);
    },

    /**
     * Zoom in by a factor.
     */
    zoomIn() {
      svgSel.transition()
        .duration(200)
        .call(zoomBehavior.scaleBy, 1.3);
    },

    /**
     * Zoom out by a factor.
     */
    zoomOut() {
      svgSel.transition()
        .duration(200)
        .call(zoomBehavior.scaleBy, 1 / 1.3);
    },

    /**
     * Reset view (zoom fit + clear highlights).
     */
    reset() {
      clearSelection();
      this.fit();
    },

    /**
     * Clean up event listeners.
     */
    destroy() {
      svgSel.on('.zoom', null);
      nodeEls.on('mouseenter', null).on('mouseleave', null).on('click', null).on('mousemove', null);
      arcEls.on('mouseenter', null).on('mouseleave', null);
      tooltip.remove();
      clearTimeout(labelTimeout);
    },
  };
}

/**
 * Create a tooltip element.
 * @param {HTMLElement} container
 * @returns {object} Tooltip API
 */
function createTooltip(container) {
  const el = document.createElement('div');
  el.className = 'graph-tooltip';
  container.appendChild(el);

  return {
    show(html, event) {
      el.innerHTML = html;
      el.style.display = 'block';
      this.move(event);
    },
    move(event) {
      const rect = container.getBoundingClientRect();
      let x = event.clientX - rect.left + 12;
      let y = event.clientY - rect.top - 10;
      // Clamp so tooltip stays within container
      const tw = el.offsetWidth;
      const th = el.offsetHeight;
      if (x + tw > rect.width) x = event.clientX - rect.left - tw - 8;
      if (y + th > rect.height) y = rect.height - th - 4;
      if (y < 0) y = 4;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
    },
    hide() {
      el.style.display = 'none';
    },
    remove() {
      el.remove();
    },
  };
}
