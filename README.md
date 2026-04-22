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

Data is fetched from the [PreventionWeb HIPs API](https://www.preventionweb.net/api/terms/hips) and stored as a build-time snapshot. At runtime, data loads through a multi-tier fallback chain: localStorage cache (1-hour TTL) → static snapshot → live API → stale cache → bundled snapshot (baked into JS). This ensures the app works behind restrictive firewalls and on repeat visits without network requests. The API publishes Linked Open Data using:

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

- UNDRR & ISC (2025). *UNDRR-ISC Hazard Information Profiles – 2025 Update.* United Nations Office for Disaster Risk Reduction & International Science Council. https://doi.org/10.24948/2025.05 — **primary data source for this project.**
- UNDRR & ISC (2025). *UNDRR-ISC Hazard Definition & Classification Review: 2025 Update of the Technical Report.* https://doi.org/10.24948/2025.04
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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, scope, and PR guidelines.

## License & attribution

Two licenses apply, and it is important to keep them distinct:

### Viewer source code

The source code in this repository is licensed under the [Apache License, Version 2.0](LICENSE).

### Hazard data (`public/data/hips.json` and runtime content)

The hazard data bundled with this application and rendered in the UI is drawn from the UNDRR-ISC Hazard Information Profiles, published by UNDRR and ISC under [Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/). Required citation:

> United Nations Office for Disaster Risk Reduction (UNDRR), & International Science Council (ISC). (2025). *UNDRR-ISC Hazard Information Profiles – 2025 Update.* <https://doi.org/10.24948/2025.05>

**Non-commercial use only.** The Apache 2.0 license on the viewer source does *not* grant rights to use the bundled HIP data commercially. If you want to deploy this viewer in a commercial context, you are responsible for obtaining permission from UNDRR for the underlying content: <https://www.undrr.org/contact-us>.

Attribution is required in any use of the content. No UNDRR/ISC endorsement of this viewer or its author is implied; the UNDRR logo is not used and must not be added. See [NOTICE](NOTICE) for the full third-party attribution and translation-disclaimer terms.

This is a personal project developed by an UNDRR staff member in an individual capacity — it is not an official UNDRR, ISC, or PreventionWeb product, and is not affiliated with, endorsed by, or sponsored by any of them.
