/**
 * @module types
 * Shared JSDoc type definitions for the HIPs Multi-Hazard Explorer.
 * This file contains no runtime code — only type annotations for editor support.
 */

/**
 * A hazard node from the snapshot data.
 * @typedef {Object} HazardNode
 * @property {string} id - Unique URI identifier (e.g. "https://preventionweb.net/...")
 * @property {string} label - Human-readable hazard name
 * @property {string} [identifier] - Short identifier (e.g. "HIP-001")
 * @property {string} [definition] - Hazard definition text
 * @property {string[]} [altLabels] - Alternative names
 * @property {string} [typeId] - URI of the hazard type
 * @property {string} [typeName] - Human-readable type name
 * @property {string} [clusterId] - URI of the cluster
 * @property {string} [clusterName] - Human-readable cluster name
 * @property {Object<string, string>} [scopeNotes] - Keyed scope notes (drivers, impacts, etc.)
 * @property {string[]} [causes] - IDs of hazards this one causes
 * @property {string[]} [causedBy] - IDs of hazards that cause this one
 * @property {string[]} [sources] - External source URLs
 * @property {string[]} [quotedFrom] - Quoted-from URLs
 * @property {string[]} [references] - Reference URLs
 * @property {string[]} [influencedBy] - Influenced-by URLs
 * @property {string[]} [conformsTo] - Conforms-to URLs
 * @property {string} [versionInfo] - Version string
 * @property {string} [rights] - License/rights string
 */

/**
 * A causal edge from the snapshot data.
 * @typedef {Object} CausalEdge
 * @property {string} source - Source hazard node ID
 * @property {string} target - Target hazard node ID
 * @property {string} type - Edge type (always "causes")
 */

/**
 * The full snapshot data structure loaded from hips.json or the API.
 * @typedef {Object} SnapshotData
 * @property {Object} meta - Metadata about the snapshot
 * @property {string} meta.source - API URL the data was fetched from
 * @property {string} meta.fetchedAt - ISO timestamp of fetch
 * @property {number} meta.nodeCount - Number of hazard nodes
 * @property {number} meta.edgeCount - Number of causal edges
 * @property {HazardNode[]} nodes - Array of hazard nodes
 * @property {CausalEdge[]} edges - Array of causal edges
 */

/**
 * The event bus for cross-module communication.
 * @typedef {Object} EventBus
 * @property {function(string, Function): void} on - Subscribe to an event
 * @property {function(string, *): void} emit - Publish an event
 */

/**
 * A Cytoscape element descriptor used during graph initialization.
 * @typedef {Object} CytoscapeElement
 * @property {'nodes'|'edges'} group - Element group
 * @property {Object} data - Element data properties
 * @property {string} data.id - Unique element identifier
 * @property {string} [data.source] - Source node ID (edges only)
 * @property {string} [data.target] - Target node ID (edges only)
 * @property {string} [data.parent] - Parent compound node ID
 * @property {string} [data.label] - Display label
 * @property {boolean} [data.isCompound] - Whether this is a compound (group) node
 */

/**
 * Computed network insight metrics for the insights panel.
 * @typedef {Object} InsightResults
 * @property {number} avgDegree - Average node degree (all edges)
 * @property {number} avgDeclaredDegree - Average node degree (declared edges only)
 * @property {number} stdDev - Standard deviation of degree
 * @property {string[]} avgNodes - IDs of nodes within 1 stddev of average
 * @property {{id: string, label: string, degree: number, declaredDegree: number}} mostConnected - Most connected node
 * @property {string[]} isolatedNodes - IDs of zero-degree nodes
 * @property {string[]} inferredOnlyNodes - IDs of nodes connected only by inferred edges
 * @property {number} reciprocationRate - Fraction of edges that are reciprocated
 * @property {string[]} inferredEdgeNodeIds - IDs of nodes connected by inferred edges
 * @property {number} crossTypeRatio - Fraction of edges crossing type boundaries
 * @property {string[]} crossTypeNodeIds - IDs of nodes with cross-type edges
 * @property {{name: string, edgeCount: number}} topType - Most connected hazard type
 * @property {string[]} topTypeNodeIds - IDs of nodes in the most connected type
 * @property {{name: string, density: number, nodeIds: string[]}} densestCluster - Densest cluster
 * @property {number} referenceCoverage - Fraction of nodes with external references
 * @property {string[]} unreferencedNodes - IDs of nodes without references
 */

/**
 * Centrality metrics for a single node.
 * @typedef {Object} CentralityMetrics
 * @property {number} betweenness - Betweenness centrality score
 * @property {number} pageRank - PageRank score
 * @property {number} closeness - Closeness centrality score
 * @property {number} betweennessRank - Rank by betweenness (1 = highest)
 * @property {number} pageRankRank - Rank by PageRank (1 = highest)
 * @property {number} closenessRank - Rank by closeness (1 = highest)
 */
