/**
 * Cytoscape graph initialization and management.
 */
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import dagre from 'cytoscape-dagre';
import { getStylesheet } from './styles.js';
import { getLayout } from './layouts.js';
import { setupInteractions, setInteractionMode } from './interactions.js';

// Register layout extensions
cytoscape.use(fcose);
cytoscape.use(dagre);

let cy = null;
let currentMode = 'type';

/**
 * Initialize the Cytoscape graph.
 * @param {Array} elements - Cytoscape elements (nodes + edges)
 * @param {object} bus - Event bus
 * @returns {object} Cytoscape instance
 */
export function initGraph(elements, bus) {
  cy = cytoscape({
    container: document.getElementById('cy'),
    elements,
    style: getStylesheet(),
    layout: getLayout('fcose'),
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

  // Hide all edges by default (show on interaction)
  cy.edges().addClass('hidden');

  setupInteractions(cy, bus);

  // Listen for layout change requests
  bus.on('layout:change', ({ name }) => {
    if (currentMode === 'corridor') return; // layout locked in corridor mode
    runLayout(name);
  });

  // Listen for edge visibility toggle
  bus.on('edges:toggle', ({ visible }) => {
    if (currentMode === 'corridor') return; // edges always visible in corridor mode
    if (visible) {
      cy.edges().removeClass('hidden');
    } else {
      cy.edges().addClass('hidden');
    }
  });

  // Listen for type filter changes
  bus.on('filter:types', ({ hiddenTypes }) => {
    cy.batch(() => {
      if (currentMode === 'corridor') {
        // In corridor mode, hide corridor nodes by fullTypeName
        cy.nodes('[?isCorridor]').forEach((node) => {
          if (hiddenTypes.has(node.data('fullTypeName'))) {
            node.addClass('hidden');
          } else {
            node.removeClass('hidden');
          }
        });
        // Hide edges where source or target is hidden
        cy.edges('[?isCorridor]').forEach((edge) => {
          const src = cy.getElementById(edge.data('source'));
          const tgt = cy.getElementById(edge.data('target'));
          if (src.hasClass('hidden') || tgt.hasClass('hidden')) {
            edge.addClass('hidden');
          } else {
            edge.removeClass('hidden');
          }
        });
        return;
      }

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
    currentMode = mode;
    setInteractionMode(mode);
    cy.elements().remove();
    cy.add(newElements);

    if (mode === 'corridor') {
      // Edges always visible in corridor mode
      runLayout('corridor');
    } else {
      cy.edges().addClass('hidden');
      runLayout('fcose');
    }
  });

  return cy;
}

/**
 * Run a layout by name.
 */
export function runLayout(name) {
  if (!cy) return;
  const layout = cy.layout(getLayout(name));
  layout.run();
}

/**
 * Get the current Cytoscape instance.
 */
export function getCy() {
  return cy;
}
