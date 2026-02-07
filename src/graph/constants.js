/**
 * @module graph/constants
 * Named constants for graph-layer magic numbers and style colors.
 * Each constant includes a rationale comment explaining its value.
 */

// ─── Highlight Classes ───────────────────────────────────────────────
/** The full set of highlight-related classes applied during dim/show/path operations. */
export const HIGHLIGHT_CLASSES = 'dimmed highlighted highlight-hidden path-step path-highlighted';

// ─── Semantic Zoom Thresholds ────────────────────────────────────────
/** Zoom level below which all individual labels are hidden (macro view). */
export const MACRO_THRESHOLD = 0.4;
/** Zoom level above which all labels become visible (micro view). Between macro and meso, only hub labels show. */
export const MESO_THRESHOLD = 1.2;
/** Percentile cutoff for hub nodes — top 20% by connectivity show labels at meso zoom. */
export const HUB_QUANTILE = 0.8;
/** Debounce delay (ms) for semantic zoom level recalculation on zoom events. */
export const SEMANTIC_ZOOM_DEBOUNCE_MS = 60;

// ─── Interaction Parameters ──────────────────────────────────────────
/** Zoom level when focusing/navigating to a node via search or causal link click. */
export const FOCUS_ZOOM_LEVEL = 2.5;
/** Animation duration (ms) for the focus-node pan+zoom animation. */
export const FOCUS_ANIMATION_MS = 400;
/** Border width (px) applied to nodes on hover. */
export const HOVER_BORDER_WIDTH = 3;

// ─── Toolbar Parameters ─────────────────────────────────────────────
/** Multiplicative factor for each zoom-in/zoom-out step. */
export const ZOOM_FACTOR = 1.3;
/** Padding (px) around all elements when using fit-to-view. */
export const FIT_PADDING = 30;

// ─── Hyperspace Layout Parameters ────────────────────────────────────
/** Radii (px) for each orbital ring. Index 0 is the center (unused), 1-5 are quantile orbits, 6 is the rim. */
export const ORBIT_RADII = [0, 150, 320, 520, 750, 1000, 1350];
/** Per-orbit jitter magnitude (px) for deterministic position scatter. */
export const ORBIT_JITTER = [0, 25, 30, 35, 40, 45, 60];
/** Minimum cross-type edges between two types to qualify as a hyper-route candidate. */
export const HYPER_ROUTE_EDGE_THRESHOLD = 40;
/** Minimum cross-type edges a single node must have to be considered a bridge node. */
export const HYPER_ROUTE_BRIDGE_MIN = 3;
/** Maximum number of hyper-route corridors to display. */
export const MAX_HYPER_ROUTES = 5;
/** Fallback midpoint radius (px) for hyper-route label positioning when no bridge nodes have positions. */
export const HYPER_ROUTE_LABEL_FALLBACK_RADIUS = 600;
/** Debounce delay (ms) for hyper-route label position updates on pan/zoom. */
export const LABEL_PAN_ZOOM_DEBOUNCE_MS = 16;

// ─── Cytoscape Style Colors ─────────────────────────────────────────
/**
 * Style colors used in Cytoscape stylesheets, mirroring CSS custom properties.
 * These are needed because Cytoscape styles are JS objects, not CSS.
 */
export const STYLE_COLORS = {
  edgeColor: '#999',
  nodeBorderLight: '#fff',
  selectedColor: '#FFD600',
  highlightedEdgeColor: '#FF5722',
  pathColor: '#4CAF50',
  hyperRouteColor: '#D4AA40',
  dimmedOpacity: 0.15,
  clusterBg: '#e0e0e0',
  clusterBorder: '#bbb',
  clusterText: '#666',
};
