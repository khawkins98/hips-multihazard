/**
 * @module views/view-manager
 * Manages view switching between edge bundling and cascade views.
 * Translates bus events into view-specific method calls.
 */
import { createEdgeBundlingView } from './edge-bundling/edge-bundling.js';

/**
 * Create the view manager.
 * @param {HTMLElement} container - The graph container element
 * @param {object} data - Snapshot data
 * @param {object} bus - Event bus
 * @returns {object} View manager API
 */
export function createViewManager(container, data, bus) {
  let activeViewName = 'web';
  let views = {};
  let cascadeModule = null;

  // Create the edge bundling view
  views.web = createEdgeBundlingView(container, data, bus);

  // Cascade view will be lazy-loaded
  views.cascade = null;

  /**
   * Switch to a named view.
   * @param {string} viewName - 'web' or 'cascade'
   * @param {object} [opts] - Options (e.g., { rootId } for cascade)
   */
  function switchView(viewName, opts = {}) {
    if (activeViewName === viewName && viewName !== 'cascade') return;

    // Deactivate current view
    const currentView = views[activeViewName];
    if (currentView) currentView.deactivate();

    activeViewName = viewName;

    if (viewName === 'cascade') {
      // Lazy-load cascade view
      if (!views.cascade) {
        import('./cascade/cascade.js').then(mod => {
          views.cascade = mod.createCascadeView(container, data, bus);
          views.cascade.activate(opts);
          cascadeModule = mod;
        }).catch(() => {
          // Stale cached entry point referencing old chunk hash — reload to get fresh HTML
          window.location.reload();
        });
      } else {
        views.cascade.activate(opts);
      }
    } else {
      const view = views[viewName];
      if (view) view.activate();
    }

    // Update view switcher buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });
  }

  /**
   * Get the currently active view instance.
   */
  function getActiveView() {
    return views[activeViewName];
  }

  // ---- Wire bus events to active view ----

  bus.on('filter:types', ({ hiddenTypes }) => {
    const view = getActiveView();
    if (view?.filterTypes) view.filterTypes(hiddenTypes);
  });

  bus.on('edges:toggle', ({ visible, declaredOnly }) => {
    const view = getActiveView();
    if (view?.setEdgeVisibility) view.setEdgeVisibility(visible, declaredOnly);
  });

  bus.on('node:focus', ({ id }) => {
    const view = getActiveView();
    if (view?.focusNode) view.focusNode(id);
  });

  bus.on('node:deselected', () => {
    const view = getActiveView();
    if (view?.clearHighlights) view.clearHighlights();
  });

  bus.on('insight:highlight', ({ nodeIds, edgeFilter, clear }) => {
    const view = getActiveView();
    if (!view) return;

    if (clear) {
      if (view.clearHighlights) view.clearHighlights();
      return;
    }

    if (nodeIds && view.highlightNodes) {
      view.highlightNodes(new Set(nodeIds));
    }
  });

  bus.on('flow:highlight', ({ edges: flowEdges, clear }) => {
    const view = getActiveView();
    if (!view) return;

    if (clear) {
      if (view.clearHighlights) view.clearHighlights();
      return;
    }

    if (flowEdges && view.highlightEdges) {
      const edgeKeys = new Set(flowEdges.map(e => `${e.source}->${e.target}`));
      const nodeIds = new Set();
      for (const e of flowEdges) {
        nodeIds.add(e.source);
        nodeIds.add(e.target);
      }
      view.highlightEdges(edgeKeys, nodeIds);
    }
  });

  bus.on('khop:change', ({ nodeId, hops }) => {
    const view = getActiveView();

    // In cascade mode, hops controls tree expansion depth
    if (view?.setDepth) {
      view.setDepth(hops);
      return;
    }

    // In edge bundling, highlight k-hop neighborhood
    if (!view?.getAdjacency) return;

    const adj = view.getAdjacency();
    const visited = new Set([nodeId]);
    let frontier = new Set([nodeId]);

    for (let i = 0; i < hops; i++) {
      const next = new Set();
      for (const id of frontier) {
        const neighbors = adj.get(id) || new Set();
        for (const nId of neighbors) {
          if (!visited.has(nId)) {
            visited.add(nId);
            next.add(nId);
          }
        }
      }
      if (next.size === 0) break;
      frontier = next;
    }

    if (view.highlightNodes) view.highlightNodes(visited);
  });

  bus.on('cascade:open', ({ rootId }) => {
    switchView('cascade', { rootId });
  });

  // Handle resize
  const resizeObserver = new ResizeObserver(() => {
    const view = getActiveView();
    if (view?.resize) view.resize();
  });
  resizeObserver.observe(container);

  // ---- Initialize ----
  // Activate the default view
  views.web.activate();

  return {
    switchView,
    getActiveView,
    getActiveViewName() { return activeViewName; },

    /** Zoom delegates for toolbar. */
    zoomIn() { getActiveView()?.zoomIn?.(); },
    zoomOut() { getActiveView()?.zoomOut?.(); },
    fit() { getActiveView()?.fit?.(); },
    reset() { getActiveView()?.reset?.(); },

    destroy() {
      resizeObserver.disconnect();
      for (const view of Object.values(views)) {
        if (view) view.destroy();
      }
    },
  };
}
