/**
 * @module ui/path-finder
 * Shortest Path Finder: select two nodes to find and highlight
 * the shortest directed causal path between them.
 * @emits pathfinder:mode
 * @emits pathfinder:clear
 * @emits pathfinder:result
 * @listens pathfinder:select
 * @listens pathfinder:clear
 * @listens grouping:change
 */

let pathfinderActive = false;
let source = null;
let target = null;

/**
 * Initialize the path finder module.
 * @param {object} bus - Event bus
 * @param {Function} getCy - Function returning the Cytoscape instance
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

    if (!pathfinderActive) {
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
    const cy = getCy();
    if (cy) {
      cy.elements().removeClass('path-step path-highlighted');
    }
  });

  // Clear path state on grouping change
  bus.on('grouping:change', () => {
    if (pathfinderActive) {
      pathfinderActive = false;
      toggleBtn.classList.remove('active');
      bus.emit('pathfinder:mode', { active: false });
    }
    resetState();
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

    const elements = cy.elements(':visible').filter('[!isCompound]');
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

    // Clear previous highlights and apply path classes
    cy.elements().removeClass('dimmed highlighted highlight-hidden path-step path-highlighted');

    cy.batch(() => {
      cy.nodes().addClass('dimmed');
      cy.edges().addClass('highlight-hidden');

      path.forEach(ele => {
        if (ele.isNode()) {
          ele.removeClass('dimmed').addClass('path-step');
          ele.ancestors().removeClass('dimmed');
        } else {
          ele.removeClass('highlight-hidden').addClass('path-highlighted');
        }
      });
    });

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
