/**
 * @module views/cascade/cascade
 * Main orchestrator for the cascade (causal chain) explorer view.
 * Shows a bidirectional expandable tree: effects rightward, triggers leftward.
 */
import { buildAdjacencyIndex, buildCascadeTree } from './cascade-data.js';
import { renderCascade } from './cascade-render.js';
import { DEFAULT_DEPTH, MAX_DEPTH } from './constants.js';

/**
 * Create and manage the cascade view.
 * @param {HTMLElement} container - The graph container element
 * @param {object} data - Snapshot data
 * @param {object} bus - Event bus
 * @returns {object} View API
 */
export function createCascadeView(container, data, bus) {
  let svg = null;
  let renderer = null;
  let currentRootId = null;
  let active = false;

  // Build adjacency indices once
  const { effectsIndex, triggersIndex, nodeById } = buildAdjacencyIndex(data);

  /**
   * Initialize the view with an optional root node.
   * @param {{ rootId?: string }} opts
   */
  function init(opts = {}) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('cascade-svg');
    container.appendChild(svg);

    const rect = container.getBoundingClientRect();
    svg.setAttribute('width', rect.width);
    svg.setAttribute('height', rect.height);

    if (opts.rootId) {
      renderTree(opts.rootId);
    } else {
      showPlaceholder();
    }
  }

  function showPlaceholder() {
    if (!svg) return;
    const rect = container.getBoundingClientRect();
    svg.innerHTML = `
      <text x="${rect.width / 2}" y="${rect.height / 2}"
            text-anchor="middle" fill="var(--text-muted)" font-size="14px">
        Select a hazard to explore its causal cascade
      </text>
    `;
  }

  function renderTree(rootId) {
    currentRootId = rootId;
    const rootNode = nodeById.get(rootId);
    if (!rootNode) return;

    // Build trees for both directions
    const visited = new Set();
    const effectsTree = buildCascadeTree(effectsIndex, nodeById, rootId, DEFAULT_DEPTH, new Set(visited));
    const triggersTree = buildCascadeTree(triggersIndex, nodeById, rootId, DEFAULT_DEPTH, new Set(visited));

    renderer = renderCascade(svg, effectsTree, triggersTree, rootNode, {
      onNodeClick(id) {
        bus.emit('node:selected', { id });
      },
      onGhostClick(id) {
        // Re-root the tree on the ghost node
        renderTree(id);
      },
      onExpand(id, direction) {
        // Re-render with expanded node
        // For simplicity, re-root on the clicked node
        renderTree(id);
      },
    });
  }

  // Listen for cascade:open events
  bus.on('cascade:open', ({ rootId }) => {
    if (active && rootId) {
      renderTree(rootId);
    }
  });

  // Listen for node:selected to update cascade if active
  bus.on('node:selected', ({ id }) => {
    if (active && id !== currentRootId) {
      // Don't auto-rerender - let user choose via "Explore Cascade" button
    }
  });

  return {
    type: 'cascade',

    activate(opts = {}) {
      active = true;
      init(opts);
    },

    deactivate() {
      active = false;
      renderer = null;
      if (svg) svg.remove();
      svg = null;
    },

    destroy() {
      this.deactivate();
    },

    focusNode(nodeId) {
      if (active) renderTree(nodeId);
    },

    filterTypes() { /* Not applicable to cascade */ },
    setEdgeVisibility() { /* Not applicable to cascade */ },

    highlightNodes() { /* Not applicable to cascade */ },
    highlightEdges() { /* Not applicable to cascade */ },
    clearHighlights() { /* Not applicable to cascade */ },

    zoomIn() { renderer?.zoomIn?.(); },
    zoomOut() { renderer?.zoomOut?.(); },
    fit() { renderer?.fit?.(); },
    reset() { renderer?.reset?.(); },

    resize() {
      if (!active || !svg) return;
      const rect = container.getBoundingClientRect();
      svg.setAttribute('width', rect.width);
      svg.setAttribute('height', rect.height);
      if (currentRootId) renderTree(currentRootId);
    },
  };
}

