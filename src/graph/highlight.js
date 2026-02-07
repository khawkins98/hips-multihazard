/**
 * @module graph/highlight
 * Shared highlight pattern for dimming/showing subsets of graph elements.
 */
import { HIGHLIGHT_CLASSES } from './constants.js';

/**
 * Apply the standard highlight pattern: clear previous highlights, dim all nodes,
 * hide all edges, then call the restore function to selectively un-dim/show elements.
 * @param {object} cy - Cytoscape instance
 * @param {function} restoreFn - Called within cy.batch() to un-dim nodes and show edges
 */
export function applyHighlightPattern(cy, restoreFn) {
  cy.elements().removeClass(HIGHLIGHT_CLASSES);
  cy.batch(() => {
    cy.nodes().addClass('dimmed');
    cy.edges().addClass('highlight-hidden');
    restoreFn(cy);
  });
}
