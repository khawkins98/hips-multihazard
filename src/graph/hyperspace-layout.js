/**
 * @module graph/hyperspace-layout
 * Orbital galaxy layout with hyper-route detection.
 *
 * Positions nodes in concentric orbital rings:
 *   Orbit 1 (core):  Top ~20% connectors
 *   Orbit 2-5:       Quantile buckets of remaining connected nodes
 *   Orbit 6 (rim):   Zero-connection nodes
 *
 * Within each orbit, nodes are grouped by hazard type into angular sectors.
 * Cross-type corridors ("hyper-routes") are detected and stored for
 * visualization by other modules.
 *
 * @listens layout:change
 * @listens grouping:change
 */
import { HAZARD_TYPES } from '../data/hazard-types.js';
import { debounce } from '../utils/debounce.js';
import { ORBIT_RADII, ORBIT_JITTER, HYPER_ROUTE_EDGE_THRESHOLD, HYPER_ROUTE_BRIDGE_MIN, MAX_HYPER_ROUTES, HYPER_ROUTE_LABEL_FALLBACK_RADIUS, LABEL_PAN_ZOOM_DEBOUNCE_MS } from './constants.js';

// Type ordering chosen to minimize cross-type edge angular distance.
// Technological (hub) is placed between Met/Hydro and Geological, its heaviest partners.
const TYPE_ORDER = [
  'Meteorological and Hydrological',
  'Technological',
  'Geological',
  'Chemical',
  'Extraterrestrial',
  'Societal',
  'Biological',
  'Environmental',
];

/**
 * Simple seeded hash for deterministic jitter.
 * Returns a float in [-1, 1].
 * @param {string} id - Node ID to hash
 * @returns {number} Jitter value in range [-1, 1]
 */
export function seededJitter(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  }
  // Normalize to [-1, 1]
  return ((h & 0x7fffffff) % 1000) / 500 - 1;
}

/**
 * Assign each node to an orbit (1-6) based on connectionCount.
 * Orbit 6 = zero connections. Orbits 1-5 = quantile split of the rest.
 * @param {Array<{data: {id: string, connectionCount: number}}>} nodes - Nodes to assign
 * @returns {Map<string, number>} Map of nodeId to orbit number (1-6)
 */
export function assignOrbits(nodes) {
  const connected = [];
  const zeroConn = [];

  for (const n of nodes) {
    const cc = n.data.connectionCount || 0;
    if (cc === 0) {
      zeroConn.push(n);
    } else {
      connected.push(n);
    }
  }

  // Sort descending by connectionCount
  connected.sort((a, b) => (b.data.connectionCount || 0) - (a.data.connectionCount || 0));

  const bucketSize = Math.ceil(connected.length / 5);
  const orbitMap = new Map(); // nodeId -> orbit (1-6)

  for (let i = 0; i < connected.length; i++) {
    const orbit = Math.min(Math.floor(i / bucketSize) + 1, 5);
    orbitMap.set(connected[i].data.id, orbit);
  }
  for (const n of zeroConn) {
    orbitMap.set(n.data.id, 6);
  }

  return orbitMap;
}

/**
 * Compute angular sector arcs for each type, proportional to node count.
 * Returns Map<typeName, { startAngle, endAngle, center }>.
 * @param {Array<{data: {typeName: string}}>} nodes - Nodes to allocate to sectors
 * @returns {Map<string, {startAngle: number, endAngle: number, center: number}>} Sector arcs by type
 */
export function computeTypeSectors(nodes) {
  // Count nodes per type
  const typeCounts = new Map();
  for (const name of TYPE_ORDER) typeCounts.set(name, 0);

  for (const n of nodes) {
    const t = n.data.typeName;
    if (typeCounts.has(t)) {
      typeCounts.set(t, typeCounts.get(t) + 1);
    }
  }

  const total = nodes.length || 1;
  const sectors = new Map();
  let angle = 0;

  for (const name of TYPE_ORDER) {
    const count = typeCounts.get(name) || 0;
    if (count === 0) {
      // Still assign a sector (zero-width) so lookup doesn't fail
      sectors.set(name, { startAngle: angle, endAngle: angle, center: angle });
      continue;
    }
    const arc = (count / total) * 2 * Math.PI;
    const padded = arc * 0.9; // 5% padding on each side
    const padOffset = arc * 0.05;
    sectors.set(name, {
      startAngle: angle + padOffset,
      endAngle: angle + padOffset + padded,
      center: angle + arc / 2,
    });
    angle += arc;
  }

  return sectors;
}

/**
 * Compute preset positions for all non-compound nodes.
 * @param {object|Array} source - Cytoscape instance or elements array
 * @returns {object} Cytoscape preset layout config
 */
