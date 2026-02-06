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

function populateAbout() {
  const body = document.getElementById('about-body');
  body.innerHTML = `
    <h3>About This Project</h3>
    <p>An interactive visualization of the <strong>Hazard Information Profiles (HIPs)</strong> developed by
    UNDRR and the International Science Council (ISC). Explore 281 hazards across 8 types and their
    causal interconnections to understand multi-hazard risk.</p>

    <h3>How to Use</h3>
    <ul>
      <li><strong>Click a node</strong> to see its full profile and causal connections</li>
      <li><strong>Search</strong> by hazard name, alternate label, or identifier</li>
      <li><strong>Filter</strong> by hazard type using the sidebar checkboxes</li>
      <li><strong>Toggle causal links</strong> to reveal all directed edges at once</li>
      <li><strong>Switch layouts</strong> between force-directed, hierarchical, and concentric views</li>
      <li><strong>Change grouping</strong> to pool hazards by type, cluster, or flat</li>
      <li>Click linked hazards in the detail panel to navigate the graph</li>
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
  `;
}
