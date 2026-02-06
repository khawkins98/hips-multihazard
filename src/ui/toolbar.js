/**
 * Toolbar: zoom controls, about overlay.
 */

/**
 * Initialize toolbar controls.
 * @param {function} getCy - Returns current Cytoscape instance
 */
export function initToolbar(getCy) {
  // Zoom controls
  document.getElementById('btn-zoom-in').addEventListener('click', () => {
    const cy = getCy();
    if (cy) cy.zoom({ level: cy.zoom() * 1.3, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  });

  document.getElementById('btn-zoom-out').addEventListener('click', () => {
    const cy = getCy();
    if (cy) cy.zoom({ level: cy.zoom() / 1.3, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  });

  document.getElementById('btn-fit').addEventListener('click', () => {
    const cy = getCy();
    if (cy) cy.fit(undefined, 30);
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    const cy = getCy();
    if (cy) {
      cy.elements().removeClass('dimmed highlighted');
      cy.elements().unselect();
      cy.fit(undefined, 30);
    }
  });

  // About overlay
  const aboutBtn = document.getElementById('btn-about');
  const overlay = document.getElementById('about-overlay');
  const closeBtn = overlay.querySelector('.overlay-close');

  populateAbout();

  aboutBtn.addEventListener('click', () => overlay.classList.remove('hidden'));
  closeBtn.addEventListener('click', () => overlay.classList.add('hidden'));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });
}

/** Fill the about overlay with usage instructions, data provenance, and attribution. */
function populateAbout() {
  const body = document.getElementById('about-body');
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
