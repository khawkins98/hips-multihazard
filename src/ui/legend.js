/**
 * @module ui/legend
 * Legend: color swatches for hazard types, edge type indicators, hyper-route corridors.
 * @listens grouping:change
 * @listens hyperspace:routes
 * @listens layout:change
 * @listens hyperroute:highlight
 * @emits hyperroute:highlight
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

  // Track current hyper-route highlight so we can toggle off
  let activeRouteIdx = -1;

  /** Render the default legend with type color swatches and edge indicator. */
  function renderDefaultLegend() {
    container.innerHTML = '';
    activeRouteIdx = -1;

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

  /**
   * Render hyper-route corridor entries in the legend.
   * @param {Array} routes - Detected hyper-route corridors
   */
  function renderRoutes(routes) {
    // Remove any existing route section
    const existing = container.querySelector('.legend-routes');
    if (existing) existing.remove();

    if (!routes || routes.length === 0) return;

    const section = document.createElement('div');
    section.className = 'legend-routes';

    const divider = document.createElement('div');
    divider.className = 'legend-divider';
    divider.textContent = 'Hyper-Routes';
    section.appendChild(divider);

    const subtitle = document.createElement('div');
    subtitle.className = 'legend-route-subtitle';
    subtitle.textContent = 'Dense causal corridors between hazard types';
    section.appendChild(subtitle);

    routes.forEach((route, idx) => {
      const item = document.createElement('div');
      item.className = 'legend-item legend-route-item';
      item.style.cursor = 'pointer';

      const routeLine = document.createElement('span');
      routeLine.className = 'legend-route-line';

      const label = document.createElement('span');
      label.textContent = route.label;

      const badge = document.createElement('span');
      badge.className = 'legend-route-badge';
      badge.textContent = route.edgeCount;

      item.append(routeLine, label, badge);
      section.appendChild(item);

      item.addEventListener('click', () => {
        bus.emit('hyperroute:highlight', {
          routeIdx: activeRouteIdx === idx ? -1 : idx,
          route: activeRouteIdx === idx ? null : route,
        });
        activeRouteIdx = activeRouteIdx === idx ? -1 : idx;

        // Update active state on route items
        section.querySelectorAll('.legend-route-item').forEach((el, i) => {
          el.classList.toggle('active', i === activeRouteIdx);
        });
      });
    });

    container.appendChild(section);
  }

  // Initial render
  renderDefaultLegend();

  // Listen for mode changes — always re-render default legend
  bus.on('grouping:change', () => {
    renderDefaultLegend();
  });

  // Listen for hyper-route data
  bus.on('hyperspace:routes', ({ routes }) => {
    renderRoutes(routes);
  });

  // Clear routes on layout change away from hyperspace
  bus.on('layout:change', ({ name }) => {
    if (name !== 'hyperspace') {
      const existing = container.querySelector('.legend-routes');
      if (existing) existing.remove();
      activeRouteIdx = -1;
    }
  });

  // Handle route highlight requests
  bus.on('hyperroute:highlight', ({ route }) => {
    // This event is handled by graph.js interactions or we can do it here via getCy
    // For now, emit a more specific event that graph.js will handle
  });
}
