/**
 * Main entry point — orchestrates data loading, graph init, and UI wiring.
 */
import { fetchHipsData } from './data/fetch-hips.js';
import { transformToElements } from './data/transform.js';
import { initGraph, getCy } from './graph/graph.js';
import { focusNode } from './graph/interactions.js';
import { initSidebar } from './ui/sidebar.js';
import { initDetailPanel } from './ui/detail-panel.js';
import { initSearch } from './ui/search.js';
import { initToolbar } from './ui/toolbar.js';
import { initLegend } from './ui/legend.js';

/**
 * Create a simple publish/subscribe event bus for cross-module communication.
 * @returns {{ on: (event: string, fn: Function) => void, emit: (event: string, data: *) => void }}
 */
function createBus() {
  const listeners = {};
  return {
    on(event, fn) {
      (listeners[event] ||= []).push(fn);
    },
    emit(event, data) {
      for (const fn of listeners[event] || []) fn(data);
    },
  };
}

/**
 * Bootstrap the application: fetch data, build graph, wire up UI modules.
 * Shows a loading overlay during init and displays errors on failure.
 */
async function main() {
  const bus = createBus();
  const loading = document.getElementById('loading-overlay');

  try {
    // 1. Fetch data
    const data = await fetchHipsData();

    // 2. Transform to Cytoscape elements
    let currentGrouping = 'type';
    const { elements, nodeDataMap } = transformToElements(data, currentGrouping);

    // 3. Initialize UI components (before graph, so listeners are ready)
    initSidebar(data, bus);
    initDetailPanel(nodeDataMap, bus);
    initSearch(data.nodes, bus);
    initToolbar(getCy);
    initLegend(data.nodes);

    // 4. Initialize graph
    const cy = initGraph(elements, bus);

    // 5. Handle grouping changes (requires full re-transform)
    bus.on('grouping:request', ({ mode }) => {
      currentGrouping = mode;
      const { elements: newElements } = transformToElements(data, mode);
      bus.emit('grouping:change', { mode, elements: newElements });
    });

    // 6. Handle node focus (from detail panel causal links or search)
    bus.on('node:focus', ({ id }) => {
      focusNode(cy, id, bus);
    });

    // 7. Update footer with snapshot info
    const info = document.getElementById('snapshot-info');
    if (data.meta) {
      const date = data.meta.fetchedAt ? new Date(data.meta.fetchedAt).toLocaleDateString() : 'unknown';
      info.textContent = `${data.meta.nodeCount || data.nodes.length} hazards · Snapshot: ${date}`;
    }

    // 8. Hide loading overlay
    loading.classList.add('fade-out');
    setTimeout(() => loading.remove(), 400);

  } catch (err) {
    console.error('Failed to initialize:', err);
    loading.querySelector('p').textContent = `Error loading data: ${err.message}`;
    loading.querySelector('.spinner').style.display = 'none';
  }
}

main();
