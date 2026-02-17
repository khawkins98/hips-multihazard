/**
 * @module main
 * Main entry point — orchestrates data loading, view init, and UI wiring.
 * Creates the event bus and connects all modules.
 * Uses the view manager (D3 edge bundling / cascade) instead of Cytoscape for visualization.
 * Keeps Cytoscape headless for graph algorithms (centrality, pathfinding).
 */
import { fetchHipsData } from './data/fetch-hips.js';
import { transformToElements } from './data/transform.js';
import { createViewManager } from './views/view-manager.js';
import { initSidebar, initCentralityRanking, connectViewManager } from './ui/sidebar.js';
import { initDetailPanel, setCentralityData } from './ui/detail-panel.js';
import { initSearch } from './ui/search.js';
import { initToolbar } from './ui/toolbar.js';
import { initLegend } from './ui/legend.js';
import { computeInsights } from './data/insights.js';
import { initInsights } from './ui/insights.js';
import { computeCentrality } from './data/centrality.js';
import { initPathFinder } from './ui/path-finder.js';
import { initFlowMatrix } from './ui/flow-matrix.js';
import { createBus } from './utils/bus.js';
import { parseUrl, createUrlSync, applyUrlState } from './utils/url-state.js';

// Headless Cytoscape for graph algorithms
import cytoscape from 'cytoscape';

async function main() {
  const bus = createBus();
  const loading = document.getElementById('loading-overlay');

  try {
    // 1. Fetch data
    const data = await fetchHipsData();

    // 1b. Parse URL state (before any UI init)
    const urlState = parseUrl(data.nodes);

    // 2. Build Cytoscape elements for headless graph algorithms
    const { elements, nodeDataMap } = transformToElements(data, 'type');

    // 3. Create headless Cytoscape instance for algorithms (centrality, pathfinding)
    const headlessCy = cytoscape({
      headless: true,
      elements,
    });

    // 4. Initialize UI components (before views, so listeners are ready)
    initSidebar(data, bus);
    initDetailPanel(nodeDataMap, data.edges, bus);
    initSearch(data.nodes, bus);
    initLegend(data.nodes, bus);

    // 5. Compute network insights
    const insights = computeInsights(data);

    // 6. Create view manager (replaces old initGraph)
    const container = document.getElementById('graph-container');
    const viewManager = createViewManager(container, data, bus);

    // 6b. Connect sidebar to view manager for tension/view switching
    connectViewManager(viewManager);

    // 7. Initialize toolbar with view manager zoom delegates
    initToolbar(viewManager);

    // 8. Initialize insights drawer
    initInsights(insights, data, bus);

    // 9. Initialize path finder with headless Cytoscape
    initPathFinder(bus, () => headlessCy);

    // 10. Initialize centrality ranking section
    initCentralityRanking(bus);

    // 11. Initialize flow matrix
    initFlowMatrix(data, bus);

    // 12. Start URL sync (seeded with parsed URL state so params aren't lost)
    const urlSync = createUrlSync(bus, data.nodes, urlState);

    // 13. Compute centrality metrics (headless)
    const centralityMetrics = computeCentrality(headlessCy);
    setCentralityData(centralityMetrics);
    bus.emit('centrality:computed', { metrics: centralityMetrics, nodeDataMap });

    // 14. Handle node focus (from detail panel causal links or search)
    bus.on('node:focus', ({ id }) => {
      viewManager.getActiveView()?.focusNode?.(id);
    });

    // 15. Update footer with snapshot info
    const info = document.getElementById('snapshot-info');
    if (data.meta) {
      const date = data.meta.fetchedAt ? new Date(data.meta.fetchedAt).toLocaleDateString() : 'unknown';
      info.textContent = `${data.meta.nodeCount || data.nodes.length} hazards · Snapshot: ${date}`;
    }

    // 16. Apply URL state (restore shared link state)
    applyUrlState(urlState, bus, viewManager);

    // 17. Wire header action buttons
    const copyBtn = document.getElementById('btn-copy-link');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
          copyBtn.textContent = 'Copied!';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.textContent = 'Copy Link';
            copyBtn.classList.remove('copied');
          }, 1500);
        });
      });
    }

    const resetBtn = document.getElementById('btn-reset-app');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        window.location.href = window.location.pathname;
      });
    }

    // 18. Hide loading overlay
    loading.classList.add('fade-out');
    setTimeout(() => loading.remove(), 400);

  } catch (err) {
    console.error('Failed to initialize:', err);
    loading.querySelector('p').textContent = `Error loading data: ${err.message}`;
    loading.querySelector('.spinner').style.display = 'none';
  }
}

main();
