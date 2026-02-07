/**
 * @module graph/graph
 * Cytoscape graph initialization and management.
 * Creates the graph instance and registers all bus event handlers.
 * @listens hyperroute:highlight
 * @listens khop:change
 * @listens insight:highlight
 * @listens flow:highlight
 * @listens layout:change
 * @listens edges:toggle
 * @listens filter:types
 * @listens grouping:change
 * @emits hyperspace:routes
 */
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import dagre from 'cytoscape-dagre';
import { getStylesheet } from './styles.js';
import { getLayout, getFcoseLayout } from './layouts.js';
import { getHyperspaceLayout, initHyperRouteLabels } from './hyperspace-layout.js';
import { setupInteractions, highlightKHopNeighborhood } from './interactions.js';
import { initSemanticZoom } from './semantic-zoom.js';
import { HIGHLIGHT_CLASSES } from './constants.js';
import { applyHighlightPattern } from './highlight.js';

// Register layout extensions
cytoscape.use(fcose);
cytoscape.use(dagre);

let cy = null;
let currentGrouping = 'type';
let currentLayout = 'hyperspace';
let labelManager = null;

/**
 * Handle hyper-route highlight requests from legend/label clicks.
 */
function handleHyperRouteHighlight(cy, { route }) {
  if (!route) {
    cy.elements().removeClass(HIGHLIGHT_CLASSES);
    return;
  }
  applyHighlightPattern(cy, () => {
    for (const edgeId of route.edgeIds) {
      const edge = cy.getElementById(edgeId);
      if (edge && !edge.empty()) {
        edge.removeClass('highlight-hidden').addClass('highlighted');
      }
    }
    for (const nodeId of route.bridgeNodes) {
      const node = cy.getElementById(nodeId);
      if (node && !node.empty()) {
        node.removeClass('dimmed').addClass('highlighted');
        node.ancestors().removeClass('dimmed');
      }
    }
  });
}

/**
 * Handle insight highlight requests from insights panel.
 */
function handleInsightHighlight(cy, { nodeIds, edgeFilter, clear }) {
  if (clear) {
    cy.elements().removeClass(HIGHLIGHT_CLASSES);
    return;
  }
  const idSet = new Set(nodeIds || []);
  applyHighlightPattern(cy, () => {
    for (const id of idSet) {
      const node = cy.getElementById(id);
      if (node && !node.empty()) {
        node.removeClass('dimmed').addClass('highlighted');
        node.ancestors().removeClass('dimmed');
      }
    }
    if (edgeFilter === 'cross-type') {
      cy.edges().forEach((edge) => {
        const src = cy.getElementById(edge.data('source'));
        const tgt = cy.getElementById(edge.data('target'));
        if (src.data('typeName') !== tgt.data('typeName')) {
          edge.removeClass('highlight-hidden').addClass('highlighted');
        }
      });
    } else if (edgeFilter === 'inferred') {
      cy.edges().forEach((edge) => {
        if (!edge.data('declared')) {
          edge.removeClass('highlight-hidden').addClass('highlighted');
        }
      });
      cy.edges('.highlighted').connectedNodes().forEach((node) => {
        node.removeClass('dimmed').addClass('highlighted');
        node.ancestors().removeClass('dimmed');
      });
    } else if (idSet.size > 0) {
      cy.edges().forEach((edge) => {
        if (idSet.has(edge.data('source')) && idSet.has(edge.data('target'))) {
          edge.removeClass('highlight-hidden').addClass('highlighted');
        }
      });
    }
  });
}

/**
 * Handle flow matrix highlight requests.
 */
function handleFlowHighlight(cy, { edges: flowEdges, clear }) {
  if (clear) {
    cy.elements().removeClass(HIGHLIGHT_CLASSES);
    return;
  }
  const sourceTargetSet = new Set(flowEdges.map(e => `${e.source}→${e.target}`));
  applyHighlightPattern(cy, () => {
    cy.edges().forEach(edge => {
      const key = `${edge.data('source')}→${edge.data('target')}`;
      if (sourceTargetSet.has(key)) {
        edge.removeClass('highlight-hidden').addClass('highlighted');
        const src = cy.getElementById(edge.data('source'));
        const tgt = cy.getElementById(edge.data('target'));
        if (src && !src.empty()) {
          src.removeClass('dimmed').addClass('highlighted');
          src.ancestors().removeClass('dimmed');
        }
        if (tgt && !tgt.empty()) {
          tgt.removeClass('dimmed').addClass('highlighted');
          tgt.ancestors().removeClass('dimmed');
        }
      }
    });
  });
}

