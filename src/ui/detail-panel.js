/**
 * Detail panel: shows full info for a selected hazard.
 */
import { getTypeDef } from '../data/hazard-types.js';

let nodeDataMap = null;
let bus = null;

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
}

function showDetail(nodeId) {
  const data = nodeDataMap.get(nodeId);
  if (!data) return;

  const placeholder = document.getElementById('detail-placeholder');
  const content = document.getElementById('detail-content');
  placeholder.classList.add('hidden');
  content.classList.remove('hidden');

  const typeDef = getTypeDef(data.typeName);

  let html = `
    <div class="detail-header">
      <div class="detail-title">${esc(data.label)}</div>
      <div class="detail-badges">
        <span class="badge badge-type" style="background:${typeDef.color}">${esc(data.typeName || 'Unknown')}</span>
        ${data.clusterName ? `<span class="badge badge-cluster">${esc(data.clusterName)}</span>` : ''}
        ${data.identifier ? `<span class="badge badge-id">${esc(data.identifier)}</span>` : ''}
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

function hideDetail() {
  const placeholder = document.getElementById('detail-placeholder');
  const content = document.getElementById('detail-content');
  placeholder.classList.remove('hidden');
  content.classList.add('hidden');
}

function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function truncateUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 40 ? u.pathname.slice(0, 37) + '...' : u.pathname;
    return u.host + path;
  } catch {
    return url.length > 60 ? url.slice(0, 57) + '...' : url;
  }
}
