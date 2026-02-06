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

function initGroupingControls(bus) {
  const radios = document.querySelectorAll('#grouping-controls input[name="grouping"]');
  for (const radio of radios) {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        bus.emit('grouping:request', { mode: radio.value });
      }
    });
  }
}

function initEdgeToggle(bus) {
  const toggle = document.getElementById('edge-toggle');
  toggle.addEventListener('change', () => {
    bus.emit('edges:toggle', { visible: toggle.checked });
  });
}

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
