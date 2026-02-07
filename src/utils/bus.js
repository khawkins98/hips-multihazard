/**
 * @module utils/bus
 * Publish/subscribe event bus for cross-module communication.
 *
 * ## Event Catalog
 *
 * ### Filtering & Grouping
 * - `filter:types` — Published by: sidebar. Subscribers: graph.
 *   Payload: `{ hiddenTypes: Set<string> }`
 * - `grouping:request` — Published by: sidebar. Subscribers: main.
 *   Payload: `{ mode: 'type'|'cluster'|'flat' }`
 * - `grouping:change` — Published by: main. Subscribers: graph, detail-panel, search, legend, semantic-zoom, hyperspace-layout.
 *   Payload: `{ mode: string, elements: Array }`
 *
 * ### Edge Visibility
 * - `edges:toggle` — Published by: sidebar. Subscribers: graph.
 *   Payload: `{ visible: boolean, declaredOnly: boolean }`
 *
 * ### Layout
 * - `layout:change` — Published by: sidebar. Subscribers: graph, hyperspace-layout, legend.
 *   Payload: `{ name: string }`
 *
 * ### Node Selection
 * - `node:selected` — Published by: interactions. Subscribers: detail-panel, insights.
 *   Payload: `{ id: string }`
 * - `node:deselected` — Published by: interactions. Subscribers: detail-panel.
 *   Payload: (none)
 * - `node:focus` — Published by: detail-panel, search, sidebar. Subscribers: main.
 *   Payload: `{ id: string }`
 *
 * ### K-Hop Neighborhood
 * - `khop:change` — Published by: detail-panel. Subscribers: graph.
 *   Payload: `{ nodeId: string, hops: number }`
 *
 * ### Centrality
 * - `centrality:computed` — Published by: main. Subscribers: sidebar.
 *   Payload: `{ metrics: Map, nodeDataMap: Map }`
 *
 * ### Path Finder
 * - `pathfinder:mode` — Published by: path-finder. Subscribers: (unused).
 *   Payload: `{ active: boolean }`
 * - `pathfinder:select` — Published by: interactions. Subscribers: path-finder.
 *   Payload: `{ id: string, label: string }`
 * - `pathfinder:result` — Published by: path-finder. Subscribers: (unused).
 *   Payload: `{ path: Collection|null, distance: number }`
 * - `pathfinder:clear` — Published by: path-finder. Subscribers: path-finder.
 *   Payload: (empty object)
 *
 * ### Highlights
 * - `flow:highlight` — Published by: flow-matrix. Subscribers: graph.
 *   Payload: `{ edges: Array, clear?: boolean }`
 * - `insight:highlight` — Published by: insights. Subscribers: graph.
 *   Payload: `{ nodeIds?: Array, edgeFilter?: string, clear?: boolean }`
 * - `hyperroute:highlight` — Published by: legend, hyperspace-layout. Subscribers: graph.
 *   Payload: `{ route: object|null, routeIdx: number }`
 * - `hyperspace:routes` — Published by: graph. Subscribers: legend.
 *   Payload: `{ routes: Array }`
 */

/**
 * Create a simple publish/subscribe event bus for cross-module communication.
 * @returns {{ on: (event: string, fn: Function) => void, emit: (event: string, data: *) => void }}
 */
export function createBus() {
  const listeners = {};
  return {
    on(event, fn) {
      (listeners[event] ||= []).push(fn);
    },
    emit(event, data) {
      for (const fn of listeners[event] || []) fn(data);
    },
  };
}
