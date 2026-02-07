/**
 * Insights drawer: bottom panel with 9 network-statistics cards.
 * Slides up from the bottom of #graph-container.
 */

let bus = null;
let drawerEl = null;
let activeCard = null;
let hasAnimated = false;

const CARDS = [
  // Network Structure
  {
    id: 'avg-degree',
    category: 'Network Structure',
    label: 'Avg connections',
    subtitle: (ins) => `${ins.avgDeclaredDegree.toFixed(1)} declared avg`,
    value: (ins) => ins.avgDegree.toFixed(1),
    numeric: (ins) => ins.avgDegree,
    format: 'decimal',
    click(ins) {
      return { nodeIds: ins.avgNodes };
    },
  },
  {
    id: 'most-connected',
    category: 'Network Structure',
    label: 'Most connected',
    subtitle: (ins) => `${ins.mostConnected.label} · ${ins.mostConnected.declaredDegree} declared`,
    value: (ins) => ins.mostConnected.degree,
    numeric: (ins) => ins.mostConnected.degree,
    format: 'int',
    click(ins) {
      bus.emit('node:focus', { id: ins.mostConnected.id });
      return null; // focus handles its own highlight
    },
  },
  {
    id: 'isolated',
    category: 'Network Structure',
    label: 'Isolated hazards',
    subtitle: (ins) => ins.inferredOnlyNodes.length > 0
      ? `+${ins.inferredOnlyNodes.length} more if declared-only`
      : 'zero connections',
    value: (ins) => ins.isolatedNodes.length,
    numeric: (ins) => ins.isolatedNodes.length,
    format: 'int',
    click(ins) {
      return { nodeIds: ins.isolatedNodes };
    },
  },
  // Cross-Domain Patterns
  {
    id: 'cross-type',
    category: 'Cross-Domain',
    label: 'Cross-type edges',
    subtitle: 'crossing type boundaries',
    value: (ins) => Math.round(ins.crossTypeRatio * 100) + '%',
    numeric: (ins) => ins.crossTypeRatio * 100,
    format: 'percent',
    click(ins) {
      return { nodeIds: ins.crossTypeNodeIds, edgeFilter: 'cross-type' };
    },
  },
  {
    id: 'top-type',
    category: 'Cross-Domain',
    label: 'Most connected type',
    subtitle: (ins) => ins.topType.name,
    value: (ins) => ins.topType.edgeCount.toLocaleString(),
    numeric: (ins) => ins.topType.edgeCount,
    format: 'int',
    click(ins) {
      return { nodeIds: ins.topTypeNodeIds };
    },
  },
  {
    id: 'densest-cluster',
    category: 'Cross-Domain',
    label: 'Densest cluster',
    subtitle: (ins) => ins.densestCluster.name,
    value: (ins) => Math.round(ins.densestCluster.density * 100) + '%',
    numeric: (ins) => ins.densestCluster.density * 100,
    format: 'percent',
    click(ins) {
      return { nodeIds: ins.densestCluster.nodeIds };
    },
  },
  // Data Quality
  {
    id: 'reciprocation',
    category: 'Data Quality',
    label: 'Edge reciprocation',
    subtitle: 'edges attested by both sides',
    value: (ins) => Math.round(ins.reciprocationRate * 100) + '%',
    numeric: (ins) => ins.reciprocationRate * 100,
    format: 'percent',
    click(ins) {
      return { nodeIds: ins.inferredEdgeNodeIds, edgeFilter: 'inferred' };
    },
  },
  {
    id: 'inferred-only',
    category: 'Data Quality',
    label: 'Inferred-only nodes',
    subtitle: 'connected solely by others\' declarations',
    value: (ins) => ins.inferredOnlyNodes.length,
    numeric: (ins) => ins.inferredOnlyNodes.length,
    format: 'int',
    click(ins) {
      return { nodeIds: ins.inferredOnlyNodes };
    },
  },
  {
    id: 'ref-coverage',
    category: 'Data Quality',
    label: 'Reference coverage',
    subtitle: 'hazards with external sources',
    value: (ins) => Math.round(ins.referenceCoverage * 100) + '%',
    numeric: (ins) => ins.referenceCoverage * 100,
    format: 'percent',
    click(ins) {
      return { nodeIds: ins.unreferencedNodes };
    },
  },
];

/**
 * Initialize the insights panel.
 * @param {Object} insights - Computed insights from computeInsights()
 * @param {Object} data - Raw snapshot data (unused but available for future cards)
 * @param {Object} eventBus - Event bus
 */
