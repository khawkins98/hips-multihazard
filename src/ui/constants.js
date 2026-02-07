/**
 * @module ui/constants
 * Named constants for UI-layer magic numbers.
 * Each constant includes a rationale comment explaining its value.
 */

// ─── Search ──────────────────────────────────────────────────────────
/** Scoring weights for search result ranking. */
export const SEARCH_SCORES = {
  exactLabel: 100,
  startsWithLabel: 80,
  containsLabel: 60,
  containsIdentifier: 40,
  containsAltLabel: 30,
};
/** Maximum number of search results shown in the dropdown. */
export const MAX_SEARCH_RESULTS = 20;

// ─── Centrality Ranking ─────────────────────────────────────────────
/** Number of top-ranked nodes shown in the sidebar centrality list. */
export const TOP_N_CENTRALITY = 20;

// ─── Flow Matrix ─────────────────────────────────────────────────────
/** Duration (ms) to show the "Copied!" confirmation on CSV copy button. */
export const COPY_CONFIRMATION_MS = 2000;
/** RGB components for the flow matrix heatmap color (blue accent). */
export const FLOW_HEATMAP_RGB = '91, 156, 245';

// ─── Insights Panel ─────────────────────────────────────────────────
/** Stagger delay (ms) between each insight card's count-up animation start. */
export const INSIGHT_STAGGER_MS = 80;
/** Total duration (ms) of each insight card's count-up animation. */
export const INSIGHT_ANIMATION_MS = 800;
