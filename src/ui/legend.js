/**
 * Legend: color swatches for hazard types + edge type indicators.
 */
import { HAZARD_TYPES } from '../data/hazard-types.js';

/**
 * Populate the legend section.
 * @param {Array} nodes - Snapshot node data (to filter to present types)
 */
export function initLegend(nodes) {
  const container = document.getElementById('legend');

  // Determine which types actually have nodes
  const presentTypes = new Set(nodes.map(n => n.typeName).filter(Boolean));

  // Type color legend
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

  // Edge legend
  const edgeItem = document.createElement('div');
  edgeItem.className = 'legend-item';

  const edgeLine = document.createElement('span');
  edgeLine.className = 'legend-edge';

  const edgeLabel = document.createElement('span');
  edgeLabel.textContent = 'Causes / triggers';

  edgeItem.append(edgeLine, edgeLabel);
  container.appendChild(edgeItem);
}
