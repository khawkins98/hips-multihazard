/**
 * Detail panel: shows full info for a selected hazard.
 */
import { getTypeDef } from '../data/hazard-types.js';

let nodeDataMap = null;
let bus = null;

/** Maps scope note type keys (from the API's dct:type) to human-readable labels. */
const SCOPE_NOTE_LABELS = {
  drivers: 'Drivers',
  impacts: 'Impacts',
  metrics: 'Metrics',
  multiHazardContext: 'Multi-Hazard Context',
  riskManagement: 'Risk Management',
  monitoringEarlyWarning: 'Monitoring & Early Warning',
};

/**
 * Initialize the detail panel.
 * @param {Map} dataMap - nodeDataMap from transform
 * @param {object} eventBus - Event bus
 */
export function initDetailPanel(dataMap, eventBus) {
  nodeDataMap = dataMap;
  bus = eventBus;

  bus.on('node:selected', ({ id }) => showDetail(id));
  bus.on('node:deselected', hideDetail);

  bus.on('grouping:change', () => {
    hideDetail();
  });
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
  const hipsBase = 'https://www.preventionweb.net/drr-glossary/hips';

  let html = `
    <div class="detail-header">
      <div class="detail-title">${esc(data.label)}</div>
      <div class="detail-badges">
        <a class="badge badge-type" style="background:${typeDef.color}" href="${hipsBase}#${esc(typeSlug)}" target="_blank" rel="noopener">${esc(data.typeName || 'Unknown')}</a>
        ${data.clusterName ? `<a class="badge badge-cluster" href="${hipsBase}#${esc(typeSlug)}" target="_blank" rel="noopener">${esc(data.clusterName)}</a>` : ''}
        ${data.id?.startsWith('http') ? `<a class="badge badge-id" href="${esc(data.id)}" target="_blank" rel="noopener">${esc(data.identifier || data.id)}</a>` : (data.identifier ? `<span class="badge badge-id">${esc(data.identifier)}</span>` : '')}
      </div>
    </div>
  `;

  // Alt labels
  if (data.altLabels?.length) {
    html += `<div class="alt-labels">${data.altLabels.map(l => `<span class="alt-label">${esc(l)}</span>`).join('')}</div>`;
  }

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

  // Causes list
  if (data.causes?.length) {
    html += `
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

  // Caused by list
  if (data.causedBy?.length) {
    html += `
      <div class="detail-section">
        <h3>Caused By (${data.causedBy.length})</h3>
        <ul class="causal-list">
          ${data.causedBy.map(id => {
            const source = nodeDataMap.get(id);
            const label = source?.label || id;
            return `<li><span class="causal-link caused-by" data-node-id="${esc(id)}">${esc(label)}</span></li>`;
          }).join('')}
        </ul>
      </div>
    `;
  }

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

  content.innerHTML = html;

  // Attach click handlers for causal links
  content.querySelectorAll('.causal-link').forEach(el => {
    el.addEventListener('click', () => {
      const targetId = el.dataset.nodeId;
      bus.emit('node:focus', { id: targetId });
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
 * HTML-escape a string using the DOM's built-in textContent→innerHTML conversion.
 * Prevents XSS when interpolating user/API data into innerHTML.
 * @param {string} str
 * @returns {string} HTML-safe string
 */
function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/** Shorten a URL to host + truncated path for display in source links. */
function truncateUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 40 ? u.pathname.slice(0, 37) + '...' : u.pathname;
    return u.host + path;
  } catch {
    return url.length > 60 ? url.slice(0, 57) + '...' : url;
  }
}
