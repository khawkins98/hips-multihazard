# HIPs Multi-Hazard Architecture

The UNDRR/ISC Hazard Information Profiles (HIPs) define a taxonomy of 281 hazards organized into a three-level hierarchy and connected by causal relationships. This document describes the conceptual structure of the taxonomy and the technical data model exposed by the PreventionWeb API.

## Conceptual structure

### Three-level hierarchy

The taxonomy organizes hazards into a strict three-level tree:

```
Type (8)
  └─ Cluster (38)
       └─ Hazard (281)
```

**Types** are the broadest classification. Each hazard belongs to exactly one type.

| Type | Hazards | Clusters |
|---|---|---|
| Biological | 83 | 6 |
| Meteorological and Hydrological | 53 | 8 |
| Technological | 50 | 6 |
| Chemical | 27 | 7 |
| Geological | 25 | 4 |
| Environmental | 24 | 1 |
| Extraterrestrial | 10 | 2 |
| Societal | 9 | 4 |

**Clusters** group related hazards within a type. For example, the Biological type contains clusters like Infectious Diseases, Animal Infectious Diseases, Plant Diseases, and Insect-related Diseases. A full listing:

- **Biological:** Infectious Diseases, Animal Infectious Diseases, Specific Infectious Diseases of Public Health Concern, Other Biological Hazards, Plant Diseases, Insect-related Diseases
- **Meteorological and Hydrological:** Water-related, Terrestrial, Temperature-related, Wind- & Pressure-related, Convective-related, Precipitation-related, Particle-related, Marine-related
- **Technological:** Industrial Failure, Construction/Structural Failure, Cyber Hazards, Waste, Transportation Accidents, Radiation
- **Chemical:** Carcinogens, Toxic Gases, Other Chemical Hazards and Toxins, Heavy Metals & Trace Elements, Asphyxiant Gases, Persistent Organic Pollutants (POPs), Chem. Hazards in Food & Feed
- **Geological:** Volcanic, Other Geohazard, Ground Failure, Seismic
- **Environmental:** Environmental Degradation
- **Extraterrestrial:** Extraterrestrial, Space Weather
- **Societal:** Behavioural, Conflict, Post-Conflict, Economic

**Hazards** are the leaf nodes. Each hazard has a unique identifier (e.g. `MH0600` for Flooding, `TL0305` for Fire), a label, a definition, and optional alternative labels.

### Causal network

Hazards are connected by directed causal edges. Each edge means "hazard A can cause hazard B."

Key statistics:

| Metric | Value |
|---|---|
| Total causal edges | 1,648 |
| Cross-type edges (A and B are different types) | 1,202 (73%) |
| Within-type edges (A and B are same type) | 446 (27%) |
| Connected hazards (at least one causal link) | 194 |
| Isolated hazards (no causal links) | 87 |
| Source-only hazards (cause others, not caused by any) | 30 |
| Sink-only hazards (caused by others, do not cause any) | 5 |

The causal network is heavily cross-type. Nearly three-quarters of all edges connect hazards from different types, reflecting the multi-hazard nature of disaster risk (a geological earthquake can trigger a meteorological tsunami, which causes a technological dam failure).

The most connected hazards are downstream infrastructure and consequence nodes:

| Hazard | ID | Connections |
|---|---|---|
| Structural Failure | TL0203 | 57 |
| Critical Infrastructure Failure | TL0207 | 54 |
| Bridge Failure | TL0204 | 53 |
| Fire | TL0305 | 52 |
| Power Outage/Blackout | TL0209 | 49 |
| Explosion | TL0304 | 47 |
| Dam Failure | TL0205 | 46 |
| Flooding | MH0600 | 45 |
| Building Collapse | TL0201 | 44 |

### Declared vs. inferred edges

The source data records causal relationships from both sides: a hazard's `causes` list and its `causedBy` list. When both sides agree (A says it causes B, and B says it is caused by A), the edge is **declared** (reciprocated). When only one side attests the relationship, the edge is **inferred** (unreciprocated).

Of 1,648 edges: 1,213 are declared and 435 are inferred. See `docs/methodology-causal-asymmetry.md` for a detailed analysis of why this asymmetry exists and what it means.

### Additional metadata per hazard

Beyond the hierarchy and causal links, each hazard profile carries:

- **Definition**: a prose description of the hazard
- **Alternative labels**: synonyms and translations
- **Scope notes**: typed annotations (keyed by note type)
- **References**: academic citations, standards documents, and external resources (`dct:source`, `prov:wasQuotedFrom`, `dct:references`, `prov:wasInfluencedBy`)
- **Conformance**: standards the hazard classification conforms to (`dct:conformsTo`), e.g. GHS chemical classification
- **Related**: non-causal associations to external classification codes (`skos:related`), e.g. GHS pictogram codes
- **Sub-parts**: component hazards or diagrams (`dct:hasPart`)
- **Version info**: curation version and update URL
- **Rights**: license (Creative Commons CC BY 4.0)

