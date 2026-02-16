/**
 * @module views/cascade/cascade-render
 * D3 tree layout and rendering for the bidirectional cascade view.
 */
import { select } from 'd3-selection';
import 'd3-transition';
import { tree as d3Tree, hierarchy as d3Hierarchy } from 'd3-hierarchy';
import { linkHorizontal } from 'd3-shape';
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';
import { getTypeDef } from '../../data/hazard-types.js';
import { esc } from '../../utils/dom.js';
import {
  NODE_WIDTH, NODE_HEIGHT, LEVEL_SPACING, NODE_SPACING,
  EXPAND_DURATION, COLLAPSE_DURATION,
} from './constants.js';

/**
 * Render the cascade tree into an SVG.
 * @param {SVGElement} svg - The SVG element
 * @param {object} effectsTree - Right-side tree (what it causes)
 * @param {object} triggersTree - Left-side tree (what causes it)
 * @param {object} rootNode - The root node data
 * @param {object} callbacks - { onNodeClick, onGhostClick, onExpand }
 * @returns {object} Render API
 */
export function renderCascade(svg, effectsTree, triggersTree, rootNode, callbacks) {
  const svgSel = select(svg);
  svgSel.selectAll('*').remove();

  const width = parseInt(svg.getAttribute('width')) || svg.parentElement?.clientWidth || 800;
  const height = parseInt(svg.getAttribute('height')) || svg.parentElement?.clientHeight || 600;

  // Set up zoom
  const g = svgSel.append('g').attr('class', 'cascade-main');
  const zoomBehavior = d3Zoom()
    .scaleExtent([0.3, 3])
    .on('zoom', (event) => {
      g.attr('transform', event.transform.toString());
    });
  svgSel.call(zoomBehavior);

  // Center on root
  const initialTransform = zoomIdentity.translate(width / 2, height / 2);
  svgSel.call(zoomBehavior.transform, initialTransform);

  const treeLayout = d3Tree().nodeSize([NODE_SPACING, LEVEL_SPACING]);
  const linkGen = linkHorizontal().x(d => d.y).y(d => d.x);

  // ---- Render effects (right side) ----
  if (effectsTree && effectsTree.children?.length > 0) {
    const effectsRoot = d3Hierarchy(effectsTree);
    treeLayout(effectsRoot);
    renderSubtree(g, effectsRoot, 'effects', 1, callbacks);
  }

  // ---- Render triggers (left side, mirrored) ----
  if (triggersTree && triggersTree.children?.length > 0) {
    const triggersRoot = d3Hierarchy(triggersTree);
    treeLayout(triggersRoot);
    // Negate x (which is horizontal in our rotated layout) to mirror
    triggersRoot.each(d => { d.y = -d.y; });
    renderSubtree(g, triggersRoot, 'triggers', -1, callbacks);
  }

  // ---- Render root node ----
  const rootGroup = g.append('g')
    .attr('class', 'cascade-root')
    .attr('transform', 'translate(0, 0)');

  const typeDef = getTypeDef(rootNode.typeName);
  const cc = (rootNode.causes?.length || 0) + (rootNode.causedBy?.length || 0);

  rootGroup.append('rect')
    .attr('x', -NODE_WIDTH / 2)
    .attr('y', -NODE_HEIGHT / 2)
    .attr('width', NODE_WIDTH)
    .attr('height', NODE_HEIGHT)
    .attr('rx', NODE_HEIGHT / 2)
    .attr('fill', typeDef.color)
    .attr('opacity', 0.9)
    .attr('stroke', '#fff')
    .attr('stroke-width', 2);

  rootGroup.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .attr('fill', '#fff')
    .attr('font-size', '11px')
    .attr('font-weight', '600')
    .text(truncateLabel(rootNode.label, 22));

  rootGroup.append('title')
    .text(rootNode.label);

  rootGroup.style('cursor', 'pointer')
    .on('click', () => {
      callbacks.onNodeClick(rootNode.id);
    });

  // Add direction labels
  g.append('text')
    .attr('x', LEVEL_SPACING * 0.4)
    .attr('y', -NODE_SPACING * 2)
    .attr('text-anchor', 'start')
    .attr('fill', 'var(--text-dim)')
    .attr('font-size', '11px')
    .attr('font-style', 'italic')
    .text('Effects (what it causes) →');

  g.append('text')
    .attr('x', -LEVEL_SPACING * 0.4)
    .attr('y', -NODE_SPACING * 2)
    .attr('text-anchor', 'end')
    .attr('fill', 'var(--text-dim)')
    .attr('font-size', '11px')
    .attr('font-style', 'italic')
    .text('← Triggers (what causes it)');

  return {
    zoomIn() {
      svgSel.transition().duration(200).call(zoomBehavior.scaleBy, 1.3);
    },
    zoomOut() {
      svgSel.transition().duration(200).call(zoomBehavior.scaleBy, 1 / 1.3);
    },
    fit() {
      svgSel.transition().duration(300).call(zoomBehavior.transform, initialTransform);
    },
    reset() {
      svgSel.transition().duration(300).call(zoomBehavior.transform, initialTransform);
    },
  };
}

