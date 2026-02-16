/**
 * @module ui/legend
 * Legend: color swatches for hazard types, edge style indicators.
 */
import { HAZARD_TYPES } from '../data/hazard-types.js';

/**
 * Populate the legend section.
 * @param {Array} nodes - Snapshot node data (to filter to present types)
 * @param {object} bus - Event bus
 */
export function initLegend(nodes, bus) {
  const container = document.getElementById('legend');

  const presentTypes = new Set(nodes.map(n => n.typeName).filter(Boolean));

  function renderLegend() {
    container.innerHTML = '';

    for (const [name, def] of Object.entries(HAZARD_TYPES)) {
      if (!presentTypes.has(name)) continue;

      const item = document.createElement('div');
      item.className = 'legend-item';

      const swatch = document.createElement('span');
      swatch.className = 'legend-node';
      swatch.style.background = def.color;

      const label = document.createElement('span');
      label.textContent = def.short;

      item.append(swatch, label);
      container.appendChild(item);
    }

    // Declared edge
    const declaredItem = document.createElement('div');
    declaredItem.className = 'legend-item';
    const declaredLine = document.createElement('span');
    declaredLine.className = 'legend-edge';
    const declaredLabel = document.createElement('span');
    declaredLabel.textContent = 'Declared causal link';
    declaredItem.append(declaredLine, declaredLabel);
    container.appendChild(declaredItem);

    // Inferred edge
    const inferredItem = document.createElement('div');
    inferredItem.className = 'legend-item';
    const inferredLine = document.createElement('span');
    inferredLine.className = 'legend-edge legend-edge-inferred';
    const inferredLabel = document.createElement('span');
    inferredLabel.textContent = 'Inferred causal link';
    inferredItem.append(inferredLine, inferredLabel);
    container.appendChild(inferredItem);
  }

  renderLegend();
}
