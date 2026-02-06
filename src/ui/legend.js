/**
 * Legend: color swatches for hazard types + edge type indicators.
 */
import { HAZARD_TYPES } from '../data/hazard-types.js';

/**
 * Populate the legend section.
 * @param {Array} nodes - Snapshot node data (to filter to present types)
 * @param {object} bus - Event bus
 */
export function initLegend(nodes, bus) {
  const container = document.getElementById('legend');

  // Determine which types actually have nodes
  const presentTypes = new Set(nodes.map(n => n.typeName).filter(Boolean));

  function renderDefaultLegend() {
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

    const edgeItem = document.createElement('div');
    edgeItem.className = 'legend-item';

    const edgeLine = document.createElement('span');
    edgeLine.className = 'legend-edge';

    const edgeLabel = document.createElement('span');
    edgeLabel.textContent = 'Causes / triggers';

    edgeItem.append(edgeLine, edgeLabel);
    container.appendChild(edgeItem);
  }

  function renderCorridorLegend() {
    container.innerHTML = '';

    // Node size legend
    const sizeItem = document.createElement('div');
    sizeItem.className = 'legend-item';
    const smallCircle = document.createElement('span');
    smallCircle.className = 'legend-node';
    smallCircle.style.background = '#666';
    smallCircle.style.width = '8px';
    smallCircle.style.height = '8px';
    const sizeLabel = document.createElement('span');
    sizeLabel.textContent = 'Node size = hazard count';
    sizeItem.append(smallCircle, sizeLabel);
    container.appendChild(sizeItem);

    // Edge width legend
    const widthItem = document.createElement('div');
    widthItem.className = 'legend-item';
    const thickLine = document.createElement('span');
    thickLine.className = 'legend-edge';
    thickLine.style.height = '4px';
    thickLine.style.background = '#5b9cf5';
    const widthLabel = document.createElement('span');
    widthLabel.textContent = 'Edge width = causal link count';
    widthItem.append(thickLine, widthLabel);
    container.appendChild(widthItem);
  }

  // Initial render
  renderDefaultLegend();

  // Listen for mode changes
  bus.on('grouping:change', ({ mode }) => {
    if (mode === 'corridor') {
      renderCorridorLegend();
    } else {
      renderDefaultLegend();
    }
  });
}
