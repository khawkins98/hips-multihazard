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

    // Highlighted neighbor nodes
    {
      selector: 'node.highlighted',
      style: {
        'border-width': 3,
        'border-color': '#FFD600',
        'opacity': 1,
        'z-index': 100,
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

    // ── Corridor mode ──

    // Corridor meta-nodes (type bubbles)
    {
      selector: 'node[?isCorridor]',
      style: {
        'label': 'data(label)',
        'background-color': 'data(color)',
        'color': '#fff',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': '14px',
        'font-weight': 'bold',
        'text-wrap': 'wrap',
        'text-max-width': '90px',
        'width': 'mapData(hazardCount, 9, 83, 55, 130)',
        'height': 'mapData(hazardCount, 9, 83, 55, 130)',
        'border-width': 3,
        'border-color': '#fff',
        'text-outline-color': 'data(color)',
        'text-outline-width': 2,
        'shadow-blur': 15,
        'shadow-color': 'data(color)',
        'shadow-opacity': 0.6,
        'z-index': 10,
        'transition-property': 'opacity, border-color, shadow-blur, shadow-opacity',
        'transition-duration': '200ms',
      },
    },

    // Corridor edges (weighted)
    {
      selector: 'edge[?isCorridor]',
      style: {
        'width': 'mapData(weight, 1, 200, 2, 18)',
        'line-color': '#5b9cf5',
        'target-arrow-color': '#5b9cf5',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'arrow-scale': 1.2,
        'opacity': 'mapData(weight, 1, 200, 0.3, 0.95)',
        'label': 'data(label)',
        'font-size': '11px',
        'color': '#ccc',
        'text-outline-color': '#1a1a2e',
        'text-outline-width': 2,
        'text-rotation': 'autorotate',
        'shadow-blur': 8,
        'shadow-color': '#5b9cf5',
        'shadow-opacity': 0.4,
        'z-index': 5,
        'transition-property': 'opacity, line-color, width, shadow-opacity',
        'transition-duration': '200ms',
      },
    },

    // Corridor self-loop edges
    {
      selector: 'edge[?selfLoop]',
      style: {
        'curve-style': 'loop',
        'loop-direction': '45deg',
        'loop-sweep': '60deg',
      },
    },

    // Highlighted corridor edge
    {
      selector: 'edge[?isCorridor].highlighted',
      style: {
        'line-color': '#FFD600',
        'target-arrow-color': '#FFD600',
        'shadow-color': '#FFD600',
        'shadow-opacity': 0.8,
        'shadow-blur': 15,
        'opacity': 1,
        'z-index': 999,
        'color': '#FFD600',
      },
    },

    // Highlighted corridor node
    {
      selector: 'node[?isCorridor].highlighted',
      style: {
        'border-color': '#FFD600',
        'border-width': 4,
        'shadow-color': '#FFD600',
        'shadow-opacity': 0.8,
        'shadow-blur': 25,
        'z-index': 100,
      },
    },
  ];
}
