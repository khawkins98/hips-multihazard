/**
 * @module utils/url-state
 * URL state management — read, sync, and apply URL query parameters
 * so that app state (view, selected node, filters, etc.) is shareable via URL.
 */

import { HAZARD_TYPES } from '../data/hazard-types.js';

/** Map full type names to short URL slugs. */
const TYPE_TO_SLUG = {
  'Biological': 'bio',
  'Meteorological and Hydrological': 'met',
  'Technological': 'tech',
  'Chemical': 'chem',
  'Geological': 'geo',
  'Environmental': 'env',
  'Extraterrestrial': 'ext',
  'Societal': 'soc',
};

/** Reverse: slug -> full type name. */
const SLUG_TO_TYPE = Object.fromEntries(
  Object.entries(TYPE_TO_SLUG).map(([k, v]) => [v, k])
);

/** Default values — only non-default values appear in the URL. */
const DEFAULTS = {
  view: 'web',
  node: null,
  hops: 1,
  hide: null,
  edges: true,
  declared: false,
  tension: 0.85,
};

/**
 * Parse the current URL search params into a state object.
 * @param {Array} nodes - Array of node objects (with .id and .identifier)
 * @returns {object} Parsed state
 */
export function parseUrl(nodes) {
  // Build identifier -> fullId lookup
  const idLookup = new Map();
  for (const n of nodes) {
    if (n.identifier) idLookup.set(n.identifier, n.id);
  }

  const params = new URLSearchParams(window.location.search);
  const state = {};

  // view
  const view = params.get('view');
  if (view === 'cascade') state.view = 'cascade';

  // node (short identifier -> full id)
  const nodeParam = params.get('node');
  if (nodeParam) {
    const fullId = idLookup.get(nodeParam);
    if (fullId) {
      state.node = fullId;
      state.nodeIdentifier = nodeParam;
    }
  }

  // hops
  const hops = parseInt(params.get('hops'), 10);
  if (hops >= 1 && hops <= 4) state.hops = hops;

  // hide (comma-separated slugs)
  const hide = params.get('hide');
  if (hide) {
    const types = hide.split(',')
      .map(s => SLUG_TO_TYPE[s.trim()])
      .filter(Boolean);
    if (types.length > 0) state.hiddenTypes = new Set(types);
  }

  // edges
  if (params.get('edges') === '0') state.edges = false;

  // declared
  if (params.get('declared') === '1') state.declared = true;

  // tension
  const tension = parseFloat(params.get('tension'));
  if (!isNaN(tension) && tension >= 0 && tension <= 1) state.tension = tension;

  return state;
}

/**
 * Create a URL sync listener that mirrors bus events to the URL bar.
 * @param {object} bus - Event bus
 * @param {Array} nodes - Array of node objects
 * @param {object} [initialState] - Parsed URL state to seed internal state from
 * @returns {{ resetUrl: string }}
 */
export function createUrlSync(bus, nodes, initialState = {}) {
  // Build fullId -> identifier lookup
  const idToIdentifier = new Map();
  for (const n of nodes) {
    if (n.identifier) idToIdentifier.set(n.id, n.identifier);
  }

  // Internal state mirror — seeded from parsed URL state so we don't
  // immediately overwrite params that haven't been applied yet.
  const state = {
    view: initialState.view || DEFAULTS.view,
    node: initialState.node || DEFAULTS.node,
    hops: initialState.hops || DEFAULTS.hops,
    hiddenTypes: initialState.hiddenTypes
      ? new Set(initialState.hiddenTypes)
      : new Set(),
    edges: initialState.edges !== undefined ? initialState.edges : DEFAULTS.edges,
    declared: initialState.declared || DEFAULTS.declared,
    tension: initialState.tension !== undefined
      ? initialState.tension
      : DEFAULTS.tension,
  };

  let debounceTimer = null;

  function scheduleWrite() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(writeUrl, 300);
  }

  function writeUrl() {
    const params = new URLSearchParams();

    if (state.view !== DEFAULTS.view) params.set('view', state.view);

    if (state.node) {
      const identifier = idToIdentifier.get(state.node);
      if (identifier) params.set('node', identifier);
    }

    if (state.hops !== DEFAULTS.hops) params.set('hops', String(state.hops));

    if (state.hiddenTypes.size > 0) {
      const slugs = [...state.hiddenTypes]
        .map(t => TYPE_TO_SLUG[t])
        .filter(Boolean)
        .sort();
      if (slugs.length > 0) params.set('hide', slugs.join(','));
    }

    if (!state.edges) params.set('edges', '0');
    if (state.declared) params.set('declared', '1');

    if (state.tension !== DEFAULTS.tension) {
      params.set('tension', state.tension.toFixed(2));
    }

    const qs = params.toString();
    const url = window.location.pathname + (qs ? '?' + qs : '');
    history.replaceState(null, '', url);
  }

  // Subscribe to bus events
  bus.on('node:selected', ({ id }) => {
    state.node = id;
    scheduleWrite();
  });

  bus.on('node:deselected', () => {
    state.node = null;
    state.hops = DEFAULTS.hops;
    scheduleWrite();
  });

  bus.on('khop:change', ({ hops }) => {
    state.hops = hops;
    scheduleWrite();
  });

  bus.on('filter:types', ({ hiddenTypes }) => {
    state.hiddenTypes = new Set(hiddenTypes);
    scheduleWrite();
  });

  bus.on('edges:toggle', ({ visible, declaredOnly }) => {
    state.edges = visible;
    state.declared = declaredOnly;
    scheduleWrite();
  });

  bus.on('url:view', ({ view }) => {
    state.view = view;
    scheduleWrite();
  });

  bus.on('url:tension', ({ tension }) => {
    state.tension = tension;
    scheduleWrite();
  });

  bus.on('cascade:open', ({ rootId }) => {
    state.view = 'cascade';
    if (rootId) state.node = rootId;
    scheduleWrite();
  });

  const resetUrl = window.location.pathname;
  return { resetUrl };
}

