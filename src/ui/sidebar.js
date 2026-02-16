/**
 * @module ui/sidebar
 * Sidebar: view switcher, type filter checkboxes, bundling tension, edge toggle, centrality ranking.
 * @emits filter:types
 * @emits edges:toggle
 * @emits node:focus
 * @emits cascade:open
 * @listens centrality:computed
 */
import { HAZARD_TYPES, getTypeDef } from '../data/hazard-types.js';
import { esc } from '../utils/dom.js';
import { TOP_N_CENTRALITY } from './constants.js';

/** @type {object|null} View manager reference, set during init */
let viewManagerRef = null;

/**
 * Initialize sidebar controls.
 * @param {object} data - Snapshot data
 * @param {object} bus - Event bus
 */
export function initSidebar(data, bus) {
  initTypeFilters(data, bus);
  initEdgeToggle(bus);
  initTensionSlider(bus);
  initViewSwitcher(bus);
}

/**
 * Connect sidebar to the view manager for tension slider and view switching.
 * Called from main.js after viewManager is created.
 * @param {object} viewManager
 */
export function connectViewManager(viewManager) {
  viewManagerRef = viewManager;
}

/**
 * Build type-filter checkboxes from the data, emitting 'filter:types' on change.
 */
function initTypeFilters(data, bus) {
  const container = document.getElementById('type-filters');

  const typeCounts = new Map();
  for (const node of data.nodes) {
    const name = node.typeName || 'Unknown';
    typeCounts.set(name, (typeCounts.get(name) || 0) + 1);
  }

  const hiddenTypes = new Set();

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

/** Bind the causal-link toggle checkboxes to emit 'edges:toggle' events. */
function initEdgeToggle(bus) {
  const toggle = document.getElementById('edge-toggle');
  const declaredToggle = document.getElementById('edge-declared-toggle');
  const declaredLabel = document.getElementById('edge-declared-label');

  function syncDeclaredState() {
    declaredToggle.disabled = !toggle.checked;
    declaredLabel.classList.toggle('disabled', !toggle.checked);
  }

  function emitEdgeState() {
    bus.emit('edges:toggle', {
      visible: toggle.checked,
      declaredOnly: declaredToggle.checked,
    });
  }

  toggle.addEventListener('change', () => {
    syncDeclaredState();
    emitEdgeState();
  });

  declaredToggle.addEventListener('change', () => {
    emitEdgeState();
  });
}

/** Initialize the bundling tension slider. */
function initTensionSlider(bus) {
  const slider = document.getElementById('tension-slider');
  const valueDisplay = document.getElementById('tension-value');
  if (!slider) return;

  slider.addEventListener('input', () => {
    const val = parseFloat(slider.value);
    valueDisplay.textContent = val.toFixed(2);
    if (viewManagerRef) {
      const view = viewManagerRef.getActiveView();
      if (view?.setTension) view.setTension(val);
    }
  });
}

/** Initialize view switcher buttons. */
function initViewSwitcher(bus) {
  const buttons = document.querySelectorAll('.view-btn');
  const tensionSection = document.getElementById('tension-section');

  for (const btn of buttons) {
    btn.addEventListener('click', () => {
      const viewName = btn.dataset.view;
      buttons.forEach(b => b.classList.toggle('active', b === btn));

      // Show/hide view-specific controls
      if (tensionSection) {
        tensionSection.style.display = viewName === 'web' ? '' : 'none';
      }

      if (viewManagerRef) {
        viewManagerRef.switchView(viewName);
      } else {
        bus.emit('cascade:open', { rootId: null });
      }
    });
  }
}

/**
 * Initialize centrality ranking section in the sidebar.
 * @param {object} bus - Event bus
 */
export function initCentralityRanking(bus) {
  const section = document.getElementById('centrality-section');
  if (!section) return;

  const header = section.querySelector('h2');
  const listContainer = section.querySelector('.centrality-list');
  const select = section.querySelector('#centrality-metric-select');

  let collapsed = true;
  listContainer.classList.add('hidden');
  header.style.cursor = 'pointer';
  header.addEventListener('click', () => {
    collapsed = !collapsed;
    listContainer.classList.toggle('hidden', collapsed);
    header.classList.toggle('expanded', !collapsed);
  });

  let currentMetrics = null;
  let currentNodeDataMap = null;

  bus.on('centrality:computed', ({ metrics, nodeDataMap }) => {
    currentMetrics = metrics;
    currentNodeDataMap = nodeDataMap;
    renderList();
  });

  select.addEventListener('change', renderList);

  function renderList() {
    if (!currentMetrics) return;
    const metricKey = select.value;
    const rankKey = metricKey + 'Rank';

    const sorted = [...currentMetrics.entries()]
      .sort((a, b) => a[1][rankKey] - b[1][rankKey])
      .slice(0, TOP_N_CENTRALITY);

    const ul = listContainer.querySelector('ul');
    ul.innerHTML = sorted.map(([id, m]) => {
      const nodeData = currentNodeDataMap?.get(id);
      const label = nodeData?.label || id;
      const typeDef = getTypeDef(nodeData?.typeName);
      const color = typeDef.color;
      const rank = m[rankKey];
      const value = m[metricKey].toFixed(4);
      return `<li class="centrality-item" data-node-id="${esc(id)}">
        <span class="centrality-item-rank">${rank}</span>
        <span class="centrality-item-swatch" style="background:${color}"></span>
        <span class="centrality-item-label">${esc(label)}</span>
        <span class="centrality-item-value">${value}</span>
      </li>`;
    }).join('');

    ul.querySelectorAll('.centrality-item').forEach(li => {
      li.addEventListener('click', () => {
        bus.emit('node:focus', { id: li.dataset.nodeId });
      });
    });
  }
}
