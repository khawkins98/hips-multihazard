/**
 * Sidebar: type filter checkboxes, grouping controls, edge toggle, layout buttons.
 */
import { HAZARD_TYPES, getTypeDef } from '../data/hazard-types.js';

/**
 * Initialize sidebar controls.
 * @param {object} data - Snapshot data
 * @param {object} bus - Event bus
 */
export function initSidebar(data, bus) {
  initTypeFilters(data, bus);
  initGroupingControls(bus);
  initEdgeToggle(bus);
  initLayoutControls(bus);
}

/**
 * Build type-filter checkboxes from the data, emitting 'filter:types' on change.
 * Each checkbox shows the hazard type color swatch, short name, and node count.
 */
function initTypeFilters(data, bus) {
  const container = document.getElementById('type-filters');

  // Count hazards per type
  const typeCounts = new Map();
  for (const node of data.nodes) {
    const name = node.typeName || 'Unknown';
    typeCounts.set(name, (typeCounts.get(name) || 0) + 1);
  }

  const hiddenTypes = new Set();

  // Create a checkbox for each type
  for (const [typeName, typeDef] of Object.entries(HAZARD_TYPES)) {
    const count = typeCounts.get(typeName) || 0;
    if (count === 0) continue;

    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = true;

    const swatch = document.createElement('span');
    swatch.className = 'type-swatch';
    swatch.style.background = typeDef.color;

    const text = document.createTextNode(typeDef.short);

    const countSpan = document.createElement('span');
    countSpan.className = 'type-count';
    countSpan.textContent = count;

    label.append(cb, swatch, text, countSpan);
    container.appendChild(label);

    cb.addEventListener('change', () => {
      if (cb.checked) {
        hiddenTypes.delete(typeName);
      } else {
        hiddenTypes.add(typeName);
      }
      bus.emit('filter:types', { hiddenTypes: new Set(hiddenTypes) });
    });
  }
}

/** Bind grouping radio buttons to emit 'grouping:request' events. */
function initGroupingControls(bus) {
  const radios = document.querySelectorAll('#grouping-controls input[name="grouping"]');
  const edgeToggle = document.getElementById('edge-toggle');
  const edgeLabel = document.getElementById('edge-toggle-label');
  const layoutBtns = document.querySelectorAll('.layout-btn');
  const layoutSection = document.getElementById('layout-section');
  const edgeSection = document.getElementById('edge-section');

  for (const radio of radios) {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        const isCorridor = radio.value === 'corridor';

        // Disable/dim edge toggle and layout buttons in corridor mode
        edgeToggle.disabled = isCorridor;
        edgeSection.classList.toggle('disabled-section', isCorridor);
        layoutBtns.forEach(btn => { btn.disabled = isCorridor; });
        layoutSection.classList.toggle('disabled-section', isCorridor);

        bus.emit('grouping:request', { mode: radio.value });
      }
    });
  }
}

/** Bind the causal-link toggle checkbox to emit 'edges:toggle' events. */
function initEdgeToggle(bus) {
  const toggle = document.getElementById('edge-toggle');
  toggle.addEventListener('change', () => {
    bus.emit('edges:toggle', { visible: toggle.checked });
  });
}

/** Bind layout buttons (fcose/dagre/concentric) to emit 'layout:change' events. */
function initLayoutControls(bus) {
  const buttons = document.querySelectorAll('.layout-btn');
  for (const btn of buttons) {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      bus.emit('layout:change', { name: btn.dataset.layout });
    });
  }
}
