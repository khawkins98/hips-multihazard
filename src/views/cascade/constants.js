/**
 * @module views/cascade/constants
 * Constants for the cascade (causal chain) explorer view.
 */

/** Default expansion depth when opening cascade. */
export const DEFAULT_DEPTH = 1;

/** Maximum expansion depth. */
export const MAX_DEPTH = 4;

/** Maximum children shown per branch before truncation. */
export const MAX_CHILDREN = 15;

/** Total visible node budget. */
export const MAX_NODES = 200;

/** Node capsule dimensions. */
export const NODE_WIDTH = 160;
export const NODE_HEIGHT = 28;

/** Spacing between tree levels (horizontal). */
export const LEVEL_SPACING = 200;

/** Spacing between nodes (vertical). */
export const NODE_SPACING = 36;

/** Animation durations (ms). */
export const EXPAND_DURATION = 400;
export const COLLAPSE_DURATION = 300;
export const REROOT_DURATION = 500;
