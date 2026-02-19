/**
 * @module ui/path-finder
 * Shortest Path Finder: select two nodes to find and highlight
 * the shortest directed causal path between them.
 * Uses headless Cytoscape for Dijkstra computation,
 * emits highlight events for the active view to render.
 * @emits pathfinder:mode
 * @emits pathfinder:clear
 * @emits pathfinder:result
 * @listens pathfinder:select
 * @listens pathfinder:clear
 */

let pathfinderActive = false;
let source = null;
let target = null;

/**
 * Initialize the path finder module.
 * @param {object} bus - Event bus
 * @param {Function} getCy - Function returning the headless Cytoscape instance
 */
export function initPathFinder(bus, getCy) {
  const section = document.getElementById('pathfinder-section');
  if (!section) return;

  const toggleBtn = section.querySelector('#pathfinder-toggle');
  const sourceInput = section.querySelector('#pathfinder-source');
  const targetInput = section.querySelector('#pathfinder-target');
  const status = section.querySelector('#pathfinder-status');
  const clearBtn = section.querySelector('#pathfinder-clear');

  toggleBtn.addEventListener('click', () => {
    pathfinderActive = !pathfinderActive;
    toggleBtn.classList.toggle('active', pathfinderActive);
    bus.emit('pathfinder:mode', { active: pathfinderActive });

    if (pathfinderActive) {
      status.textContent = 'Click a source node…';
    } else {
      resetState();
      bus.emit('pathfinder:clear', {});
    }
  });

  clearBtn.addEventListener('click', () => {
    resetState();
    bus.emit('pathfinder:clear', {});
  });

  bus.on('pathfinder:select', ({ id, label }) => {
    if (!pathfinderActive) return;

    if (!source) {
      source = { id, label };
      sourceInput.value = label;
      status.textContent = 'Click a target node...';
    } else if (!target) {
      target = { id, label };
      targetInput.value = label;
      runDijkstra(getCy());
    }
  });

  bus.on('pathfinder:clear', () => {
    // Clear highlight via insight:highlight clear
    bus.emit('insight:highlight', { clear: true });
  });

  function resetState() {
    source = null;
    target = null;
    sourceInput.value = '';
    targetInput.value = '';
    status.textContent = '';
  }

  function runDijkstra(cy) {
    if (!cy || !source || !target) return;

    const sourceNode = cy.getElementById(source.id);
    const targetNode = cy.getElementById(target.id);
    if (sourceNode.empty() || targetNode.empty()) {
      status.textContent = 'Node not found in current view.';
      return;
    }

    const elements = cy.elements().filter('[!isCompound]');
    const dijkstra = elements.dijkstra({
      root: sourceNode,
      directed: true,
      weight: () => 1,
    });

    const dist = dijkstra.distanceTo(targetNode);
    if (dist === Infinity || !isFinite(dist)) {
      status.textContent = 'No directed path found.';
      bus.emit('pathfinder:result', { path: null, distance: Infinity });
      return;
    }

    const path = dijkstra.pathTo(targetNode);
    status.textContent = `Path: ${Math.round(dist)} hop${dist !== 1 ? 's' : ''}`;

    // Collect path node IDs for highlighting in the active view
    const pathNodeIds = [];
    path.forEach(ele => {
      if (ele.isNode()) {
        pathNodeIds.push(ele.id());
      }
    });

    // Highlight path nodes in the active view
    bus.emit('insight:highlight', { nodeIds: pathNodeIds });
    bus.emit('pathfinder:result', { path, distance: dist });
  }
}

/**
 * Check if pathfinder mode is currently active.
 * @returns {boolean}
 */
export function isPathfinderActive() {
  return pathfinderActive;
}

/**
 * Reset module state. Test-only API.
 * @private
 */
export function _reset() {
  pathfinderActive = false;
  source = null;
  target = null;
}
