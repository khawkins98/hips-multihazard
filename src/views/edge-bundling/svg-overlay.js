/**
 * @module views/edge-bundling/svg-overlay
 * SVG layer for hazard nodes, type arcs, and labels.
 * Sits on top of the canvas edge layer for crisp interactivity.
 */
import { select } from 'd3-selection';
import { arc as d3Arc } from 'd3-shape';
import { getTypeDef, HAZARD_TYPES } from '../../data/hazard-types.js';
import { polarToCartesian } from './layout.js';
import {
  ARC_THICKNESS, ARC_NODE_GAP, TYPE_LABEL_OFFSET, LABEL_OFFSET,
  NODE_RADIUS_MIN, NODE_RADIUS_MAX, ISOLATED_RADIUS, ISOLATED_OPACITY,
} from './constants.js';

/**
 * Create the SVG overlay with nodes, arcs, and labels.
 * @param {SVGElement} svg - The SVG element
 * @param {object} layoutData - { root, leaves, typeArcs, clusterArcs }
 * @param {number} radius - The layout radius
 * @returns {object} SVG API with update methods
 */
export function createSvgOverlay(svg, layoutData, radius) {
  const { leaves, typeArcs } = layoutData;
  const svgSel = select(svg);

  // Clear previous content (preserve nothing)
  svgSel.selectAll('*').remove();

  // Add background rect for click-to-deselect (not in main group, so it doesn't zoom)
  svgSel.append('rect')
    .attr('class', 'eb-bg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('fill', 'transparent');

  // Create main group (will be transformed by zoom)
  const g = svgSel.append('g').attr('class', 'eb-main');

  // Compute node radius scale
  const maxConn = Math.max(1, ...leaves.map(l => l.data.connectionCount || 0));

  function nodeRadius(d) {
    if ((d.data.connectionCount || 0) === 0) return ISOLATED_RADIUS;
    const t = (d.data.connectionCount || 0) / maxConn;
    return NODE_RADIUS_MIN + t * (NODE_RADIUS_MAX - NODE_RADIUS_MIN);
  }

  // ---- Type arcs ----
  const arcGroup = g.append('g').attr('class', 'eb-type-arcs');
  const arcGen = d3Arc();
  const innerR = radius + ARC_NODE_GAP;
  const outerR = innerR + ARC_THICKNESS;

  const arcData = [];
  for (const [typeName, arc] of typeArcs) {
    arcData.push({
      typeName,
      ...arc,
      startRad: ((arc.startAngle - 90) * Math.PI) / 180,
      endRad: ((arc.endAngle - 90) * Math.PI) / 180,
    });
  }

  arcGroup.selectAll('.eb-type-arc')
    .data(arcData)
    .enter()
    .append('path')
    .attr('class', 'eb-type-arc')
    .attr('d', d => arcGen({
      innerRadius: innerR,
      outerRadius: outerR,
      startAngle: d.startRad + Math.PI / 2,
      endAngle: d.endRad + Math.PI / 2,
    }))
    .attr('fill', d => d.color)
    .attr('opacity', 0.8)
    .attr('data-type', d => d.typeName);

  // ---- Type labels ----
  const typeLabelGroup = g.append('g').attr('class', 'eb-type-labels');

  typeLabelGroup.selectAll('.eb-type-label')
    .data(arcData)
    .enter()
    .append('text')
    .attr('class', 'eb-type-label')
    .attr('transform', d => {
      const pos = polarToCartesian(d.centerAngle, outerR + TYPE_LABEL_OFFSET);
      const angle = d.centerAngle - 90;
      const flip = angle > 90 && angle < 270;
      return `translate(${pos.x},${pos.y}) rotate(${flip ? angle + 180 : angle})`;
    })
    .attr('text-anchor', d => {
      const angle = d.centerAngle - 90;
      return (angle > 90 && angle < 270) ? 'end' : 'start';
    })
    .attr('dy', '0.35em')
    .attr('fill', d => d.color)
    .attr('font-size', '10px')
    .attr('font-weight', '600')
    .text(d => {
      const def = getTypeDef(d.typeName);
      return def.short;
    });

  // ---- Hazard nodes ----
  const nodeGroup = g.append('g').attr('class', 'eb-nodes');

  const nodeEls = nodeGroup.selectAll('.eb-node')
    .data(leaves)
    .enter()
    .append('g')
    .attr('class', 'eb-node')
    .attr('transform', d => {
      const pos = polarToCartesian(d.x, d.y);
      return `translate(${pos.x},${pos.y})`;
    })
    .attr('data-id', d => d.data.name);

  nodeEls.append('circle')
    .attr('r', d => nodeRadius(d))
    .attr('fill', d => d.data.color)
    .attr('opacity', d => (d.data.connectionCount || 0) === 0 ? ISOLATED_OPACITY : 0.85)
    .attr('stroke', '#fff')
    .attr('stroke-width', 0.5);

  // ---- Hazard labels (hidden by default, shown on hover/zoom) ----
  const labelGroup = g.append('g').attr('class', 'eb-labels');

  const labelEls = labelGroup.selectAll('.eb-label')
    .data(leaves)
    .enter()
    .append('text')
    .attr('class', 'eb-label')
    .attr('transform', d => {
      const pos = polarToCartesian(d.x, d.y);
      const angle = d.x - 90;
      const flip = angle > 90 && angle < 270;
      const offset = nodeRadius(d) + LABEL_OFFSET;
      const labelPos = polarToCartesian(d.x, d.y + offset);
      return `translate(${labelPos.x},${labelPos.y}) rotate(${flip ? angle + 180 : angle})`;
    })
    .attr('text-anchor', d => {
      const angle = d.x - 90;
      return (angle > 90 && angle < 270) ? 'end' : 'start';
    })
    .attr('dy', '0.35em')
    .attr('fill', d => d.data.color)
    .attr('font-size', '9px')
    .attr('opacity', 0)
    .text(d => d.data.label);

  // Build leaf map for quick lookups
  const leafMap = new Map();
  for (const leaf of leaves) {
    leafMap.set(leaf.data.name, leaf);
  }

  return {
    g,
    leafMap,
    nodeRadius,

    /**
     * Set which labels are visible based on zoom level.
     * @param {'none'|'hubs'|'all'} mode
     * @param {number} hubThreshold - connectionCount threshold for hubs
     */
    setLabelVisibility(mode, hubThreshold) {
      labelEls.attr('opacity', d => {
        if (mode === 'all') return 1;
        if (mode === 'hubs' && (d.data.connectionCount || 0) >= hubThreshold) return 1;
        return 0;
      });
    },

    /**
     * Show labels only for specific node IDs (hover/click highlight).
     * @param {Set<string>} nodeIds
     */
    showLabelsFor(nodeIds) {
      labelEls.attr('opacity', d => nodeIds.has(d.data.name) ? 1 : 0);
    },

    /**
     * Highlight specific nodes, dim the rest.
     * @param {Set<string>|null} highlightedIds - null to clear highlighting
     */
    highlightNodes(highlightedIds) {
      if (!highlightedIds) {
        // Restore all
        nodeEls.select('circle')
          .attr('opacity', d => (d.data.connectionCount || 0) === 0 ? ISOLATED_OPACITY : 0.85)
          .attr('stroke', '#fff')
          .attr('stroke-width', 0.5);
        arcGroup.selectAll('.eb-type-arc').attr('opacity', 0.8);
        return;
      }

      nodeEls.select('circle')
        .attr('opacity', d => highlightedIds.has(d.data.name) ? 1 : 0.08)
        .attr('stroke', d => highlightedIds.has(d.data.name) ? '#fff' : 'transparent')
        .attr('stroke-width', d => highlightedIds.has(d.data.name) ? 1 : 0.5);
    },

    /**
     * Highlight type arcs by name.
     * @param {Set<string>|null} typeNames - null to clear
     */
    highlightTypeArcs(typeNames) {
      if (!typeNames) {
        arcGroup.selectAll('.eb-type-arc').attr('opacity', 0.8);
        return;
      }
      arcGroup.selectAll('.eb-type-arc')
        .attr('opacity', d => typeNames.has(d.typeName) ? 1 : 0.2);
    },

    /**
     * Hide nodes of specific types.
     * @param {Set<string>} hiddenTypes
     */
    filterTypes(hiddenTypes) {
      nodeEls
        .attr('display', d => hiddenTypes.has(d.data.typeName) ? 'none' : null);
      labelEls
        .attr('display', d => hiddenTypes.has(d.data.typeName) ? 'none' : null);
      arcGroup.selectAll('.eb-type-arc')
        .attr('display', d => hiddenTypes.has(d.typeName) ? 'none' : null);
      typeLabelGroup.selectAll('.eb-type-label')
        .attr('display', d => hiddenTypes.has(d.typeName) ? 'none' : null);
    },
  };
}
