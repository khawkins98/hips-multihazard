/**
 * @module ui/search
 * Search with typeahead over hazard names, alt labels, and identifiers.
 * @emits node:focus
 */
import { getTypeDef } from '../data/hazard-types.js';
import { esc } from '../utils/dom.js';
import { SEARCH_SCORES, MAX_SEARCH_RESULTS } from './constants.js';

let allNodes = [];
let bus = null;

/**
 * Initialize search.
 * @param {Array} nodes - Snapshot node data
 * @param {object} eventBus - Event bus
 */
export function initSearch(nodes, eventBus) {
  allNodes = nodes;
  bus = eventBus;

  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  let activeIndex = -1;

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    if (query.length < 2) {
      results.classList.remove('visible');
      return;
    }

    const matches = searchNodes(allNodes, query).slice(0, MAX_SEARCH_RESULTS);
    activeIndex = -1;

    if (matches.length === 0) {
      results.classList.remove('visible');
      return;
    }

    results.innerHTML = matches.map((node, i) => {
      const typeDef = getTypeDef(node.typeName);
      return `
        <li data-index="${i}" data-node-id="${node.id}">
          <span class="result-swatch" style="background:${typeDef.color}"></span>
          <span class="result-label">${highlight(node.label, query)}</span>
          <span class="result-type">${typeDef.short}</span>
        </li>
      `;
    }).join('');

    results.classList.add('visible');

    // Attach click handlers
    results.querySelectorAll('li').forEach(li => {
      li.addEventListener('click', () => {
        selectResult(li.dataset.nodeId);
        results.classList.remove('visible');
        input.value = '';
      });
    });
  });

  // Keyboard navigation
  input.addEventListener('keydown', (e) => {
    const items = results.querySelectorAll('li');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, items.length - 1);
      updateActive(items, activeIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      updateActive(items, activeIndex);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && items[activeIndex]) {
        selectResult(items[activeIndex].dataset.nodeId);
        results.classList.remove('visible');
        input.value = '';
      }
    } else if (e.key === 'Escape') {
      results.classList.remove('visible');
    }
  });

  // Close results when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#search-container')) {
      results.classList.remove('visible');
    }
  });
}

/**
 * Score and rank hazard nodes against a search query.
 * Scoring: exact label=100, starts-with=80, label contains=60, identifier=40, alt label=30.
 * @param {Array} nodes - Array of node data objects
 * @param {string} query - Lowercased search term
 * @returns {Array} Matched nodes sorted by descending score
 */
export function searchNodes(nodes, query) {
  return nodes
    .map(node => {
      let score = 0;
      const label = node.label?.toLowerCase() || '';
      const id = node.identifier?.toLowerCase() || '';
      const alts = (node.altLabels || []).map(a => a.toLowerCase());

      if (label === query) score = SEARCH_SCORES.exactLabel;
      else if (label.startsWith(query)) score = SEARCH_SCORES.startsWithLabel;
      else if (label.includes(query)) score = SEARCH_SCORES.containsLabel;
      else if (id.includes(query)) score = SEARCH_SCORES.containsIdentifier;
      else if (alts.some(a => a.includes(query))) score = SEARCH_SCORES.containsAltLabel;

      return { ...node, score };
    })
    .filter(n => n.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** Emit a 'node:focus' event to pan/zoom the graph to the selected search result. */
function selectResult(nodeId) {
  bus.emit('node:focus', { id: nodeId });
}

/** Highlight the active dropdown item during keyboard navigation. */
function updateActive(items, index) {
  items.forEach(li => li.classList.remove('active'));
  if (items[index]) {
    items[index].classList.add('active');
    items[index].scrollIntoView({ block: 'nearest' });
  }
}

/** Wrap matching substring in <strong> tags for visual emphasis in search results. */
function highlight(text, query) {
  if (!text) return '';
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${escaped})`, 'gi');
  return esc(text).replace(re, '<strong>$1</strong>');
}

/**
 * Reset module state. Test-only API.
 * @private
 */
export function _reset() {
  allNodes = [];
  bus = null;
}
