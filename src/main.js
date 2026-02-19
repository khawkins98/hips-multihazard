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

    // 5. Compute network insights & centrality
    const insights = computeInsights(data);
    initInsights(insights, data, bus);
    initPathFinder(bus, () => headlessCy);
    initCentralityRanking(bus);
    initFlowMatrix(data, bus);

    const centralityMetrics = computeCentrality(headlessCy);
    setCentralityData(centralityMetrics);
    bus.emit('centrality:computed', { metrics: centralityMetrics, nodeDataMap });

    // 6. Wire header action buttons
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

    // 7. Update footer with snapshot info and data freshness
    const info = document.getElementById('snapshot-info');
    if (data.meta) {
      const date = data.meta.fetchedAt
        ? new Date(data.meta.fetchedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'unknown';
      const sourceLabels = {
        cache: 'Cached', snapshot: 'Snapshot', api: 'Live API',
        'stale-cache': 'Stale cache', bundled: 'Bundled',
      };
      const sourceLabel = sourceLabels[data._source] || 'Snapshot';
      info.textContent = `${data.meta.nodeCount || data.nodes.length} hazards · Data: ${date} (${sourceLabel})`;
    }

    // 8. Decide: start screen or direct load
    const hasUrlState = urlState.declared || urlState.view || urlState.node
                      || urlState.hiddenTypes || urlState.hops
                      || urlState.edges === false || urlState.tension;

    if (hasUrlState) {
      // URL params present — skip start screen, go directly to view
      finishInit();
    } else {
      // No URL params — show start screen
      loading.classList.add('fade-out');
      setTimeout(() => loading.remove(), 400);

      const startScreen = document.getElementById('start-screen');
      startScreen.classList.remove('hidden');

      startScreen.addEventListener('click', (e) => {
        const card = e.target.closest('.start-card');
        if (!card) return;
        const chosenView = card.dataset.view;

        startScreen.classList.add('fade-out');
        setTimeout(() => {
          startScreen.remove();
          finishInit(chosenView);
        }, 350);
      });
    }

    /**
     * Complete initialization — create view manager and apply state.
     * @param {string} [chosenView] - 'web' or 'cascade' from start screen choice
     */
    function finishInit(chosenView) {
      // Hide loading overlay (if not already hidden by start screen path)
      if (loading.parentNode) {
        loading.classList.add('fade-out');
        setTimeout(() => loading.remove(), 400);
      }

      // Create view manager
      const container = document.getElementById('graph-container');
      const viewManager = createViewManager(container, data, bus);

      // Connect sidebar to view manager for tension/view switching
      connectViewManager(viewManager);

      // Initialize toolbar with view manager zoom delegates
      initToolbar(viewManager);

      // Start URL sync
      const urlSync = createUrlSync(bus, data.nodes, urlState);

      // Handle node focus (from detail panel causal links or search)
      bus.on('node:focus', ({ id }) => {
        viewManager.getActiveView()?.focusNode?.(id);
      });

      if (chosenView) {
        // User chose from start screen
        if (chosenView === 'cascade') {
          viewManager.switchView('cascade');
        }
        bus.emit('url:view', { view: chosenView });
      } else {
        // URL-driven — apply saved state
        applyUrlState(urlState, bus, viewManager);
      }
    }

  } catch (err) {
    console.error('Failed to initialize:', err);
    loading.querySelector('p').textContent = `Error loading data: ${err.message}`;
    loading.querySelector('.spinner').style.display = 'none';
  }
}

main();
