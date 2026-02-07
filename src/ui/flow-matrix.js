/**
 * @module ui/flow-matrix
 * Flow Matrix floating panel: 8x8 heatmap of cross-type causal edge counts.
 * Draggable, resizable, stays open while interacting with the graph.
 * Clicking a cell highlights those edges on the graph.
 * @emits flow:highlight
 */
import { computeFlowMatrix } from '../data/flow-matrix.js';
import { getTypeDef } from '../data/hazard-types.js';
import { esc, setupDrag } from '../utils/dom.js';
import { COPY_CONFIRMATION_MS, FLOW_HEATMAP_RGB } from './constants.js';

/**
 * Initialize the flow matrix panel and footer button.
 * @param {object} data - Snapshot data
 * @param {object} bus - Event bus
 */
export function initFlowMatrix(data, bus) {
  const btn = document.getElementById('btn-flow-matrix');
  const panel = document.getElementById('flow-panel');
  if (!btn || !panel) return;

  const { typeNames, matrix, edgeMap } = computeFlowMatrix(data);

  // Build short names for column headers
  const shortNames = typeNames.map(name => {
    const def = getTypeDef(name);
    return def.short || name;
  });

  // Find max value for heatmap scaling
  const maxVal = Math.max(1, ...matrix.flat());

  // Compute row and column totals
  const rowTotals = matrix.map(row => row.reduce((s, v) => s + v, 0));
  const colTotals = typeNames.map((_, ci) => matrix.reduce((s, row) => s + row[ci], 0));

  // Build table HTML
  let tableHtml = '<table class="flow-table">';

  // Header row with rotated labels
  tableHtml += '<tr><th class="flow-corner"></th>';
  for (let ci = 0; ci < typeNames.length; ci++) {
    const color = getTypeDef(typeNames[ci]).color;
    tableHtml += `<th class="flow-col-header"><div class="flow-col-label"><span class="flow-swatch" style="background:${color}"></span>${esc(shortNames[ci])}</div></th>`;
  }
  tableHtml += '<th class="flow-total-header">Total</th></tr>';

  // Data rows
  for (let ri = 0; ri < typeNames.length; ri++) {
    const color = getTypeDef(typeNames[ri]).color;
    tableHtml += `<tr><th class="flow-row-header"><span class="flow-swatch" style="background:${color}"></span>${esc(shortNames[ri])}</th>`;
    for (let ci = 0; ci < typeNames.length; ci++) {
      const val = matrix[ri][ci];
      const intensity = val / maxVal;
      const isDiag = ri === ci;
      const cellClass = isDiag ? 'flow-cell flow-diag' : 'flow-cell';
      const bg = val > 0 ? `rgba(${FLOW_HEATMAP_RGB}, ${(intensity * 0.8 + 0.1).toFixed(2)})` : 'transparent';
      tableHtml += `<td class="${cellClass}" data-row="${ri}" data-col="${ci}" style="background:${bg}">${val || ''}</td>`;
    }
    tableHtml += `<td class="flow-total">${rowTotals[ri]}</td></tr>`;
  }

  // Column totals row
  tableHtml += '<tr><th class="flow-total-header">Total</th>';
  for (let ci = 0; ci < typeNames.length; ci++) {
    tableHtml += `<td class="flow-total">${colTotals[ci]}</td>`;
  }
  const grandTotal = rowTotals.reduce((s, v) => s + v, 0);
  tableHtml += `<td class="flow-total flow-grand-total">${grandTotal}</td></tr>`;
  tableHtml += '</table>';

  // Build CSV string
  const csvRows = [];
  csvRows.push(['Source \\ Target', ...shortNames, 'Total'].join(','));
  for (let ri = 0; ri < typeNames.length; ri++) {
    csvRows.push([shortNames[ri], ...matrix[ri], rowTotals[ri]].join(','));
  }
  csvRows.push(['Total', ...colTotals, grandTotal].join(','));
  const csvString = csvRows.join('\n');

  // Populate panel body
  const body = panel.querySelector('#flow-body');
  body.innerHTML = `<div class="flow-toolbar"><button class="flow-copy-btn" id="flow-copy-csv">Copy as CSV</button></div>` + tableHtml;

  // Copy CSV handler
  body.querySelector('#flow-copy-csv').addEventListener('click', (e) => {
    const copyBtn = e.currentTarget;
    navigator.clipboard.writeText(csvString).then(() => {
      copyBtn.textContent = 'Copied!';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = 'Copy as CSV';
        copyBtn.classList.remove('copied');
      }, COPY_CONFIRMATION_MS);
    });
  });

  // Track active cell
  let activeCell = null;

  // Cell click handlers
  body.querySelectorAll('.flow-cell').forEach(td => {
    td.addEventListener('click', () => {
      const ri = td.dataset.row;
      const ci = td.dataset.col;
      const key = `${ri},${ci}`;
      const edges = edgeMap.get(key);

      if (activeCell === td) {
        td.classList.remove('active');
        activeCell = null;
        bus.emit('flow:highlight', { edges: [], clear: true });
        return;
      }

      if (activeCell) activeCell.classList.remove('active');

      if (!edges || edges.length === 0) {
        activeCell = null;
        return;
      }

      td.classList.add('active');
      activeCell = td;
      bus.emit('flow:highlight', { edges });
    });
  });

  // Toggle panel
  btn.addEventListener('click', () => {
    const isHidden = panel.classList.toggle('hidden');
    btn.classList.toggle('active', !isHidden);
  });

  // Close button
  panel.querySelector('#flow-panel-close').addEventListener('click', () => {
    panel.classList.add('hidden');
    btn.classList.remove('active');
    if (activeCell) {
      activeCell.classList.remove('active');
      activeCell = null;
      bus.emit('flow:highlight', { edges: [], clear: true });
    }
  });

  // Drag behavior on title bar
  setupDrag(panel, panel.querySelector('#flow-titlebar'));
}
