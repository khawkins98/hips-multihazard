/**
 * Graph interaction handlers: tap, hover, neighborhood highlight.
 */
import { isPathfinderActive } from '../ui/path-finder.js';

/**
 * Set up interaction handlers on the Cytoscape instance.
 * @param {object} cy - Cytoscape instance
 * @param {object} bus - Event bus for cross-module communication
 */
export function setupInteractions(cy, bus) {
  const tooltip = createTooltip();

  // Click on a hazard node
  cy.on('tap', 'node[!isCompound]', (evt) => {
    const node = evt.target;
    const nodeId = node.id();

    // If pathfinder mode is active, route to pathfinder instead
    if (isPathfinderActive()) {
      bus.emit('pathfinder:select', { id: nodeId, label: node.data('label') });
      return;
    }

    clearHighlights(cy);
    node.select();
    highlightNeighborhood(cy, node);
    bus.emit('node:selected', { id: nodeId });
  });

  // Click on background to deselect
  cy.on('tap', (evt) => {
    if (evt.target === cy) {
      clearHighlights(cy);
      cy.elements().unselect();
      bus.emit('node:deselected');
    }
  });

  // Hover effects + tooltip
  cy.on('mouseover', 'node[!isCompound]', (evt) => {
    const node = evt.target;
    node.style('border-width', 3);
    document.getElementById('cy').style.cursor = 'pointer';

    const d = node.data();
    const edges = node.connectedEdges();
    let declared = 0;
    let inferred = 0;
    edges.forEach(e => {
      if (e.data('declared')) declared++;
      else inferred++;
    });
    const total = declared + inferred;
    let connLine = `${total} causal link${total !== 1 ? 's' : ''}`;
    if (inferred > 0) {
      connLine = `${declared} declared + ${inferred} inferred`;
    }
    tooltip.show(
      `<strong>${esc(d.label)}</strong><br>` +
      `<span class="tt-type">${esc(d.typeName)}</span>` +
      (d.clusterName ? ` · ${esc(d.clusterName)}` : '') +
      `<br><span class="tt-conns">${connLine}</span>`,
      evt.renderedPosition || evt.position
    );
  });

  cy.on('mousemove', 'node, edge', (evt) => {
    tooltip.move(evt.renderedPosition || evt.position);
  });

  cy.on('mouseout', 'node[!isCompound]', (evt) => {
    const node = evt.target;
    if (!node.selected()) {
      node.style('border-width', 2);
    }
    document.getElementById('cy').style.cursor = 'default';
    tooltip.hide();
  });
}

function createTooltip() {
  const el = document.createElement('div');
  el.className = 'graph-tooltip';
  document.getElementById('graph-container').appendChild(el);

  return {
    show(html, pos) {
      el.innerHTML = html;
      el.style.display = 'block';
      this.move(pos);
    },
    move(pos) {
      if (!pos) return;
      el.style.left = (pos.x + 12) + 'px';
      el.style.top = (pos.y - 10) + 'px';
    },
    hide() {
      el.style.display = 'none';
    },
  };
}

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}

/**
 * Highlight a node's k-hop causal neighborhood.
 * Iteratively expands frontier `hops` times via connectedEdges/connectedNodes.
 * Only shows edges where both endpoints are in the visited set.
 * @param {object} cy - Cytoscape instance
 * @param {object} node - Starting node
 * @param {number} [hops=1] - Number of hops to expand
 */
export function highlightKHopNeighborhood(cy, node, hops = 1) {
  clearHighlights(cy);

  // BFS expansion: collect all nodes within `hops` distance
  const visited = new Set();
  visited.add(node.id());
  let frontier = cy.collection().merge(node);

  for (let i = 0; i < hops; i++) {
    const nextFrontier = cy.collection();
    frontier.forEach(n => {
      const edges = n.connectedEdges();
      const neighbors = edges.connectedNodes();
      neighbors.forEach(nb => {
        if (!nb.data('isCompound') && !visited.has(nb.id())) {
          visited.add(nb.id());
          nextFrontier.merge(nb);
        }
      });
    });
    if (nextFrontier.empty()) break;
    frontier = nextFrontier;
  }

  cy.batch(() => {
    // Dim all, hide all edges
    cy.nodes().addClass('dimmed');
    cy.edges().addClass('highlight-hidden');

    // Un-dim all visited nodes
    for (const id of visited) {
      const n = cy.getElementById(id);
      if (n && !n.empty()) {
        n.removeClass('dimmed').addClass('highlighted');
        n.ancestors().removeClass('dimmed');
      }
    }
    // Show edges where both endpoints are visited
    cy.edges().forEach(edge => {
      if (visited.has(edge.data('source')) && visited.has(edge.data('target'))) {
        edge.removeClass('highlight-hidden').addClass('highlighted');
      }
    });
  });
}

/**
 * Highlight a node's direct causal neighborhood (convenience wrapper for 1-hop).
 */
export function highlightNeighborhood(cy, node) {
  highlightKHopNeighborhood(cy, node, 1);
}

/**
 * Clear all highlight/dim/hidden classes.
 */
export function clearHighlights(cy) {
  cy.elements().removeClass('dimmed highlighted highlight-hidden path-step path-highlighted');
}

/**
 * Pan and zoom to a specific node.
 */
export function focusNode(cy, nodeId, bus) {
  const node = cy.getElementById(nodeId);
  if (!node || node.empty()) return;

  clearHighlights(cy);
  cy.elements().unselect();

  cy.animate({
    center: { eles: node },
    zoom: 2.5,
  }, {
    duration: 400,
    complete: () => {
      node.select();
      highlightNeighborhood(cy, node);
      bus.emit('node:selected', { id: nodeId });
    },
  });
}
