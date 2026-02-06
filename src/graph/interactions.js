/**
 * Graph interaction handlers: tap, hover, neighborhood highlight.
 */

let currentMode = 'type';

/**
 * Update the current interaction mode (called when grouping changes).
 */
export function setInteractionMode(mode) {
  currentMode = mode;
}

/**
 * Set up interaction handlers on the Cytoscape instance.
 * @param {object} cy - Cytoscape instance
 * @param {object} bus - Event bus for cross-module communication
 */
export function setupInteractions(cy, bus) {
  const tooltip = createTooltip();

  // Click on a hazard node (non-corridor)
  cy.on('tap', 'node[!isCompound][!isCorridor]', (evt) => {
    if (currentMode === 'corridor') return;
    const node = evt.target;
    const nodeId = node.id();

    clearHighlights(cy);
    node.select();
    highlightNeighborhood(cy, node);
    bus.emit('node:selected', { id: nodeId });
  });

  // Click on a corridor meta-node
  cy.on('tap', 'node[?isCorridor]', (evt) => {
    const node = evt.target;
    clearHighlights(cy);
    node.select();

    // Dim everything, then highlight this node + its connected edges + neighbors
    cy.elements().addClass('dimmed');
    const connectedEdges = node.connectedEdges();
    const neighbors = connectedEdges.connectedNodes();

    node.removeClass('dimmed').addClass('highlighted');
    neighbors.removeClass('dimmed').addClass('highlighted');
    connectedEdges.removeClass('dimmed').addClass('highlighted');

    bus.emit('corridor:selected', {
      type: 'node',
      typeName: node.data('fullTypeName'),
      hazardCount: node.data('hazardCount'),
    });
  });

  // Click on a corridor edge
  cy.on('tap', 'edge[?isCorridor]', (evt) => {
    const edge = evt.target;
    clearHighlights(cy);

    cy.elements().addClass('dimmed');
    edge.removeClass('dimmed').addClass('highlighted');
    edge.source().removeClass('dimmed').addClass('highlighted');
    edge.target().removeClass('dimmed').addClass('highlighted');

    bus.emit('corridor:selected', {
      type: 'edge',
      sourceType: edge.data('sourceFullType'),
      targetType: edge.data('targetFullType'),
      sourceName: edge.data('sourceTypeName'),
      targetName: edge.data('targetTypeName'),
      weight: edge.data('weight'),
    });
  });

  // Click on background to deselect
  cy.on('tap', (evt) => {
    if (evt.target === cy) {
      clearHighlights(cy);
      cy.elements().unselect();
      bus.emit('node:deselected');
    }
  });

  // Hover effects + tooltip for regular nodes
  cy.on('mouseover', 'node[!isCompound][!isCorridor]', (evt) => {
    if (currentMode === 'corridor') return;
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

  // Hover on corridor node
  cy.on('mouseover', 'node[?isCorridor]', (evt) => {
    const node = evt.target;
    document.getElementById('cy').style.cursor = 'pointer';
    const d = node.data();
    tooltip.show(
      `<strong>${esc(d.label)}</strong><br>` +
      `<span class="tt-conns">${d.hazardCount} hazard${d.hazardCount !== 1 ? 's' : ''}</span>`,
      evt.renderedPosition || evt.position
    );
  });

  // Hover on corridor edge
  cy.on('mouseover', 'edge[?isCorridor]', (evt) => {
    const edge = evt.target;
    document.getElementById('cy').style.cursor = 'pointer';
    const d = edge.data();
    tooltip.show(
      `<strong>${esc(d.sourceTypeName)} &rarr; ${esc(d.targetTypeName)}</strong><br>` +
      `<span class="tt-conns">${d.weight} causal link${d.weight !== 1 ? 's' : ''}</span>`,
      evt.renderedPosition || evt.position
    );
  });

  cy.on('mousemove', 'node, edge', (evt) => {
    tooltip.move(evt.renderedPosition || evt.position);
  });

  cy.on('mouseout', 'node[!isCompound][!isCorridor]', (evt) => {
    if (currentMode === 'corridor') return;
    const node = evt.target;
    if (!node.selected()) {
      node.style('border-width', 2);
    }
    document.getElementById('cy').style.cursor = 'default';
    tooltip.hide();
  });

  cy.on('mouseout', 'node[?isCorridor], edge[?isCorridor]', () => {
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
 * Connected edges and neighbor nodes are highlighted; everything else is dimmed.
 */
export function highlightNeighborhood(cy, node) {
  clearHighlights(cy);

  const connectedEdges = node.connectedEdges();
  const neighbors = connectedEdges.connectedNodes();

  // Dim everything
  cy.elements().addClass('dimmed');

  // Un-dim the selected node, its neighbors, and connected edges
  node.removeClass('dimmed').addClass('highlighted');
  neighbors.removeClass('dimmed').addClass('highlighted');
  connectedEdges.removeClass('dimmed').addClass('highlighted');

  // Also un-dim compound parents
  node.ancestors().removeClass('dimmed');
  neighbors.ancestors().removeClass('dimmed');
}

/**
 * Clear all highlight/dim classes.
 */
export function clearHighlights(cy) {
  cy.elements().removeClass('dimmed highlighted');
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