/**
 * Handle layout change requests.
 */
function handleLayoutChange(cy, bus, { name }) {
  if (currentLayout === 'hyperspace' && name !== 'hyperspace') {
    clearHyperRouteClasses(cy);
    cy.scratch('hyperRoutes', null);
    cy.nodes('[?isCompound]').removeClass('compound-invisible');
  }
  currentLayout = name;
  if (name === 'hyperspace') {
    cy.nodes('[?isCompound]').addClass('compound-invisible');
  }
  runLayout(name, bus);
}

/**
 * Handle edge visibility toggle.
 */
function handleEdgesToggle(cy, bus, { visible, declaredOnly }) {
  cy.batch(() => {
    if (!visible) {
      cy.edges().addClass('hidden');
    } else if (declaredOnly) {
      cy.edges().forEach((edge) => {
        if (edge.data('declared')) {
          edge.removeClass('hidden');
        } else {
          edge.addClass('hidden');
        }
      });
    } else {
      cy.edges().removeClass('hidden');
    }
  });
  runLayout(currentLayout, bus);
}

/**
 * Handle type filter changes.
 */
function handleFilterTypes(cy, { hiddenTypes }) {
  cy.batch(() => {
    cy.nodes('[!isCompound]').forEach((node) => {
      const typeName = node.data('typeName');
      if (hiddenTypes.has(typeName)) {
        node.addClass('hidden');
      } else {
        node.removeClass('hidden');
      }
    });

    cy.nodes('[?isCompound][compoundType="type"]').forEach((compound) => {
      const children = compound.children().filter(n => !n.hasClass('hidden'));
      if (children.length === 0) {
        compound.addClass('hidden');
      } else {
        compound.removeClass('hidden');
      }
    });

    cy.edges().forEach((edge) => {
      const src = cy.getElementById(edge.data('source'));
      const tgt = cy.getElementById(edge.data('target'));
      if (src.hasClass('hidden') || tgt.hasClass('hidden')) {
        edge.addClass('hidden');
      }
    });
  });
}

/**
 * Handle grouping mode changes.
 */
function handleGroupingChange(cy, bus, { mode, elements: newElements }) {
  currentGrouping = mode;
  clearHyperRouteClasses(cy);
  cy.scratch('hyperRoutes', null);
  cy.elements().remove();
  cy.add(newElements);
  const edgeToggle = document.getElementById('edge-toggle');
  const declaredToggle = document.getElementById('edge-declared-toggle');
  if (edgeToggle && !edgeToggle.checked) {
    cy.edges().addClass('hidden');
  } else if (declaredToggle && declaredToggle.checked) {
    cy.edges().forEach((edge) => {
      if (!edge.data('declared')) edge.addClass('hidden');
    });
  }
  currentLayout = 'hyperspace';
  cy.nodes('[?isCompound]').addClass('compound-invisible');
  runLayout('hyperspace', bus);
}

/**
 * Initialize the Cytoscape graph.
 * @param {Array} elements - Cytoscape elements (nodes + edges)
 * @param {object} bus - Event bus
 * @returns {object} Cytoscape instance
 */
