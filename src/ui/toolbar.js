/**
 * @module ui/toolbar
 * Toolbar: zoom controls (in/out/fit/reset), about overlay.
 * Now delegates to the view manager instead of Cytoscape directly.
 */
import { getEl } from '../utils/dom.js';

/**
 * Initialize toolbar controls.
 * @param {object} viewManager - View manager with zoom/fit/reset methods
 */
export function initToolbar(viewManager) {
  // Zoom controls
  getEl('btn-zoom-in')?.addEventListener('click', () => {
    viewManager.zoomIn();
  });

  getEl('btn-zoom-out')?.addEventListener('click', () => {
    viewManager.zoomOut();
  });

  getEl('btn-fit')?.addEventListener('click', () => {
    viewManager.fit();
  });

  getEl('btn-reset')?.addEventListener('click', () => {
    viewManager.reset();
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
    <p>A network visualization of the <strong>Hazard Information Profiles (HIPs)</strong> from
    UNDRR and the International Science Council. Shows 281 hazards across 8 types
    and the causal links between them.</p>

    <h3>How to use</h3>
    <ul>
      <li><strong>The Web</strong> view shows all hazards on a radial ring with bundled causal edges. Adjust the tension slider to see macro patterns (tight) or individual connections (loose).</li>
      <li><strong>Cascade</strong> view shows a bidirectional causal chain tree for any selected hazard.</li>
      <li>Click a node to see its profile and causal connections</li>
      <li>Search by hazard name, alternate label, or identifier</li>
      <li>Filter by hazard type using the sidebar checkboxes</li>
      <li>Toggle causal links to show or hide edges</li>
      <li>Use the Insights and Flow Matrix panels for aggregate analysis</li>
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
