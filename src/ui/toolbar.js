/**
 * @module ui/toolbar
 * Toolbar: zoom controls (in/out/fit/reset), about overlay.
 */
import { ZOOM_FACTOR, FIT_PADDING } from '../graph/constants.js';
import { getEl } from '../utils/dom.js';

/**
 * Initialize toolbar controls.
 * @param {function} getCy - Returns current Cytoscape instance
 */
export function initToolbar(getCy) {
  // Zoom controls
  getEl('btn-zoom-in')?.addEventListener('click', () => {
    const cy = getCy();
    if (cy) cy.zoom({ level: cy.zoom() * ZOOM_FACTOR, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  });

  getEl('btn-zoom-out')?.addEventListener('click', () => {
    const cy = getCy();
    if (cy) cy.zoom({ level: cy.zoom() / ZOOM_FACTOR, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  });

  getEl('btn-fit')?.addEventListener('click', () => {
    const cy = getCy();
    if (cy) cy.fit(undefined, FIT_PADDING);
  });

  getEl('btn-reset')?.addEventListener('click', () => {
    const cy = getCy();
    if (cy) {
      cy.elements().removeClass('dimmed highlighted');
      cy.elements().unselect();
      cy.fit(undefined, FIT_PADDING);
    }
  });

  // About overlay
  const aboutBtn = getEl('btn-about');
  const overlay = getEl('about-overlay');
  if (!overlay) return;
  const closeBtn = overlay.querySelector('.overlay-close');

  populateAbout();

  aboutBtn?.addEventListener('click', () => {
    overlay.classList.remove('hidden');
    closeBtn?.focus();
  });
  closeBtn?.addEventListener('click', () => {
    overlay.classList.add('hidden');
    aboutBtn?.focus();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.add('hidden');
      aboutBtn?.focus();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
      overlay.classList.add('hidden');
      aboutBtn?.focus();
    }
  });
}

/** Fill the about overlay with usage instructions, data provenance, and attribution. */
function populateAbout() {
  const body = getEl('about-body');
  if (!body) return;
  body.innerHTML = `
    <h3>About this project</h3>
    <p>A network graph of the <strong>Hazard Information Profiles (HIPs)</strong> from
    UNDRR and the International Science Council. Shows 281 hazards across 8 types
    and the causal links between them.</p>

    <h3>How to use</h3>
    <ul>
      <li>Click a node to see its profile and causal connections</li>
      <li>Search by hazard name, alternate label, or identifier</li>
      <li>Filter by hazard type using the sidebar checkboxes</li>
      <li>Toggle causal links to show or hide all edges</li>
      <li>Switch between force-directed, hierarchical, and concentric layouts</li>
      <li>Group hazards by type, cluster, or flat</li>
      <li>Click linked hazards in the detail panel to jump to them</li>
    </ul>

    <h3>Data</h3>
    <p>Hazard data sourced from the
    <a href="https://www.preventionweb.net/api/terms/hips" target="_blank" rel="noopener">PreventionWeb HIPs API</a>,
    published as SKOS/XKOS Linked Open Data. The graph contains 281 hazard nodes across 8 types and
    38 clusters, connected by ~1,648 directed causal edges (<code>xkos:causes</code>).</p>

    <h3>Attribution</h3>
    <p>Data from UNDRR/ISC Hazard Information Profiles,
    <a href="https://www.preventionweb.net/drr-glossary/hips" target="_blank" rel="noopener">preventionweb.net</a>,
    licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>.</p>

    <h3>Source Code</h3>
    <p><a href="https://github.com/khawkins98/hips-multihazard" target="_blank" rel="noopener">github.com/khawkins98/hips-multihazard</a></p>
  `;
}