---

## API data model

### Endpoint

```
GET https://www.preventionweb.net/api/terms/hips
```

Returns ~6 MB of JSON-LD using the SKOS and XKOS vocabularies.

### Top-level structure

```json
{
  "@context": { ... },
  "@graph": [ ... ]
}
```

The `@context` maps namespace prefixes (`skos:`, `xkos:`, `dct:`, `prov:`, `owl:`) to their full URIs. The `@graph` array contains all items: the concept scheme, type/cluster containers (embedded), and hazard concepts.

### JSON-LD value conventions

Values in the API are not plain strings. Three patterns occur throughout:

| Pattern | Example | Extraction |
|---|---|---|
| Language-tagged string | `{"@language": "en", "@value": "Flooding"}` | Read `@value` |
| Plain `@value` wrapper | `{"@value": "some text"}` | Read `@value` |
| Reference object | `{"@id": "https://..."}` | Read `@id` |

Fields can be a single value or an array. The snapshot script normalizes these with three helpers: `str()` (extract string), `refId()` (extract URI), `toArray()` (ensure array).

### Graph item types

The `@graph` array contains items with these `@type` values:

| @type | Description |
|---|---|
| `skos:ConceptScheme` | The HIPs taxonomy itself (1 item) |
| `skos:Concept` | Individual hazard nodes (281 items) |

Type and cluster containers are not standalone graph items. They appear as embedded objects within each hazard's `skos:broader` array.

### Hazard concept structure (skos:Concept)

Each hazard concept in the `@graph` has the following fields:

```json
{
  "@id": "https://www.undrr.org/terms/hips/mh0600",
  "@type": "skos:Concept",
  "skos:prefLabel": {"@language": "en", "@value": "Flooding"},
  "dct:identifier": "MH0600",
  "skos:definition": {"@language": "en", "@value": "...prose definition..."},
  "skos:altLabel": [
    {"@language": "en", "@value": "Inundation"},
    {"@language": "en", "@value": "Fluvial flooding"}
  ],
  "skos:broader": [
    {
      "@id": "https://www.preventionweb.net/hips-type/meteorological-and-hydrological",
      "dct:type": "type",
      "skos:prefLabel": {"@language": "en", "@value": "Meteorological and Hydrological"}
    },
    {
      "@id": "https://www.preventionweb.net/hips-cluster/water-related",
      "dct:type": "cluster",
      "skos:prefLabel": {"@language": "en", "@value": "Water-related"}
    }
  ],
  "xkos:causes": [
    {"@id": "https://www.undrr.org/terms/hips/tl0203"},
    {"@id": "https://www.undrr.org/terms/hips/en0106"}
  ],
  "xkos:causedBy": [
    {"@id": "https://www.undrr.org/terms/hips/mh0301"},
    {"@id": "https://www.undrr.org/terms/hips/gh0200"}
  ],
  "skos:scopeNote": [
    {"dct:type": "someNoteType", "@value": "..."}
  ],
  "dct:source": [...],
  "prov:wasQuotedFrom": [...],
  "dct:references": [...],
  "prov:wasInfluencedBy": [...],
  "dct:conformsTo": [...],
  "dct:hasPart": [...],
  "skos:related": [...],
  "owl:versionInfo": "2025 update; https://...",
  "dct:rights": "Creative Commons CC BY 4.0"
}
```

#### Field reference

| Field | Type | Description |
|---|---|---|
| `@id` | URI | Unique identifier, e.g. `https://www.undrr.org/terms/hips/bi0109` |
| `@type` | string | Always `"skos:Concept"` for hazards |
| `skos:prefLabel` | lang string | Display name |
| `dct:identifier` | string | Short code, e.g. `"BI0109"` |
| `skos:definition` | lang string | Prose definition |
| `skos:altLabel` | lang string[] | Alternative names, synonyms, translations |
| `skos:broader` | object[] | Embedded type and cluster containers (see below) |
| `xkos:causes` | ref[] | Hazard IDs this hazard can cause |
| `xkos:causedBy` | ref[] | Hazard IDs that can cause this hazard |
| `skos:scopeNote` | typed note[] | Annotations keyed by `dct:type` |
| `dct:source` | ref/string[] | Primary source citations |
| `prov:wasQuotedFrom` | ref/string[] | Quoted source citations |
| `dct:references` | ref/string[] | Reference URLs |
| `prov:wasInfluencedBy` | ref/string[] | Influential sources |
| `dct:conformsTo` | ref[] | Classification standards (e.g. GHS) |
| `dct:hasPart` | ref/string[] | Sub-components or diagrams |
| `skos:related` | ref[] | Non-causal associations |
| `owl:versionInfo` | string | Version and update URL |
| `dct:rights` | string | License |

#### Embedded type/cluster containers in skos:broader

Each hazard's `skos:broader` array contains one or two embedded objects that identify the hazard's position in the hierarchy:

