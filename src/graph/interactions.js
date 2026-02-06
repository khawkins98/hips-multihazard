/**
 * Graph interaction handlers: tap, hover, neighborhood highlight.
 */

/**
 * Set up interaction handlers on the Cytoscape instance.
 * @param {object} cy - Cytoscape instance
 * @param {object} bus - Event bus for cross-module communication
 */
export function setupInteractions(cy, bus) {
  // Click on a hazard node
  cy.on('tap', 'node[!isCompound]', (evt) => {
    const node = evt.target;
    const nodeId = node.id();

    // Clear previous highlights
    clearHighlights(cy);

    // Select this node
    node.select();

    // Highlight neighborhood
    highlightNeighborhood(cy, node);

    // Emit event for detail panel
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

  // Hover effects
  cy.on('mouseover', 'node[!isCompound]', (evt) => {
    const node = evt.target;
    node.style('border-width', 3);
    document.getElementById('cy').style.cursor = 'pointer';
  });

  cy.on('mouseout', 'node[!isCompound]', (evt) => {
    const node = evt.target;
    if (!node.selected()) {
      node.style('border-width', 2);
    }
    document.getElementById('cy').style.cursor = 'default';
  });
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