export function initInsights(insights, data, eventBus) {
  bus = eventBus;

  // Build floating panel
  drawerEl = document.createElement('div');
  drawerEl.id = 'insights-panel';
  drawerEl.className = 'insights-panel hidden';
  drawerEl.innerHTML = buildPanelHTML(insights);
  document.body.appendChild(drawerEl);

  // Toggle button
  const toggleBtn = document.getElementById('btn-insights');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => togglePanel(insights));
  }

  // Close button inside panel
  drawerEl.querySelector('.insights-close').addEventListener('click', () => closePanel());

  // Card click handlers
  drawerEl.querySelectorAll('.insight-card').forEach((cardEl) => {
    const cardId = cardEl.dataset.cardId;
    const cardDef = CARDS.find((c) => c.id === cardId);
    if (!cardDef) return;

    cardEl.addEventListener('click', () => {
      if (activeCard === cardId) {
        clearActive();
        bus.emit('insight:highlight', { clear: true });
        return;
      }

      clearActive();
      const result = cardDef.click(insights);
      if (result) {
        cardEl.classList.add('active');
        activeCard = cardId;
        bus.emit('insight:highlight', result);
      }
    });
  });

  // ESC to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !drawerEl.classList.contains('hidden')) {
      closePanel();
    }
  });

  // Clear insight highlights when a graph node is selected
  bus.on('node:selected', () => {
    clearActive();
  });

  // Drag behavior on title bar
  setupDrag(drawerEl, drawerEl.querySelector('.insights-titlebar'));
}

function buildPanelHTML(insights) {
  let html = `
    <div class="insights-titlebar">
      <span class="insights-title">Network Insights</span>
      <button class="insights-close" title="Close">&times;</button>
    </div>
    <div class="insights-panel-body">
    <div class="insights-grid">
  `;

  let currentCategory = '';
  for (const card of CARDS) {
    if (card.category !== currentCategory) {
      currentCategory = card.category;
      html += `<div class="insights-category">${esc(currentCategory)}</div>`;
    }
    const subtitleText = typeof card.subtitle === 'function' ? card.subtitle(insights) : card.subtitle;
    html += `
      <div class="insight-card" data-card-id="${card.id}" data-target="${card.numeric(insights)}" data-format="${card.format}">
        <div class="insight-value">0</div>
        <div class="insight-label">${esc(card.label)}</div>
        <div class="insight-subtitle">${esc(subtitleText)}</div>
      </div>
    `;
  }

  html += `</div></div>`;
  return html;
}

function togglePanel(insights) {
  if (!drawerEl.classList.contains('hidden')) {
    closePanel();
  } else {
    openPanel(insights);
  }
}

function openPanel(insights) {
  drawerEl.classList.remove('hidden');
  document.getElementById('btn-insights')?.classList.add('active');
  if (!hasAnimated) {
    hasAnimated = true;
    animateCountUp();
  }
}

function closePanel() {
  drawerEl.classList.add('hidden');
  document.getElementById('btn-insights')?.classList.remove('active');
  clearActive();
  bus.emit('insight:highlight', { clear: true });
}

function clearActive() {
  if (activeCard) {
    drawerEl.querySelector(`.insight-card[data-card-id="${activeCard}"]`)?.classList.remove('active');
    activeCard = null;
  }
}

/**
 * Animate numbers counting up from 0 on first open.
 * Uses requestAnimationFrame with ease-out cubic and stagger.
 */
function animateCountUp() {
  const cards = drawerEl.querySelectorAll('.insight-card');
  const DURATION = 800;
  const STAGGER = 80;

  cards.forEach((card, i) => {
    const valueEl = card.querySelector('.insight-value');
    const target = parseFloat(card.dataset.target);
    const format = card.dataset.format;
    const delay = i * STAGGER;
    const start = performance.now() + delay;

    function tick(now) {
      const elapsed = now - start;
      if (elapsed < 0) {
        requestAnimationFrame(tick);
        return;
      }
      const t = Math.min(elapsed / DURATION, 1);
      const eased = 1 - (1 - t) ** 3; // ease-out cubic
      const current = eased * target;

      valueEl.textContent = formatValue(current, format, target);

      if (t < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  });
}

function formatValue(current, format, target) {
  if (format === 'percent') return Math.round(current) + '%';
  if (format === 'decimal') return current.toFixed(1);
  // int
  return Math.round(current).toLocaleString();
}

/**
 * Make a panel draggable by its title bar.
 */
function setupDrag(panel, handle) {
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  handle.addEventListener('mousedown', (e) => {
    if (e.target.closest('button')) return;
    dragging = true;
    const rect = panel.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    if (!panel.classList.contains('dragged')) {
      panel.style.left = rect.left + 'px';
      panel.style.top = rect.top + 'px';
      panel.style.bottom = 'auto';
      panel.classList.add('dragged');
    }
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    panel.style.left = (e.clientX - offsetX) + 'px';
    panel.style.top = (e.clientY - offsetY) + 'px';
  });

  document.addEventListener('mouseup', () => {
    dragging = false;
  });
}

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}