```json
{
  "@id": "https://www.preventionweb.net/hips-type/biological",
  "dct:type": "type",
  "skos:prefLabel": {"@language": "en", "@value": "Biological"}
}
```

```json
{
  "@id": "https://www.preventionweb.net/hips-cluster/infectious-diseases",
  "dct:type": "cluster",
  "skos:prefLabel": {"@language": "en", "@value": "Infectious Diseases"}
}
```

The `dct:type` field distinguishes them: `"type"` for top-level types, `"cluster"` for mid-level clusters. These are not standalone items in the `@graph` — they are repeated inline within each hazard that belongs to them.

### ID schemes

| Entity | URI pattern | Example |
|---|---|---|
| Hazard | `https://www.undrr.org/terms/hips/{code}` | `.../hips/mh0600` |
| Type | `https://www.preventionweb.net/hips-type/{slug}` | `.../hips-type/biological` |
| Cluster | `https://www.preventionweb.net/hips-cluster/{slug}` | `.../hips-cluster/infectious-diseases` |

Hazard codes follow the pattern `{TYPE_PREFIX}{CLUSTER_NUMBER}{HAZARD_NUMBER}`:
- `BI` = Biological, `MH` = Meteorological/Hydrological, `TL` = Technological, `CH` = Chemical, `GH` = Geological, `EN` = Environmental, `ET` = Extraterrestrial, `SO` = Societal

---

## Snapshot format

The build-time snapshot (`public/data/hips.json`, generated by `scripts/snapshot.js`) normalizes the JSON-LD into a flat structure optimized for client-side consumption.

### Top-level structure

```json
{
  "meta": {
    "source": "https://www.preventionweb.net/api/terms/hips",
    "fetchedAt": "2026-02-06T19:59:27.745Z",
    "nodeCount": 281,
    "edgeCount": 1648,
    "types": {
      "https://www.preventionweb.net/hips-type/biological": "Biological",
      ...
    },
    "clusters": {
      "https://www.preventionweb.net/hips-cluster/infectious-diseases": {
        "name": "Infectious Diseases",
        "typeId": "https://www.preventionweb.net/hips-type/biological"
      },
      ...
    }
  },
  "nodes": [...],
  "edges": [...]
}
```

### Node format (snapshot)

All JSON-LD wrappers are stripped. Values are plain strings, arrays of strings, or arrays of URIs.

```json
{
  "id": "https://www.undrr.org/terms/hips/mh0600",
  "label": "Flooding",
  "identifier": "MH0600",
  "definition": "...prose...",
  "altLabels": ["Inundation", "Fluvial flooding"],
  "typeId": "https://www.preventionweb.net/hips-type/meteorological-and-hydrological",
  "typeName": "Meteorological and Hydrological",
  "clusterId": "https://www.preventionweb.net/hips-cluster/water-related",
  "clusterName": "Water-related",
  "scopeNotes": {},
  "causes": ["https://www.undrr.org/terms/hips/tl0203", ...],
  "causedBy": ["https://www.undrr.org/terms/hips/mh0301", ...],
  "sources": ["https://..."],
  "quotedFrom": ["https://..."],
  "references": ["https://..."],
  "influencedBy": ["https://..."],
  "conformsTo": ["https://..."],
  "hasPart": ["#diagram1"],
  "related": ["https://..."],
  "versionInfo": "2025 update; https://...",
  "rights": "Creative Commons CC BY 4.0"
}
```

### Edge format (snapshot)

```json
{
  "source": "https://www.undrr.org/terms/hips/mh0600",
  "target": "https://www.undrr.org/terms/hips/tl0203",
  "type": "causes"
}
```

Edges are derived from the `xkos:causes` declarations. Each `causes` entry on a node produces one edge. All 1,648 edges have `type: "causes"`.

---

## Relationship to the visualization

### D3 hierarchy tree (edge bundling view)

The `src/views/edge-bundling/transform.js` module converts the snapshot into a 4-level tree for `d3.hierarchy()`:

```
root
  └─ Type (8 children, ordered for visual adjacency)
       └─ Cluster (sorted alphabetically)
            └─ Hazard (sorted by connectionCount descending)
```

`d3.cluster()` positions hazard leaves on the circumference of a circle. Type and cluster groupings control the angular placement. Edges are rendered separately as bundled Bezier curves through the hierarchy using `d3.lineRadial()` with `curveBundle.beta(tension)`.

### Cytoscape headless (algorithms only)

The `src/data/transform.js` module still converts the snapshot into Cytoscape elements for a headless instance used only for graph algorithms (centrality metrics, shortest path). During this transformation, edges are annotated with a `declared` boolean: `true` if the target node's `causedBy` array includes the source node (both sides attest the link), `false` otherwise (only the source's `causes` attests it).

### Cascade tree (cascade view)

The `src/views/cascade/cascade-data.js` module builds adjacency indices (`effectsIndex`, `triggersIndex`) from the snapshot for fast bidirectional tree construction. Trees are built lazily on demand when a user selects a hazard, expanding one level at a time.
