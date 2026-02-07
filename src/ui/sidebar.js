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
  const layoutBtns = document.querySelectorAll('.layout-btn');

  for (const radio of radios) {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        // Reset active layout button to Hyperspace on grouping change
        layoutBtns.forEach(btn => {
          btn.classList.toggle('active', btn.dataset.layout === 'hyperspace');
        });

        bus.emit('grouping:request', { mode: radio.value });
      }
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

  // Collapsible toggle
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

    // Sort by rank, take top 20
    const sorted = [...currentMetrics.entries()]
      .sort((a, b) => a[1][rankKey] - b[1][rankKey])
      .slice(0, 20);

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

    // Click to focus node
    ul.querySelectorAll('.centrality-item').forEach(li => {
      li.addEventListener('click', () => {
        bus.emit('node:focus', { id: li.dataset.nodeId });
      });
    });
  }

  function esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }
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