export function getHyperspaceLayout(source) {
  // Collect non-compound nodes
  const nodes = Array.isArray(source)
    ? source.filter(el => el.group === 'nodes' && !el.data.isCompound)
    : source.nodes('[!isCompound]').map(n => ({ data: n.data() }));

  // Collect edges for hyper-route detection (only visible edges when from cy instance)
  const edges = Array.isArray(source)
    ? source.filter(el => el.group === 'edges')
    : source.edges(':visible').map(e => ({ data: e.data() }));

  // Build node lookup
  const nodeById = new Map();
  for (const n of nodes) nodeById.set(n.data.id, n);

  const orbitMap = assignOrbits(nodes);
  const sectors = computeTypeSectors(nodes);

  // Group nodes by (orbit, type) for within-orbit positioning
  // Key: "orbit:typeName"
  const groups = new Map();
  for (const n of nodes) {
    const orbit = orbitMap.get(n.data.id);
    const type = n.data.typeName || 'Unknown';
    const key = `${orbit}:${type}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(n);
  }

  // Sort each group by connectionCount descending
  for (const arr of groups.values()) {
    arr.sort((a, b) => (b.data.connectionCount || 0) - (a.data.connectionCount || 0));
  }

  // Position nodes
  const positions = {};

  for (const [key, group] of groups) {
    const [orbitStr, ...typeParts] = key.split(':');
    const orbit = parseInt(orbitStr, 10);
    const typeName = typeParts.join(':'); // rejoin in case type name has colons
    const sector = sectors.get(typeName);

    if (!sector || group.length === 0) continue;

    const radius = ORBIT_RADII[orbit] || ORBIT_RADII[6];
    const jitter = ORBIT_JITTER[orbit] || ORBIT_JITTER[6];
    const arcSpan = sector.endAngle - sector.startAngle;

    for (let i = 0; i < group.length; i++) {
      const n = group[i];
      // Spread nodes within the arc: most-connected at center, fanning outward
      let t;
      if (group.length === 1) {
        t = 0.5;
      } else {
        // Alternate from center outward: 0 -> center, 1 -> center-delta, 2 -> center+delta, ...
        const half = Math.ceil(group.length / 2);
        if (i === 0) {
          t = 0.5;
        } else if (i % 2 === 1) {
          t = 0.5 - (Math.ceil(i / 2) / (half + 1)) * 0.5;
        } else {
          t = 0.5 + (Math.ceil(i / 2) / (half + 1)) * 0.5;
        }
      }

      const angle = sector.startAngle + arcSpan * t;
      const rJitter = jitter * seededJitter(n.data.id);
      const r = radius + rJitter;

      positions[n.data.id] = {
        x: r * Math.cos(angle),
        y: r * Math.sin(angle),
      };
    }
  }

  // Detect hyper-routes and stash for later consumption
  const hyperRoutes = detectHyperRoutes(nodes, edges, nodeById, sectors);

  return {
    name: 'preset',
    positions(node) {
      return positions[node.id()] || { x: 0, y: 0 };
    },
    animate: true,
    animationDuration: 800,
    fit: true,
    padding: 50,
    // Stash hyper-routes in the layout options for graph.js to pick up
    _hyperRoutes: hyperRoutes,
  };
}

// ─── Hyper-Route Detection ────────────────────────────────────────────

/**
 * Detect dense cross-type corridors.
 * Returns top MAX_HYPER_ROUTES corridors sorted by edge count.
 */
export function detectHyperRoutes(nodes, edges, nodeById, sectors) {
  // Build cross-type edge count matrix
  const pairCounts = new Map(); // "typeA|||typeB" -> { count, edgeIds, srcNodes, tgtNodes }
  const nodeCrossEdges = new Map(); // nodeId -> Map<otherType, count>

  for (const e of edges) {
    const srcNode = nodeById.get(e.data.source);
    const tgtNode = nodeById.get(e.data.target);
    if (!srcNode || !tgtNode) continue;

    const srcType = srcNode.data.typeName;
    const tgtType = tgtNode.data.typeName;
    if (!srcType || !tgtType || srcType === tgtType) continue;

    // Canonical pair key (alphabetical)
    const pairKey = srcType < tgtType ? `${srcType}|||${tgtType}` : `${tgtType}|||${srcType}`;

    if (!pairCounts.has(pairKey)) {
      pairCounts.set(pairKey, { count: 0, edgeIds: new Set() });
    }
    const pair = pairCounts.get(pairKey);
    pair.count++;
    pair.edgeIds.add(e.data.id);

    // Track per-node cross-type edges
    for (const [nodeId, otherType] of [[e.data.source, tgtType], [e.data.target, srcType]]) {
      if (!nodeCrossEdges.has(nodeId)) nodeCrossEdges.set(nodeId, new Map());
      const m = nodeCrossEdges.get(nodeId);
      m.set(otherType, (m.get(otherType) || 0) + 1);
    }
  }

  // Filter to candidates meeting threshold
  const candidates = [];
  for (const [pairKey, data] of pairCounts) {
    if (data.count < HYPER_ROUTE_EDGE_THRESHOLD) continue;

    const [type1, type2] = pairKey.split('|||');

    // Find bridge nodes: nodes with >= HYPER_ROUTE_BRIDGE_MIN cross-edges to the other type
    const bridgeNodes = new Set();
    for (const [nodeId, crossMap] of nodeCrossEdges) {
      const node = nodeById.get(nodeId);
      if (!node) continue;
      const nodeType = node.data.typeName;
      if (nodeType === type1 && (crossMap.get(type2) || 0) >= HYPER_ROUTE_BRIDGE_MIN) {
        bridgeNodes.add(nodeId);
      } else if (nodeType === type2 && (crossMap.get(type1) || 0) >= HYPER_ROUTE_BRIDGE_MIN) {
        bridgeNodes.add(nodeId);
      }
    }

    // Build label from short names
    const short1 = HAZARD_TYPES[type1]?.short || type1;
    const short2 = HAZARD_TYPES[type2]?.short || type2;

    // Midpoint angle between the two type sectors
    const s1 = sectors.get(type1);
    const s2 = sectors.get(type2);
    const midAngle = s1 && s2 ? (s1.center + s2.center) / 2 : 0;

    candidates.push({
      types: [type1, type2],
      edgeCount: data.count,
      bridgeNodes,
      edgeIds: data.edgeIds,
      label: `${short1} \u2014 ${short2}`,
      midAngle,
    });
  }

  // Sort by edge count descending, take top N
  candidates.sort((a, b) => b.edgeCount - a.edgeCount);
  return candidates.slice(0, MAX_HYPER_ROUTES);
}

// ─── Floating Label Overlay ───────────────────────────────────────────

let labelEls = [];
let panZoomHandler = null;

/**
 * Create and manage floating HTML labels for hyper-route corridors.
 * Called from graph.js after layout completes.
 * @param {object} cy - Cytoscape instance
 * @param {object} bus - Event bus
 */
export function initHyperRouteLabels(cy, bus) {
  const container = document.getElementById('graph-container');

  function clearLabels() {
    for (const el of labelEls) el.remove();
    labelEls = [];
    if (panZoomHandler) {
      cy.off('pan zoom', panZoomHandler);
      panZoomHandler = null;
    }
  }

  function createLabels() {
    clearLabels();
    const routes = cy.scratch('hyperRoutes');
    if (!routes || routes.length === 0) return;

    for (const route of routes) {
      // Compute average position of bridge nodes in model coordinates
      let sumX = 0, sumY = 0, count = 0;
      for (const nodeId of route.bridgeNodes) {
        const node = cy.getElementById(nodeId);
        if (node && !node.empty()) {
          const pos = node.position();
          sumX += pos.x;
          sumY += pos.y;
          count++;
        }
      }

      // Fallback: use midAngle at average orbit radius
      let modelX, modelY;
      if (count > 0) {
        modelX = sumX / count;
        modelY = sumY / count;
      } else {
        const r = HYPER_ROUTE_LABEL_FALLBACK_RADIUS;
        modelX = r * Math.cos(route.midAngle);
        modelY = r * Math.sin(route.midAngle);
      }

      const el = document.createElement('div');
      el.className = 'hyper-route-label';
      el.textContent = route.label;
      el.dataset.edgeCount = route.edgeCount;
      el.title = `${route.edgeCount} cross-type causal links — click to highlight`;
      el._modelX = modelX;
      el._modelY = modelY;
      el._route = route;

      el.addEventListener('click', () => {
        // Toggle: if already active, clear; otherwise highlight this route
        const wasActive = el.classList.contains('active');
        // Clear active state on all labels
        for (const lbl of labelEls) lbl.classList.remove('active');

        if (wasActive) {
          bus.emit('hyperroute:highlight', { route: null, routeIdx: -1 });
        } else {
          el.classList.add('active');
          bus.emit('hyperroute:highlight', { route, routeIdx: -1 });
        }
      });

      container.appendChild(el);
      labelEls.push(el);
    }

    updateLabelPositions();

    // Update on pan/zoom
    panZoomHandler = debounce(() => updateLabelPositions(), LABEL_PAN_ZOOM_DEBOUNCE_MS);
    cy.on('pan zoom', panZoomHandler);
  }

  function updateLabelPositions() {
    const pan = cy.pan();
    const zoom = cy.zoom();
    for (const el of labelEls) {
      const sx = el._modelX * zoom + pan.x;
      const sy = el._modelY * zoom + pan.y;
      el.style.transform = `translate(${sx}px, ${sy}px)`;
    }
  }

  // Listen for layout changes — only show labels on hyperspace layout
  bus.on('layout:change', ({ name }) => {
    if (name !== 'hyperspace') {
      clearLabels();
    }
  });

  // Rebuild on grouping change (elements are swapped)
  bus.on('grouping:change', () => {
    // Labels will be recreated when the next hyperspace layout fires
    clearLabels();
  });

  // Expose create/clear for graph.js to call
  return { createLabels, clearLabels };
}
