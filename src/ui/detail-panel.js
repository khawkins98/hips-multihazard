/**
 * @module ui/detail-panel
 * Detail panel: shows full info for a selected hazard node.
 * Displays metadata badges, definition, scope notes, causal links, and sources.
 * @listens node:selected
 * @listens node:deselected
 * @listens grouping:change
 * @emits node:focus
 * @emits khop:change
 */
import { getTypeDef } from '../data/hazard-types.js';
import { esc } from '../utils/dom.js';

let nodeDataMap = null;
let bus = null;
/** @type {Map<string, Set<string>>} targetId -> Set of sourceIds that declare "I cause targetId" */
let incomingByTarget = null;
let currentHops = 1;
let currentNodeId = null;
/** @type {Map<string, object>|null} centrality metrics map */
let centralityData = null;

/** Maps scope note type keys (from the API's dct:type) to human-readable labels. */
const SCOPE_NOTE_LABELS = {
  drivers: 'Drivers',
  impacts: 'Impacts',
  metrics: 'Metrics',
  multiHazardContext: 'Multi-Hazard Context',
  riskManagement: 'Risk Management',
  monitoringEarlyWarning: 'Monitoring & Early Warning',
};

/** Base URL for HIPs glossary links. */
const hipsBase = 'https://www.preventionweb.net/drr-glossary/hips';

/**
 * Initialize the detail panel.
 * @param {Map} dataMap - nodeDataMap from transform
 * @param {Array} edges - Array of { source, target } edge objects
 * @param {object} eventBus - Event bus
 */
export function initDetailPanel(dataMap, edges, eventBus) {
  nodeDataMap = dataMap;
  bus = eventBus;

  // Build reverse edge lookup: for each target, which sources declare "I cause target"
  incomingByTarget = new Map();
  for (const e of edges) {
    if (!incomingByTarget.has(e.target)) incomingByTarget.set(e.target, new Set());
    incomingByTarget.get(e.target).add(e.source);
  }

  bus.on('node:selected', ({ id }) => {
    currentHops = 1;
    currentNodeId = id;
    showDetail(id);
  });
  bus.on('node:deselected', () => {
    currentHops = 1;
    currentNodeId = null;
    hideDetail();
  });

  bus.on('grouping:change', () => {
    currentHops = 1;
    currentNodeId = null;
    hideDetail();
  });
}

/**
 * Set centrality metrics data for display in detail panel.
 * @param {Map<string, object>} metrics
 */
export function setCentralityData(metrics) {
  centralityData = metrics;
}

/**
 * Build the header section with title, badges, and k-hop controls.
 * @param {object} data - Node data
 * @param {object} typeDef - Type definition with color
 * @param {string} typeSlug - URL-safe type name
 * @param {number} currentHops - Active k-hop value
 * @returns {string} HTML string
 */
function buildHeaderHtml(data, typeDef, typeSlug, currentHops) {
  return `
    <div class="detail-header">
      <div class="detail-title">${esc(data.label)}</div>
      <div class="detail-badges">
        <a class="badge badge-type" style="background:${typeDef.color}" href="${hipsBase}#${esc(typeSlug)}" target="_blank" rel="noopener">${esc(data.typeName || 'Unknown')}</a>
        ${data.clusterName ? `<a class="badge badge-cluster" href="${hipsBase}#${esc(typeSlug)}" target="_blank" rel="noopener">${esc(data.clusterName)}</a>` : ''}
        ${data.id?.startsWith('http') ? `<a class="badge badge-id" href="${esc(data.id)}" target="_blank" rel="noopener">${esc(data.identifier || data.id)}</a>` : (data.identifier ? `<span class="badge badge-id">${esc(data.identifier)}</span>` : '')}
      </div>
      <div class="khop-controls">
        <span class="khop-label">Neighborhood:</span>
        ${[1, 2, 3, 4].map(h =>
          `<button class="khop-btn${currentHops === h ? ' active' : ''}" data-hops="${h}">${h}-hop</button>`
        ).join('')}
      </div>
    </div>
  `;
}

