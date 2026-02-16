/**
 * @module views/edge-bundling/constants
 * Dimensions, thresholds, and style constants for the radial edge bundling view.
 */

/** Padding (px) between the outer ring and the SVG edge. */
export const RING_PADDING = 120;

/** Thickness (px) of the colored type arcs on the outer ring. */
export const ARC_THICKNESS = 14;

/** Gap (px) between the type arc outer edge and hazard node circles. */
export const ARC_NODE_GAP = 6;

/** Default bundling tension (0 = straight, 1 = fully bundled). */
export const DEFAULT_TENSION = 0.85;

/** Node circle radius range based on connection count. */
export const NODE_RADIUS_MIN = 2;
export const NODE_RADIUS_MAX = 5;

/** Radius for isolated (zero-connection) nodes. */
export const ISOLATED_RADIUS = 2;

/** Opacity for isolated nodes. */
export const ISOLATED_OPACITY = 0.3;

/** Default edge alpha for declared edges. */
export const EDGE_ALPHA_DECLARED = 0.35;

/** Default edge alpha for inferred edges. */
export const EDGE_ALPHA_INFERRED = 0.15;

/** Edge alpha when dimmed (background during highlight). */
export const EDGE_ALPHA_DIM = 0.03;

/** Edge alpha when highlighted. */
export const EDGE_ALPHA_HIGHLIGHT = 0.8;

/** Edge line width. */
export const EDGE_WIDTH = 1;

/** Highlighted edge line width. */
export const EDGE_WIDTH_HIGHLIGHT = 1.5;

/** Gap multiplier between types (relative to normal separation). */
export const TYPE_GAP_MULTIPLIER = 2.5;

/** Gap multiplier between clusters (relative to normal separation). */
export const CLUSTER_GAP_MULTIPLIER = 1.5;

/** Semantic zoom thresholds for label visibility. */
export const LABEL_ZOOM_ALL_HIDDEN = 1.0;
export const LABEL_ZOOM_HUBS_VISIBLE = 1.5;
export const LABEL_ZOOM_ALL_VISIBLE = 2.5;

/** Hub quantile for semantic zoom (top 20% by connections show labels first). */
export const HUB_QUANTILE = 0.8;

/** Debounce delay (ms) for semantic zoom label updates. */
export const LABEL_DEBOUNCE_MS = 60;

/** Type ordering for consistent radial arrangement (minimizes cross-type edge angular distance). */
export const TYPE_ORDER = [
  'Meteorological and Hydrological',
  'Technological',
  'Geological',
  'Chemical',
  'Extraterrestrial',
  'Societal',
  'Biological',
  'Environmental',
];

/** Label offset from node (px). */
export const LABEL_OFFSET = 8;

/** Type label offset from outer arc (px). */
export const TYPE_LABEL_OFFSET = 20;