export function initGraph(elements, bus) {
  const initialLayoutOpts = getHyperspaceLayout(elements);

  cy = cytoscape({
    container: document.getElementById('cy'),
    elements,
    style: getStylesheet(),
    layout: initialLayoutOpts,
    minZoom: 0.1,
    maxZoom: 5,
    wheelSensitivity: 0.3,
    boxSelectionEnabled: false,
    textureOnViewport: true,
    hideEdgesOnViewport: true,
    hideLabelsOnViewport: false,
  });

  setupInteractions(cy, bus);
  initSemanticZoom(cy, bus);
  labelManager = initHyperRouteLabels(cy, bus);

  cy.nodes('[?isCompound]').addClass('compound-invisible');

  if (initialLayoutOpts._hyperRoutes) {
    const routes = initialLayoutOpts._hyperRoutes;
    cy.one('layoutstop', () => {
      cy.scratch('hyperRoutes', routes);
      applyHyperRoutes(cy, bus);
    });
  }

  // Register bus listeners — each delegates to a named handler
  bus.on('hyperroute:highlight', (data) => handleHyperRouteHighlight(cy, data));
  bus.on('khop:change', ({ nodeId, hops }) => {
    const node = cy.getElementById(nodeId);
    if (node && !node.empty()) highlightKHopNeighborhood(cy, node, hops);
  });
  bus.on('insight:highlight', (data) => handleInsightHighlight(cy, data));
  bus.on('flow:highlight', (data) => handleFlowHighlight(cy, data));
  bus.on('layout:change', (data) => handleLayoutChange(cy, bus, data));
  bus.on('edges:toggle', (data) => handleEdgesToggle(cy, bus, data));
  bus.on('filter:types', (data) => handleFilterTypes(cy, data));
  bus.on('grouping:change', (data) => handleGroupingChange(cy, bus, data));

  return cy;
}

/**
 * Run a layout by name.
 */
export function runLayout(name, bus) {
  if (!cy) return;
  let opts;
  if (name === 'hyperspace') {
    opts = getHyperspaceLayout(cy);
  } else if (name === 'fcose') {
    opts = getFcoseLayout(currentGrouping);
  } else {
    opts = getLayout(name);
  }

  // For hyperspace, apply hyper-route data after layout completes
  if (name === 'hyperspace' && opts._hyperRoutes) {
    const routes = opts._hyperRoutes;
    cy.one('layoutstop', () => {
      cy.scratch('hyperRoutes', routes);
      applyHyperRoutes(cy, bus);
    });
  }

  // Run on visible elements so hidden edges don't influence force computation
  const layout = cy.elements(':visible').layout(opts);
  layout.run();
}

/**
 * Apply hyper-route classes to edges and bridge nodes, emit event.
 */
export function applyHyperRoutes(cy, bus) {
  const routes = cy.scratch('hyperRoutes');
  if (!routes || routes.length === 0) {
    bus.emit('hyperspace:routes', { routes: [] });
    return;
  }

  // Collect all hyper-route edge IDs and bridge node IDs
  const allEdgeIds = new Set();
  const allBridgeIds = new Set();
  // Map edge IDs to their route's edge count for strength mapping
  const edgeStrengthMap = new Map();

  for (const route of routes) {
    for (const edgeId of route.edgeIds) {
      allEdgeIds.add(edgeId);
      edgeStrengthMap.set(edgeId, route.edgeCount);
    }
    for (const nodeId of route.bridgeNodes) {
      allBridgeIds.add(nodeId);
    }
  }

  cy.batch(() => {
    // Apply routeStrength data + class to qualifying edges
    for (const edgeId of allEdgeIds) {
      const edge = cy.getElementById(edgeId);
      if (edge && !edge.empty()) {
        edge.data('routeStrength', edgeStrengthMap.get(edgeId));
        edge.addClass('hyper-route');
      }
    }

    // Apply class to bridge nodes
    for (const nodeId of allBridgeIds) {
      const node = cy.getElementById(nodeId);
      if (node && !node.empty()) {
        node.addClass('hyper-route-node');
      }
    }
  });

  // Create floating labels
  if (labelManager) {
    labelManager.createLabels();
  }

  // Emit routes for legend
  bus.emit('hyperspace:routes', { routes });
}

/**
 * Clear hyper-route classes from all elements.
 */
export function clearHyperRouteClasses(cy) {
  cy.batch(() => {
    cy.edges('.hyper-route').removeClass('hyper-route').removeData('routeStrength');
    cy.nodes('.hyper-route-node').removeClass('hyper-route-node');
  });
  if (labelManager) {
    labelManager.clearLabels();
  }
}

/**
 * Get the current Cytoscape instance.
 */
export function getCy() {
  return cy;
}

/**
 * Reset module state. Test-only API.
 * @private
 */
export function _reset() {
  cy = null;
  currentGrouping = 'type';
  currentLayout = 'hyperspace';
  labelManager = null;
}