/**
 * Apply parsed URL state to the app after all modules are initialized.
 * Sets DOM elements and dispatches change events so sidebar local state stays in sync.
 * @param {object} state - Parsed state from parseUrl()
 * @param {object} bus - Event bus
 * @param {object} viewManager - View manager instance
 */
export function applyUrlState(state, bus, viewManager) {
  if (!state || Object.keys(state).length === 0) return;

  // 1. Apply type filters — set checkboxes then dispatch change so sidebar
  //    local state stays in sync (sidebar derives hiddenTypes from DOM).
  if (state.hiddenTypes && state.hiddenTypes.size > 0) {
    const checkboxes = document.querySelectorAll('#type-filters input[type="checkbox"]');
    let changed = false;
    for (const cb of checkboxes) {
      const typeName = cb.dataset.typeName;
      if (typeName && state.hiddenTypes.has(typeName)) {
        cb.checked = false;
        changed = true;
      }
    }
    // Dispatch a change event on one checkbox to trigger the sidebar's handler,
    // which will rebuild hiddenTypes from all checkbox states and emit filter:types.
    if (changed && checkboxes.length > 0) {
      checkboxes[0].dispatchEvent(new Event('change'));
    }
  }

  // 2. Apply edge visibility
  if (state.edges === false || state.declared === true) {
    const edgeToggle = document.getElementById('edge-toggle');
    const declaredToggle = document.getElementById('edge-declared-toggle');

    if (state.edges === false && edgeToggle) {
      edgeToggle.checked = false;
    }
    if (state.declared === true && declaredToggle) {
      declaredToggle.checked = true;
    }
    // Dispatch change on the main toggle to sync sidebar state and emit edges:toggle.
    if (edgeToggle) {
      edgeToggle.dispatchEvent(new Event('change'));
    }
  }

  // 3. Apply tension
  if (state.tension !== undefined) {
    const slider = document.getElementById('tension-slider');
    const display = document.getElementById('tension-value');
    if (slider) {
      slider.value = state.tension;
      if (display) display.textContent = state.tension.toFixed(2);
      const view = viewManager.getActiveView();
      if (view?.setTension) view.setTension(state.tension);
    }
  }

  // 4. Switch view if needed (before selecting node)
  if (state.view === 'cascade') {
    viewManager.switchView('cascade', { rootId: state.node || null });

    // Apply hops as depth after a short delay (cascade is lazy-loaded via dynamic import)
    if (state.hops && state.hops !== DEFAULTS.hops) {
      setTimeout(() => {
        bus.emit('khop:change', { nodeId: state.node, hops: state.hops });
      }, 500);
    }
  } else {
    // Web view — select node and apply hops
    if (state.node) {
      bus.emit('node:focus', { id: state.node });

      if (state.hops && state.hops !== DEFAULTS.hops) {
        // node:focus triggers a 420ms zoom transition before selecting the node,
        // so wait for that to complete before emitting khop:change.
        setTimeout(() => {
          bus.emit('khop:change', { nodeId: state.node, hops: state.hops });
        }, 500);
      }
    }
  }
}
