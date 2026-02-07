/**
 * Cytoscape stylesheet for hazard graph visualization.
 */
export function getStylesheet() {
  return [
    // Hazard nodes
    {
      selector: 'node[!isCompound]',
      style: {
        'label': 'data(label)',
        'background-color': 'data(color)',
        'color': '#fff',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': '10px',
        'text-wrap': 'ellipsis',
        'text-max-width': '80px',
        'width': 'mapData(connectionCount, 0, 60, 20, 60)',
        'height': 'mapData(connectionCount, 0, 60, 20, 60)',
        'border-width': 2,
        'border-color': '#fff',
        'text-outline-color': 'data(color)',
        'text-outline-width': 2,
        'z-index': 10,
        'min-zoomed-font-size': 8,
        'transition-property': 'opacity, width, height, border-width',
        'transition-duration': '200ms',
      },
    },

    // Compound nodes (type groups)
    {
      selector: 'node[?isCompound][compoundType="type"]',
      style: {
        'background-color': 'data(color)',
        'background-opacity': 0.08,
        'border-width': 2,
        'border-color': 'data(color)',
        'border-opacity': 0.4,
        'label': 'data(label)',
        'font-size': '16px',
        'font-weight': 'bold',
        'color': 'data(color)',
        'text-valign': 'top',
        'text-halign': 'center',
        'text-margin-y': -8,
        'padding': '20px',
        'shape': 'roundrectangle',
      },
    },

    // Compound nodes (cluster groups)
    {
      selector: 'node[?isCompound][compoundType="cluster"]',
      style: {
        'background-color': '#e0e0e0',
        'background-opacity': 0.15,
        'border-width': 1,
        'border-color': '#bbb',
        'border-style': 'dashed',
        'label': 'data(label)',
        'font-size': '11px',
        'color': '#666',
        'text-valign': 'top',
        'text-halign': 'center',
        'text-margin-y': -4,
        'padding': '10px',
        'shape': 'roundrectangle',
      },
    },

    // Edges (causal links)
    {
      selector: 'edge',
      style: {
        'width': 1.5,
        'line-color': '#999',
        'target-arrow-color': '#999',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'arrow-scale': 0.8,
        'opacity': 0.5,
        'transition-property': 'opacity, line-color, width',
        'transition-duration': '200ms',
      },
    },

    // Selected node
    {
      selector: 'node:selected',
      style: {
        'border-width': 4,
        'border-color': '#FFD600',
        'z-index': 999,
      },
    },

    // Highlighted edges (from interaction)
    {
      selector: 'edge.highlighted',
      style: {
        'width': 3,
        'line-color': '#FF5722',
        'target-arrow-color': '#FF5722',
        'opacity': 1,
        'z-index': 999,
      },
    },

    // Semantic zoom: macro — hide all individual labels
    {
      selector: 'node.sz-label-hidden',
      style: {
        'text-opacity': 0,
      },
    },

    // Semantic zoom: meso — hub nodes show labels
    {
      selector: 'node.sz-hub-label',
      style: {
        'text-opacity': 0.9,
        'min-zoomed-font-size': 4,
      },
    },

    // Semantic zoom: micro — all labels visible
    {
      selector: 'node.sz-label-visible',
      style: {
        'text-opacity': 1,
        'min-zoomed-font-size': 4,
      },
    },

    // Highlighted neighbor nodes — after semantic zoom so labels always show
    {
      selector: 'node.highlighted',
      style: {
        'border-width': 3,
        'border-color': '#FFD600',
        'opacity': 1,
        'z-index': 100,
        'text-opacity': 1,
        'min-zoomed-font-size': 0,
      },
    },

    // Hyper-route edges (dense cross-type corridors)
    {
      selector: 'edge.hyper-route',
      style: {
        'width': 1.5,
        'line-color': '#D4AA40',
        'target-arrow-color': '#D4AA40',
        'opacity': 0.15,
        'z-index': 50,
      },
    },

    // Zoom-scaled hyper-route widths: thicker zoomed out, thinner zoomed in
    {
      selector: 'edge.hyper-route.sz-edge-macro',
      style: { 'width': 2.5, 'opacity': 0.2 },
    },
    {
      selector: 'edge.hyper-route.sz-edge-meso',
      style: { 'width': 1.5, 'opacity': 0.15 },
    },
    {
      selector: 'edge.hyper-route.sz-edge-micro',
      style: { 'width': 0.1, 'opacity': 0.05 },
    },

    // Hyper-route bridge nodes
    {
      selector: 'node.hyper-route-node',
      style: {
        'border-width': 2,
        'border-color': '#D4AA40',
        'border-opacity': 0.35,
      },
    },

    // Visually hide compound group boxes without hiding children
    {
      selector: 'node.compound-invisible',
      style: {
        'background-opacity': 0,
        'border-width': 0,
        'text-opacity': 0,
        'padding': '0px',
      },
    },

    // Dimmed elements (when a node is selected, others dim)
    {
      selector: '.dimmed',
      style: {
        'opacity': 0.15,
      },
    },

    // Hidden elements
    {
      selector: '.hidden',
      style: {
        'display': 'none',
      },
    },

    // Hidden during highlight (separate from filter/toggle hidden)
    {
      selector: '.highlight-hidden',
      style: {
        'display': 'none',
      },
    },

  ];
}
