/**
 * @module views/cascade/cascade
 * Main orchestrator for the cascade (causal chain) explorer view.
 * Shows a bidirectional expandable tree: effects rightward, triggers leftward.
 */
import { buildAdjacencyIndex, buildCascadeTree } from './cascade-data.js';
import { renderCascade } from './cascade-render.js';
import { DEFAULT_DEPTH, MAX_DEPTH } from './constants.js';
import { getTypeDef } from '../../data/hazard-types.js';
import { esc } from '../../utils/dom.js';

/**
 * Pick suggested hazards for the empty state: most connected, diverse across types.
 */
function getSuggestions(data, effectsIndex, triggersIndex) {
  const scored = data.nodes.map(n => ({
    id: n.id,
    label: n.label,
    typeName: n.typeName,
    color: getTypeDef(n.typeName).color,
    effects: (effectsIndex.get(n.id) || []).length,
    triggers: (triggersIndex.get(n.id) || []).length,
    total: (effectsIndex.get(n.id) || []).length + (triggersIndex.get(n.id) || []).length,
  }));
  scored.sort((a, b) => b.total - a.total);

  // Pick at most one per type, up to 8 total
  const seen = new Set();
  const picks = [];
  for (const s of scored) {
    if (seen.has(s.typeName)) continue;
    seen.add(s.typeName);
    picks.push(s);
    if (picks.length >= 8) break;
  }
  return picks;
}

/**
 * Create and manage the cascade view.
 * @param {HTMLElement} container - The graph container element
 * @param {object} data - Snapshot data
 * @param {object} bus - Event bus
 * @returns {object} View API
 */
export function createCascadeView(container, data, bus) {
  let svg = null;
  let renderer = null;
  let directionLabels = null;
  let currentRootId = null;
  let currentDepth = DEFAULT_DEPTH;
  let active = false;

  // Build adjacency indices once
  const { effectsIndex, triggersIndex, nodeById } = buildAdjacencyIndex(data);

  // Pre-compute suggested hazards: most connected, one per type
  const suggestions = getSuggestions(data, effectsIndex, triggersIndex);

  /**
   * Initialize the view with an optional root node.
   * @param {{ rootId?: string }} opts
   */
  function init(opts = {}) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('cascade-svg');
    container.appendChild(svg);

    // Direction labels — fixed overlay at top of pane
    directionLabels = document.createElement('div');
    directionLabels.className = 'cascade-direction-labels hidden';
    directionLabels.innerHTML =
      '<span class="cascade-dir-label cascade-dir-triggers">\u2190 Triggers</span>' +
      '<span class="cascade-dir-label cascade-dir-effects">Effects \u2192</span>';
    container.appendChild(directionLabels);

    const rect = container.getBoundingClientRect();
    svg.setAttribute('width', rect.width);
    svg.setAttribute('height', rect.height);

    if (opts.rootId) {
      renderTree(opts.rootId);
    } else {
      showPlaceholder();
    }
  }

  function showPlaceholder() {
    if (!svg) return;
    if (directionLabels) directionLabels.classList.add('hidden');
    const rect = container.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    svg.innerHTML = '';

    // Prompt text
    const prompt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    prompt.setAttribute('x', cx);
    prompt.setAttribute('y', cy - 80);
    prompt.setAttribute('text-anchor', 'middle');
    prompt.setAttribute('fill', 'var(--text-muted)');
    prompt.setAttribute('font-size', '14px');
    prompt.textContent = 'Select a hazard to explore its causal cascade';
    svg.appendChild(prompt);

    // "Or try one of these:" label
    const subLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    subLabel.setAttribute('x', cx);
    subLabel.setAttribute('y', cy - 50);
    subLabel.setAttribute('text-anchor', 'middle');
    subLabel.setAttribute('fill', 'var(--text-muted)');
    subLabel.setAttribute('font-size', '12px');
    subLabel.textContent = 'Or try one of these:';
    svg.appendChild(subLabel);

    // Render suggestion chips using foreignObject for easier HTML layout
    const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    fo.setAttribute('x', cx - 240);
    fo.setAttribute('y', cy - 40);
    fo.setAttribute('width', 480);
    fo.setAttribute('height', 200);
    svg.appendChild(fo);

    const wrap = document.createElement('div');
    wrap.className = 'cascade-suggestions';
    fo.appendChild(wrap);

    for (const s of suggestions) {
      const chip = document.createElement('button');
      chip.className = 'cascade-suggestion-chip';
      chip.style.setProperty('--chip-color', s.color);
      chip.innerHTML = `<span class="chip-dot" style="background:${esc(s.color)}"></span>${esc(s.label)}`;
      chip.title = `${s.typeName} — ${s.effects} effects, ${s.triggers} triggers`;
      chip.addEventListener('click', () => renderTree(s.id));
      wrap.appendChild(chip);
    }
  }

  function renderTree(rootId) {
    currentRootId = rootId;
    const rootNode = nodeById.get(rootId);
    if (!rootNode) return;
    if (directionLabels) directionLabels.classList.remove('hidden');

    // Build trees for both directions using current depth
    const visited = new Set();
    const effectsTree = buildCascadeTree(effectsIndex, nodeById, rootId, currentDepth, new Set(visited));
    const triggersTree = buildCascadeTree(triggersIndex, nodeById, rootId, currentDepth, new Set(visited));

    renderer = renderCascade(svg, effectsTree, triggersTree, rootNode, {
      onNodeClick(id) {
        renderTree(id);
        bus.emit('node:selected', { id });
      },
      onGhostClick(id) {
        renderTree(id);
        bus.emit('node:selected', { id });
      },
      onExpand(id, direction) {
        renderTree(id);
        bus.emit('node:selected', { id });
      },
    });
  }

  // Listen for cascade:open events
  bus.on('cascade:open', ({ rootId }) => {
    if (active && rootId) {
      renderTree(rootId);
    }
  });

  // Listen for node:selected to update cascade if active
  bus.on('node:selected', ({ id }) => {
    if (active && id !== currentRootId) {
      // Don't auto-rerender - let user choose via "Explore Cascade" button
    }
  });

  return {
    type: 'cascade',

    activate(opts = {}) {
      active = true;
      init(opts);
    },

    deactivate() {
      active = false;
      renderer = null;
      if (svg) svg.remove();
      svg = null;
      if (directionLabels) directionLabels.remove();
      directionLabels = null;
    },

    destroy() {
      this.deactivate();
    },

    focusNode(nodeId) {
      if (!active) return;
      renderTree(nodeId);
      bus.emit('node:selected', { id: nodeId });
    },

    setDepth(depth) {
      currentDepth = Math.max(1, Math.min(depth, MAX_DEPTH));
      if (active && currentRootId) renderTree(currentRootId);
    },

    filterTypes() { /* Not applicable to cascade */ },
    setEdgeVisibility() { /* Not applicable to cascade */ },

    highlightNodes() { /* Not applicable to cascade */ },
    highlightEdges() { /* Not applicable to cascade */ },
    clearHighlights() { /* Not applicable to cascade */ },

    zoomIn() { renderer?.zoomIn?.(); },
    zoomOut() { renderer?.zoomOut?.(); },
    fit() { renderer?.fit?.(); },
    reset() { renderer?.reset?.(); },

    resize() {
      if (!active || !svg) return;
      const rect = container.getBoundingClientRect();
      svg.setAttribute('width', rect.width);
      svg.setAttribute('height', rect.height);
      if (currentRootId) renderTree(currentRootId);
    },
  };
}

