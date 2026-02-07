/**
 * @module graph/semantic-zoom
 * Semantic zoom — progressively reveal labels based on zoom level.
 *
 * Levels:
 *   macro  (zoom < 0.4)  — all individual labels hidden, compound labels remain
 *   meso   (0.4–1.2)     — hub nodes (top 20% by connectivity) show labels
 *   micro  (zoom > 1.2)  — all labels visible
 *
 * @listens (cy zoom event)
 * @listens grouping:change
 */
import { debounce } from '../utils/debounce.js';
import { MACRO_THRESHOLD, MESO_THRESHOLD, HUB_QUANTILE, SEMANTIC_ZOOM_DEBOUNCE_MS } from './constants.js';

const SZ_CLASSES = ['sz-label-hidden', 'sz-hub-label', 'sz-label-visible'];
const SZ_EDGE_CLASSES = ['sz-edge-macro', 'sz-edge-meso', 'sz-edge-micro'];

let hubMinConnections = 0;
let currentLevel = null;

/**
 * Compute the connectivity threshold for hub nodes (top 20%).
 * @param {object} cy - Cytoscape instance
 * @returns {number} Minimum connection count for a node to be considered a hub
 */
function computeHubThreshold(cy) {
  const counts = [];
  cy.nodes('[!isCompound]').forEach((n) => {
    counts.push(n.data('connectionCount') || 0);
  });
  if (counts.length === 0) return 0;

  counts.sort((a, b) => a - b);
  const idx = Math.floor(counts.length * HUB_QUANTILE);
  return counts[idx] || 0;
}

/**
 * Determine the semantic zoom level from a zoom value.
 * @param {number} zoom - Current zoom level
 * @returns {'macro'|'meso'|'micro'} Semantic zoom level
 */
function getLevel(zoom) {
  if (zoom < MACRO_THRESHOLD) return 'macro';
  if (zoom <= MESO_THRESHOLD) return 'meso';
  return 'micro';
}

/**
 * Apply semantic zoom classes based on the current level.
 * @param {object} cy - Cytoscape instance
 * @param {'macro'|'meso'|'micro'} level - Target zoom level
 */
function applyLevel(cy, level) {
  if (level === currentLevel) return;
  currentLevel = level;

  cy.batch(() => {
    const hazardNodes = cy.nodes('[!isCompound]');
    // Remove all sz classes first
    hazardNodes.removeClass(SZ_CLASSES.join(' '));

    // Apply zoom-scaled width classes to hyper-route edges
    const hrEdges = cy.edges('.hyper-route');
    if (hrEdges.length > 0) {
      hrEdges.removeClass(SZ_EDGE_CLASSES.join(' '));
      hrEdges.addClass(`sz-edge-${level}`);
    }

    if (level === 'macro') {
      hazardNodes.addClass('sz-label-hidden');
    } else if (level === 'meso') {
      hazardNodes.forEach((n) => {
        const count = n.data('connectionCount') || 0;
        if (count >= hubMinConnections && hubMinConnections > 0) {
          n.addClass('sz-hub-label');
        } else {
          n.addClass('sz-label-hidden');
        }
      });
    } else {
      // micro — all visible
      hazardNodes.addClass('sz-label-visible');
    }
  });
}

/**
 * Initialize semantic zoom on the Cytoscape instance.
 * @param {object} cy - Cytoscape instance
 * @param {object} bus - Event bus
 */
export function initSemanticZoom(cy, bus) {
  hubMinConnections = computeHubThreshold(cy);

  // Apply initial level
  applyLevel(cy, getLevel(cy.zoom()));

  // Debounced zoom listener
  const onZoom = debounce(() => {
    applyLevel(cy, getLevel(cy.zoom()));
  }, SEMANTIC_ZOOM_DEBOUNCE_MS);

  cy.on('zoom', onZoom);

  // Recompute threshold when grouping changes (elements are swapped)
  bus.on('grouping:change', () => {
    // Defer to next tick so new elements are in place
    setTimeout(() => {
      hubMinConnections = computeHubThreshold(cy);
      currentLevel = null; // force reapply
      applyLevel(cy, getLevel(cy.zoom()));
    }, 0);
  });
}

/**
 * Reset module state. Test-only API.
 * @private
 */
export function _reset() {
  hubMinConnections = 0;
  currentLevel = null;
}
