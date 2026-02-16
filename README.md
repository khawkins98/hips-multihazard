# HIPs Multi-Hazard Explorer

**[Live demo](https://khawkins98.github.io/hips-multihazard/)**

An interactive visualization of the [UNDRR/ISC Hazard Information Profiles (HIPs)](https://www.preventionweb.net/drr-glossary/hips): 281 hazards, 8 types, 38 clusters, and ~1,648 causal relationships.

## Overview

The HIPs describe hazards used in disaster risk reduction. This tool visualizes the causal links between them (`xkos:causes` / `xkos:causedBy`), so you can see how one hazard triggers or amplifies another across domains.

### Two views

- **The Web** (default): Radial hierarchical edge bundling. 281 hazards arranged on the circumference of a circle, grouped by Type and Cluster. 1,648 causal edges rendered as bundled Bezier curves through the hierarchy center. An adjustable tension slider transitions between tight bundling (macro type-to-type flow patterns) and loose bundling (individual connections). Hover a hazard to highlight its connections; hover a type arc to see all edges for that type.
- **Cascade**: Bidirectional causal chain explorer. Select any hazard and see its causal cascade unfold as an expandable tree — "what causes it" expands leftward, "what it causes" expands rightward. Each level is expandable on click. Handles cycles with ghost/reference nodes.

### Common features

- Search by name, alternate label, or identifier
- Filter by hazard type, toggle all causal links on/off
- **Declared-only mode**: filter edges to show only mutually acknowledged relationships
- Click a node to view its full hazard profile in the detail panel

### Research tools

- **K-hop neighborhood expansion**: after selecting a node, expand the highlighted neighborhood to 2, 3, or 4 hops to trace cascading causal chains
- **Centrality metrics**: betweenness, PageRank, and closeness centrality computed for all nodes, shown in the detail panel with ranks and as a sortable top-20 sidebar list
- **Shortest path finder**: select two nodes to find and highlight the shortest directed causal path between them using Dijkstra's algorithm
- **Type-to-type flow matrix**: an 8x8 heatmap showing directed causal edge counts between hazard types; click a cell to highlight those edges on the graph. Exportable as CSV.
- **Insights panel**: network-statistics cards (average degree, most connected node, cross-type edge ratio, reciprocation rate, etc.) that highlight the relevant subgraph on click

The flow matrix and insights panels are draggable, resizable floating tool palettes that stay open while you interact with the visualization.

## Setup

```bash
npm install
npm run snapshot   # Fetch API data (writes public/data/hips.json)
npm run dev        # Start dev server
npm run build      # Production build for GitHub Pages
```

## Data

Data is fetched from the [PreventionWeb HIPs API](https://www.preventionweb.net/api/terms/hips) and stored as a build-time snapshot. The API publishes Linked Open Data using:

- **SKOS** (Simple Knowledge Organization System) for concept hierarchy
- **XKOS** (eXtended KOS) for causal relationships
- **Dublin Core** for metadata and provenance
- **PROV-O** for source attribution

## Methodology: declared vs inferred connections

The HIPs ontology stores causal relationships using `xkos:causes` and `xkos:causedBy` predicates. Although XKOS defines these as inverse properties, the dataset does not enforce symmetry: node A may declare `causes: [B]` without node B listing A in its `causedBy` array. This produces two categories of causal connections that reflect editorial coverage rather than causal strength:

- **Declared** (reciprocated): the relationship is attested by both endpoints. The source lists the target in `causes` *and* the target lists the source in `causedBy`, or vice versa.
- **Inferred** (unreciprocated): the relationship is attested by only one side. Another node declares `causes: [thisNode]`, but this node's `causedBy` array does not acknowledge it. No algorithmic inference is performed; the term just means the edge is observable in the graph without mutual acknowledgment.

All edges are built from `xkos:causes` declarations, so every edge has at least one editorial attestation. The detail panel and sidebar "Declared only" toggle distinguish the two categories so users can see which links have cross-validated editorial support. When the declared-only filter is active, the graph layout recomputes to reflect the reduced edge set, showing the structural difference between the reciprocated causal network and the full graph. The "Most connected" insight card shows total graph degree alongside the declared count for the same reason.

For example, TL0405 (Road Traffic Accident) has 24 declared connections (7 causes + 17 causedBy) but a graph degree of 63, because 39 additional nodes declare they cause road traffic accidents without TL0405 listing them. The asymmetry is an artifact of node-by-node curation rather than an ontological feature. See [docs/methodology-causal-asymmetry.md](docs/methodology-causal-asymmetry.md) for a full analysis.

## References

### Multi-hazard ontology and classification

- UNDRR/ISC (2020). *Hazard Definition and Classification Review: Technical Report.* United Nations Office for Disaster Risk Reduction & International Science Council. https://www.undrr.org/publication/hazard-definition-and-classification-review
- Murray, V. et al. (2021). "Hazard Information Profiles: Supplement to UNDRR-ISC Hazard Definition & Classification Review." *UNDRR/ISC Technical Report.*
- Tilloy, A., Malamud, B.D., Winter, H. & Joly-Laugel, A. (2019). "A review of quantification methodologies for multi-hazard interrelationships." *Earth-Science Reviews*, 196, 102881.
- Gill, J.C. & Malamud, B.D. (2014). "Reviewing and visualizing the interactions of natural hazards." *Reviews of Geophysics*, 52(4), 680–722.
- Kappes, M.S., Keiler, M., von Elverfeldt, K. & Glade, T. (2012). "Challenges of analyzing multi-hazard risk: a review." *Natural Hazards*, 64(2), 1925–1958.
- De Angeli, S., Malamud, B.D., Rossi, L., Taylor, F.E., Trasforini, E. & Rudari, R. (2022). "A multi-hazard framework for spatial-temporal impact analysis." *International Journal of Disaster Risk Reduction*, 73, 102829.

### Visualization and knowledge organization

- Holten, D. (2006). "Hierarchical Edge Bundling: Visualization of Adjacency Relations in Hierarchical Data." *IEEE Transactions on Visualization and Computer Graphics*, 12(5), 741–748. (The edge bundling technique used in "The Web" view.)
- Bostock, M., Ogievetsky, V. & Heer, J. (2011). "D3: Data-Driven Documents." *IEEE Transactions on Visualization and Computer Graphics*, 17(12), 2301–2309.
- Miles, A. & Bechhofer, S. (2009). "SKOS Simple Knowledge Organization System Reference." *W3C Recommendation*. https://www.w3.org/TR/skos-reference/
- Cotton, F., Kunz, M., Dottori, F. & Stocker, D. (2023). "Multi-hazard and systemic framework for risk-informed decision making." *EU Horizon Technical Report.*

## Attribution

Data from UNDRR/ISC Hazard Information Profiles, [preventionweb.net](https://www.preventionweb.net/drr-glossary/hips), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## License

Apache 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).

Hazard data is sourced from UNDRR/ISC and subject to [PreventionWeb terms of use](https://www.preventionweb.net/terms-and-conditions-use-preventionweb).