/**
 * Render one side of the cascade tree.
 */
function renderSubtree(g, root, className, direction, callbacks) {
  const group = g.append('g').attr('class', `cascade-${className}`);

  // Draw links
  const links = root.links().filter(d => d.source.depth > 0 || true);
  group.selectAll(`.cascade-link-${className}`)
    .data(links)
    .enter()
    .append('path')
    .attr('class', `cascade-link cascade-link-${className}`)
    .attr('d', d => {
      return linkHorizontal()
        .x(n => n.y)
        .y(n => n.x)
        ({ source: d.source, target: d.target });
    })
    .attr('fill', 'none')
    .attr('stroke', d => d.target.data.ghost ? 'var(--text-dim)' : 'var(--edge-color)')
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', d => d.target.data.ghost ? '4,4' : null)
    .attr('opacity', 0.6);

  // Draw nodes (skip root at depth 0, it's rendered separately)
  const nodes = root.descendants().filter(d => d.depth > 0);
  const nodeGroups = group.selectAll(`.cascade-node-${className}`)
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', d => `cascade-node cascade-node-${className}${d.data.ghost ? ' ghost' : ''}`)
    .attr('transform', d => `translate(${d.y}, ${d.x})`);

  // Node capsules
  nodeGroups.append('rect')
    .attr('x', direction === 1 ? 0 : -NODE_WIDTH)
    .attr('y', -NODE_HEIGHT / 2)
    .attr('width', NODE_WIDTH)
    .attr('height', NODE_HEIGHT)
    .attr('rx', NODE_HEIGHT / 2)
    .attr('fill', d => {
      const td = getTypeDef(d.data.typeName);
      return td.color;
    })
    .attr('opacity', d => d.data.ghost ? 0.4 : 0.75)
    .attr('stroke', d => d.data.ghost ? 'var(--text-dim)' : 'transparent')
    .attr('stroke-width', d => d.data.ghost ? 1 : 0)
    .attr('stroke-dasharray', d => d.data.ghost ? '3,3' : null);

  // Labels
  nodeGroups.append('text')
    .attr('x', direction === 1 ? 14 : -14)
    .attr('text-anchor', direction === 1 ? 'start' : 'end')
    .attr('dy', '0.35em')
    .attr('fill', '#fff')
    .attr('font-size', '10px')
    .text(d => truncateLabel(d.data.label, 20));

  nodeGroups.append('title')
    .text(d => `${d.data.label} (${d.data.typeName})`);

  // Connection count badge
  nodeGroups.append('circle')
    .attr('cx', direction === 1 ? NODE_WIDTH + 6 : -NODE_WIDTH - 6)
    .attr('cy', 0)
    .attr('r', 8)
    .attr('fill', 'var(--bg-elevated)')
    .attr('stroke', 'var(--border)')
    .attr('stroke-width', 1);

  nodeGroups.append('text')
    .attr('x', direction === 1 ? NODE_WIDTH + 6 : -NODE_WIDTH - 6)
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .attr('fill', 'var(--text-muted)')
    .attr('font-size', '8px')
    .text(d => d.data.connectionCount || 0);

  // Click handlers
  nodeGroups.style('cursor', 'pointer')
    .on('click', function (event, d) {
      event.stopPropagation();
      if (d.data.ghost) {
        callbacks.onGhostClick(d.data.id);
      } else if (!d.data.expanded && d.data.totalChildren > 0) {
        callbacks.onExpand(d.data.id, direction === 1 ? 'effects' : 'triggers');
      } else {
        callbacks.onNodeClick(d.data.id);
      }
    });

  // Expand indicator for non-expanded nodes with children
  nodeGroups.filter(d => !d.data.expanded && d.data.totalChildren > 0 && !d.data.ghost)
    .append('text')
    .attr('x', direction === 1 ? NODE_WIDTH - 8 : -NODE_WIDTH + 8)
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .attr('fill', '#fff')
    .attr('font-size', '9px')
    .attr('opacity', 0.7)
    .text(d => `+${d.data.totalChildren}`);

  // Truncation indicator
  const truncatedNodes = nodes.filter(d => d.data.truncated > 0);
  if (truncatedNodes.length > 0) {
    for (const d of truncatedNodes) {
      const lastChild = d.children?.[d.children.length - 1];
      if (!lastChild) continue;

      group.append('text')
        .attr('x', lastChild.y + (direction === 1 ? NODE_WIDTH / 2 : -NODE_WIDTH / 2))
        .attr('y', lastChild.x + NODE_SPACING * 0.8)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--text-dim)')
        .attr('font-size', '10px')
        .attr('font-style', 'italic')
        .text(`+${d.data.truncated} more`);
    }
  }
}

function truncateLabel(label, max) {
  if (!label) return '';
  return label.length > max ? label.slice(0, max - 1) + '...' : label;
}
