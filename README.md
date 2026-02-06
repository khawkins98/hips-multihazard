# HIPs Multi-Hazard Explorer

**[Live demo](https://khawkins98.github.io/hips-multihazard/)**

A network graph of the [UNDRR/ISC Hazard Information Profiles (HIPs)](https://www.preventionweb.net/drr-glossary/hips): 281 hazards, 8 types, 38 clusters, and ~1,648 causal relationships.

## Overview

The HIPs describe hazards used in disaster risk reduction. This tool plots the causal links between them (`xkos:causes` / `xkos:causedBy`), so you can see how one hazard triggers or amplifies another.

Features:
- Force-directed, hierarchical, and concentric layouts
- Group hazards by type, cluster, or flat
- **Corridor view**: aggregates 1,648 individual causal edges into weighted "hyperspace routes" between the 8 hazard type groups — thicker, brighter lines indicate heavier causal traffic. Inspired by sci-fi hyperspace route maps and the flow-map tradition in thematic cartography.
- Click a node to highlight its neighborhood and see the full profile
- Search by name, alternate label, or identifier
- Filter by hazard type, toggle all causal links on/off

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

## References

### Multi-Hazard Ontology & Classification

- UNDRR/ISC (2020). *Hazard Definition and Classification Review: Technical Report.* United Nations Office for Disaster Risk Reduction & International Science Council. https://www.undrr.org/publication/hazard-definition-and-classification-review
- Murray, V. et al. (2021). "Hazard Information Profiles: Supplement to UNDRR-ISC Hazard Definition & Classification Review." *UNDRR/ISC Technical Report.*
- Tilloy, A., Malamud, B.D., Winter, H. & Joly-Laugel, A. (2019). "A review of quantification methodologies for multi-hazard interrelationships." *Earth-Science Reviews*, 196, 102881.
- Gill, J.C. & Malamud, B.D. (2014). "Reviewing and visualizing the interactions of natural hazards." *Reviews of Geophysics*, 52(4), 680–722.
- Kappes, M.S., Keiler, M., von Elverfeldt, K. & Glade, T. (2012). "Challenges of analyzing multi-hazard risk: a review." *Natural Hazards*, 64(2), 1925–1958.
- De Angeli, S., Malamud, B.D., Rossi, L., Taylor, F.E., Trasforini, E. & Rudari, R. (2022). "A multi-hazard framework for spatial-temporal impact analysis." *International Journal of Disaster Risk Reduction*, 73, 102829.

### Visualization & Knowledge Organization

- Franz, M., Lopes, C.T., Huck, G., Dong, Y., Sumer, O. & Bader, G.D. (2016). "Cytoscape.js: a graph theory library for visualisation and analysis." *Bioinformatics*, 32(2), 309–311.
- Miles, A. & Bechhofer, S. (2009). "SKOS Simple Knowledge Organization System Reference." *W3C Recommendation*. https://www.w3.org/TR/skos-reference/
- Cotton, F., Kunz, M., Dottori, F. & Stocker, D. (2023). "Multi-hazard and systemic framework for risk-informed decision making." *EU Horizon Technical Report.*

### Corridor View Inspirations

- Tobler, W.R. (1987). "Experiments in migration mapping by computer." *The American Cartographer*, 14(2), 155–163. (Origin of flow maps as a cartographic technique for showing aggregate movement between regions.)
- Phan, D., Xiao, L., Yeh, R., Hanrahan, P. & Winograd, T. (2005). "Flow Map Layout." *IEEE Symposium on Information Visualization (InfoVis)*. (Automated layout algorithms for edge-bundled flow maps.)
- Holten, D. (2006). "Hierarchical Edge Bundling: Visualization of Adjacency Relations in Hierarchical Data." *IEEE Transactions on Visualization and Computer Graphics*, 12(5), 741–748. (Visual technique for aggregating edges between groups in network diagrams.)

## Attribution

Data from UNDRR/ISC Hazard Information Profiles, [preventionweb.net](https://www.preventionweb.net/drr-glossary/hips), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## License

Apache 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).

Hazard data is sourced from UNDRR/ISC and subject to [PreventionWeb terms of use](https://www.preventionweb.net/terms-and-conditions-use-preventionweb).