/**
 * Build the alternative labels section.
 * @param {object} data - Node data
 * @returns {string} HTML string or empty string
 */
function buildAltLabelsHtml(data) {
  if (!data.altLabels?.length) return '';
  return `<div class="alt-labels">${data.altLabels.map(l => `<span class="alt-label">${esc(l)}</span>`).join('')}</div>`;
}

/**
 * Build the centrality metrics section.
 * @param {object} data - Node data
 * @returns {string} HTML string or empty string
 */
function buildCentralityHtml(data) {
  if (!centralityData) return '';
  const metrics = centralityData.get(data.id);
  if (!metrics) return '';
  return `
    <div class="centrality-section">
      <h3>Centrality</h3>
      <div class="centrality-metrics">
        <div class="centrality-metric">
          <span class="centrality-name">Betweenness</span>
          <span class="centrality-value">${metrics.betweenness.toFixed(4)}</span>
          <span class="centrality-rank">#${metrics.betweennessRank}</span>
        </div>
        <div class="centrality-metric">
          <span class="centrality-name">PageRank</span>
          <span class="centrality-value">${metrics.pageRank.toFixed(4)}</span>
          <span class="centrality-rank">#${metrics.pageRankRank}</span>
        </div>
        <div class="centrality-metric">
          <span class="centrality-name">Closeness</span>
          <span class="centrality-value">${metrics.closeness.toFixed(4)}</span>
          <span class="centrality-rank">#${metrics.closenessRank}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Build the definition and scope notes sections.
 * @param {object} data - Node data
 * @returns {string} HTML string or empty string
 */
function buildScopeNotesHtml(data) {
  let html = '';
  // Definition
  if (data.definition) {
    html += `<div class="detail-definition">${esc(data.definition)}</div>`;
  }
  // Scope notes
  for (const [key, label] of Object.entries(SCOPE_NOTE_LABELS)) {
    const note = data.scopeNotes?.[key];
    if (!note) continue;
    html += `
      <div class="detail-section">
        <h3>${label}</h3>
        <p>${esc(note)}</p>
      </div>
    `;
  }
  return html;
}

/**
 * Build the "Causes" list section.
 * @param {object} data - Node data
 * @returns {string} HTML string or empty string
 */
function buildCausesHtml(data) {
  if (!data.causes?.length) return '';
  return `
    <div class="detail-section">
      <h3>Causes (${data.causes.length})</h3>
      <ul class="causal-list">
        ${data.causes.map(id => {
          const target = nodeDataMap.get(id);
          const label = target?.label || id;
          return `<li><span class="causal-link causes" data-node-id="${esc(id)}">${esc(label)}</span></li>`;
        }).join('')}
      </ul>
    </div>
  `;
}

/**
 * Build the "Caused By" list section with declared + inferred merge.
 * @param {object} data - Node data
 * @returns {string} HTML string or empty string
 */
function buildCausedByHtml(data) {
  const declaredSet = new Set(data.causedBy || []);
  const incomingSources = incomingByTarget?.get(data.id) || new Set();
  const inferredIds = [...incomingSources].filter(id => !declaredSet.has(id));
  const declaredCount = declaredSet.size;
  const inferredCount = inferredIds.length;
  const totalCausedBy = declaredCount + inferredCount;

  if (totalCausedBy === 0) return '';

  const headerParts = [];
  if (declaredCount) headerParts.push(`${declaredCount} declared`);
  if (inferredCount) headerParts.push(`${inferredCount} inferred`);

  return `
    <div class="detail-section">
      <h3>Caused By (${headerParts.join(' + ')})</h3>
      <ul class="causal-list">
        ${(data.causedBy || []).map(id => {
          const source = nodeDataMap.get(id);
          const label = source?.label || id;
          return `<li><span class="causal-link caused-by" data-node-id="${esc(id)}">${esc(label)}</span></li>`;
        }).join('')}
        ${inferredIds
          .sort((a, b) => {
            const la = nodeDataMap.get(a)?.label || a;
            const lb = nodeDataMap.get(b)?.label || b;
            return la.localeCompare(lb);
          })
          .map(id => {
            const source = nodeDataMap.get(id);
            const label = source?.label || id;
            return `<li><span class="causal-link caused-by inferred" data-node-id="${esc(id)}">${esc(label)}</span> <span class="causal-inferred">(inferred)</span></li>`;
          }).join('')}
      </ul>
    </div>
  `;
}

/**
 * Build the Sources & References section and Version/Rights section.
 * @param {object} data - Node data
 * @returns {string} HTML string or empty string
 */
function buildSourcesHtml(data) {
  let html = '';
  // Sources & References
  const sourceFields = [
    { key: 'sources', label: 'Sources' },
    { key: 'quotedFrom', label: 'Quoted From' },
    { key: 'references', label: 'References' },
    { key: 'influencedBy', label: 'Influenced By' },
    { key: 'conformsTo', label: 'Conforms To' },
  ];

  for (const { key, label } of sourceFields) {
    const links = data[key];
    if (!links?.length) continue;
    html += `
      <div class="detail-section">
        <h3>${label}</h3>
        <div class="source-links">
          ${links.map(url => {
            if (url.startsWith('http')) {
              return `<a href="${esc(url)}" target="_blank" rel="noopener">${truncateUrl(url)}</a>`;
            }
            return `<span>${esc(url)}</span>`;
          }).join('')}
        </div>
      </div>
    `;
  }

  // Version & rights
  if (data.versionInfo || data.rights) {
    html += `<div class="detail-section">`;
    if (data.versionInfo) html += `<h3>Version</h3><p>${esc(data.versionInfo)}</p>`;
    if (data.rights) html += `<h3>License</h3><p>${esc(data.rights)}</p>`;
    html += `</div>`;
  }

  return html;
}

/**
 * Render the detail panel for a selected hazard node.
 * Displays metadata badges, definition, scope notes, causal links, and sources.
 * Causal link clicks emit 'node:focus' to navigate the graph.
 * @param {string} nodeId - The @id of the selected hazard node
 */
function showDetail(nodeId) {
  const data = nodeDataMap.get(nodeId);
  if (!data) return;

  const placeholder = document.getElementById('detail-placeholder');
  const content = document.getElementById('detail-content');
  placeholder.classList.add('hidden');
  content.classList.remove('hidden');

  const typeDef = getTypeDef(data.typeName);
  const typeSlug = (data.typeName || '').toLowerCase().replace(/\s+/g, '-');

  content.innerHTML = [
    buildHeaderHtml(data, typeDef, typeSlug, currentHops),
    buildAltLabelsHtml(data),
    buildCentralityHtml(data),
    buildScopeNotesHtml(data),
    buildCausesHtml(data),
    buildCausedByHtml(data),
    buildSourcesHtml(data),
  ].filter(Boolean).join('');

  // Attach click handlers for causal links
  content.querySelectorAll('.causal-link').forEach(el => {
    el.addEventListener('click', () => {
      bus.emit('node:focus', { id: el.dataset.nodeId });
    });
  });

  // Attach click handlers for k-hop buttons
  content.querySelectorAll('.khop-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const hops = parseInt(btn.dataset.hops, 10);
      currentHops = hops;
      content.querySelectorAll('.khop-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      bus.emit('khop:change', { nodeId: data.id, hops });
    });
  });
}

/** Hide the detail content and restore the placeholder prompt. */
function hideDetail() {
  const placeholder = document.getElementById('detail-placeholder');
  const content = document.getElementById('detail-content');
  placeholder.classList.remove('hidden');
  content.classList.add('hidden');
}

/**
 * Shorten a URL to host + truncated path for display in source links.
 * @param {string} url - The URL to shorten
 * @returns {string} Shortened display string
 */
function truncateUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 40 ? u.pathname.slice(0, 37) + '...' : u.pathname;
    return u.host + path;
  } catch {
    return url.length > 60 ? url.slice(0, 57) + '...' : url;
  }
}

/**
 * Reset module state. Test-only API.
 * @private
 */
export function _reset() {
  nodeDataMap = null;
  bus = null;
  incomingByTarget = null;
  currentHops = 1;
  currentNodeId = null;
  centralityData = null;
}
