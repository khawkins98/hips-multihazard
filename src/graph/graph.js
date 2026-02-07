/**
 * Cytoscape graph initialization and management.
 */
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import dagre from 'cytoscape-dagre';
import { getStylesheet } from './styles.js';
import { getLayout, getFcoseLayout } from './layouts.js';
import { getHyperspaceLayout, initHyperRouteLabels } from './hyperspace-layout.js';
import { setupInteractions } from './interactions.js';
import { initSemanticZoom } from './semantic-zoom.js';

// Register layout extensions
cytoscape.use(fcose);
cytoscape.use(dagre);

let cy = null;
let currentGrouping = 'type';
let currentLayout = 'hyperspace';
let labelManager = null;

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
    // Interaction defaults
    minZoom: 0.1,
    maxZoom: 5,
    wheelSensitivity: 0.3,
    boxSelectionEnabled: false,
    // Performance
    textureOnViewport: true,
    hideEdgesOnViewport: true,
    hideLabelsOnViewport: false,
  });

  setupInteractions(cy, bus);
  initSemanticZoom(cy, bus);
  labelManager = initHyperRouteLabels(cy, bus);

  // Hide compound group boxes in hyperspace — orbital sectors replace them
  cy.nodes('[?isCompound]').addClass('compound-invisible');

  // Apply hyper-routes for the initial hyperspace layout
  if (initialLayoutOpts._hyperRoutes) {
    const routes = initialLayoutOpts._hyperRoutes;
    cy.one('layoutstop', () => {
      cy.scratch('hyperRoutes', routes);
      applyHyperRoutes(cy, bus);
    });
  }

  // Listen for hyper-route highlight from legend clicks
  bus.on('hyperroute:highlight', ({ route }) => {
    if (!route) {
      // Clear highlight
      cy.elements().removeClass('dimmed highlighted');
      return;
    }
    // Dim everything, then highlight the route's edges and bridge nodes
    cy.elements().addClass('dimmed');
    cy.batch(() => {
      for (const edgeId of route.edgeIds) {
        const edge = cy.getElementById(edgeId);
        if (edge && !edge.empty()) {
          edge.removeClass('dimmed').addClass('highlighted');
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
  });

  // Listen for layout change requests
  bus.on('layout:change', ({ name }) => {
    // Clear hyper-route classes when switching away from hyperspace
    if (currentLayout === 'hyperspace' && name !== 'hyperspace') {
      clearHyperRouteClasses(cy);
      cy.scratch('hyperRoutes', null);
      // Restore compound group boxes for non-hyperspace layouts
      cy.nodes('[?isCompound]').removeClass('compound-invisible');
    }
    currentLayout = name;
    if (name === 'hyperspace') {
      cy.nodes('[?isCompound]').addClass('compound-invisible');
    }
    runLayout(name, bus);
  });

  // Listen for edge visibility toggle
  bus.on('edges:toggle', ({ visible }) => {
    if (visible) {
      cy.edges().removeClass('hidden');
    } else {
      cy.edges().addClass('hidden');
    }
  });

  // Listen for type filter changes
  bus.on('filter:types', ({ hiddenTypes }) => {
    cy.batch(() => {
      cy.nodes('[!isCompound]').forEach((node) => {
        const typeName = node.data('typeName');
        if (hiddenTypes.has(typeName)) {
          node.addClass('hidden');
        } else {
          node.removeClass('hidden');
        }
      });

      // Hide compound type nodes if all children hidden
      cy.nodes('[?isCompound][compoundType="type"]').forEach((compound) => {
        const children = compound.children().filter(n => !n.hasClass('hidden'));
        if (children.length === 0) {
          compound.addClass('hidden');
        } else {
          compound.removeClass('hidden');
        }
      });

      // Hide edges to/from hidden nodes
      cy.edges().forEach((edge) => {
        const src = cy.getElementById(edge.data('source'));
        const tgt = cy.getElementById(edge.data('target'));
        if (src.hasClass('hidden') || tgt.hasClass('hidden')) {
          edge.addClass('hidden');
        }
        // Don't remove hidden from filtered edges here — let edge toggle handle that
      });
    });
  });

  // Listen for grouping changes
  bus.on('grouping:change', ({ mode, elements: newElements }) => {
    currentGrouping = mode;
    clearHyperRouteClasses(cy);
    cy.scratch('hyperRoutes', null);
    cy.elements().remove();
    cy.add(newElements);
    // Sync edge visibility with the toggle state
    const edgeToggle = document.getElementById('edge-toggle');
    if (edgeToggle && !edgeToggle.checked) {
      cy.edges().addClass('hidden');
    }
    currentLayout = 'hyperspace';
    cy.nodes('[?isCompound]').addClass('compound-invisible');
    runLayout('hyperspace', bus);
  });

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

  const layout = cy.layout(opts);
  layout.run();
}

/**
 * Apply hyper-route classes to edges and bridge nodes, emit event.
 */
function applyHyperRoutes(cy, bus) {
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
function clearHyperRouteClasses(cy) {
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
