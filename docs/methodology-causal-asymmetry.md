# Causal asymmetry in the HIPs ontology

## The problem

The HIPs dataset stores causal relationships using two XKOS predicates: `xkos:causes` and `xkos:causedBy`. In a fully consistent knowledge graph these would be strict inverses: if node A declares `causes: [B]`, then node B would declare `causedBy: [A]`. The HIPs data does not enforce this. Many causal links are attested by only one side of the relationship.

The explorer labels these two categories **declared** and **inferred**:

- **Declared**: the relationship appears in the node's own `causes` or `causedBy` array. Both endpoints independently attest the link.
- **Inferred**: another node declares `causes: [thisNode]`, but this node does not list that source in its `causedBy` array. Only one endpoint attests the link.

"Inferred" is a misnomer. No algorithmic inference or link prediction happens. A better word is **unreciprocated**: the edge exists in the graph (built from the source node's `xkos:causes` declaration) but the target node's record does not acknowledge it. The app uses "declared" and "inferred" throughout the UI and codebase for brevity.

## How big the gap is

TL0405 (Road Traffic Accident) is an extreme case, but it shows the pattern clearly:

| Metric | Count |
|---|---|
| Declared causes (outgoing, from own `causes` array) | 7 |
| Declared causedBy (incoming, from own `causedBy` array) | 17 |
| Total declared connections | 24 |
| Additional incoming edges (other nodes claim `causes: [TL0405]`) | 39 |
| Total graph degree | 63 |

Nearly two-thirds of Road Traffic Accident's connectivity comes from unreciprocated declarations by other nodes. The same pattern shows up for any hazard that is a common downstream consequence, like flooding, displacement, contamination, or food insecurity, where many upstream hazards plausibly trigger the same outcome.

## Why the asymmetry exists

Several factors contribute, none of which mean the unreciprocated edges are wrong:

1. **Node-by-node curation.** The dataset was curated one hazard profile at a time. Each author listed the causes and effects most relevant to *their* hazard, with no reconciliation step to ensure inverse consistency across all 281 records.

2. **Lopsided attention to antecedents.** Authors naturally focus on the most direct or well-documented causes. The "Road Traffic Accident" author listed 17 `causedBy` entries covering the most obvious triggers. Meanwhile, dozens of other authors independently decided their hazard *can* cause road traffic accidents, a judgment that is individually reasonable but collectively produces a long tail of incoming edges that the TL0405 author never enumerated.

3. **Uneven editorial depth.** Some nodes have extensive metadata (scope notes, references, alt labels) while others are sparse. Nodes with thinner coverage are more likely to have incomplete `causedBy` arrays, so they show up as targets of many "inferred" edges.

4. **No schema-level enforcement.** SKOS/XKOS defines `xkos:causes` and `xkos:causedBy` as semantic inverses, but the PreventionWeb API does not enforce referential integrity. Nothing prevents a node from declaring a causal link that the other side does not acknowledge.

## What this means for analysis

### Declared degree measures editorial confidence, not causal strength

A declared (reciprocated) edge means two independent editorial decisions agreed the relationship exists. An inferred (unreciprocated) edge means only one did. Think of it as the difference between a cross-validated finding and a single-source claim: both may be correct, but one has stronger editorial backing.

### Graph degree is the better connectivity metric

Every edge in the graph originates from at least one `xkos:causes` declaration, so every edge has at least one editorial attestation. Declared degree requires *two* attestations (source's `causes` + target's `causedBy`), which sets a higher bar and systematically undercounts connectivity for nodes with incomplete `causedBy` arrays.

For network-level work (identifying hubs, computing centrality, measuring cross-type connectivity), use graph degree. Declared degree is useful as a confidence filter or for identifying which specific links have stronger editorial support.

### The asymmetry is a data quality signal

Nodes with a large gap between graph degree and declared degree are candidates for editorial review, since their `causedBy` arrays may be incomplete. Nodes where the two numbers are close have more internally consistent records.

### Possible correlations to investigate

- **Reference coverage vs. asymmetry.** Nodes with external source citations (`dct:source`, `prov:wasQuotedFrom`, etc.) may have more complete `causedBy` arrays. The explorer's "Reference coverage" insight card could be cross-referenced with the declared/inferred ratio.
- **Version history.** The `owl:versionInfo` field may indicate when records were last updated. Older records might have larger asymmetry gaps if the ontology has grown over time.
- **Type-level patterns.** Some hazard types (e.g., Technological, with 50 hazards) may show higher asymmetry if they were curated by a different team or at a different time.

## Terminology note

The codebase uses "declared" and "inferred" consistently across variable names (`declared`, `declaredDegree`, `inferredIds`), CSS classes (`.inferred`, `.causal-inferred`), HTML element IDs (`edge-declared-toggle`), and UI labels ("Declared only" toggle, "(inferred)" badge). "Reciprocated" / "unreciprocated" would be more precise, but the current terms are established in the implementation and work well enough with the definitions above.
