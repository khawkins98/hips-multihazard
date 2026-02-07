/**
 * Graph interaction handlers: tap, hover, neighborhood highlight.
 */

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
    const conns = d.connectionCount || 0;
    tooltip.show(
      `<strong>${esc(d.label)}</strong><br>` +
      `<span class="tt-type">${esc(d.typeName)}</span>` +
      (d.clusterName ? ` · ${esc(d.clusterName)}` : '') +
      `<br><span class="tt-conns">${conns} causal link${conns !== 1 ? 's' : ''}</span>`,
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
 * Highlight a node's direct causal neighborhood.
 * Connected edges are highlighted; unrelated edges are hidden; other nodes are dimmed.
 */
export function highlightNeighborhood(cy, node) {
  clearHighlights(cy);

  const connectedEdges = node.connectedEdges();
  const neighbors = connectedEdges.connectedNodes();

  // Dim all nodes, hide all edges
  cy.nodes().addClass('dimmed');
  cy.edges().addClass('highlight-hidden');

  // Un-dim the selected node, its neighbors; show connected edges
  node.removeClass('dimmed').addClass('highlighted');
  neighbors.removeClass('dimmed').addClass('highlighted');
  connectedEdges.removeClass('highlight-hidden').addClass('highlighted');

  // Also un-dim compound parents
  node.ancestors().removeClass('dimmed');
  neighbors.ancestors().removeClass('dimmed');
}

/**
 * Clear all highlight/dim/hidden classes.
 */
export function clearHighlights(cy) {
  cy.elements().removeClass('dimmed highlighted highlight-hidden');
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
