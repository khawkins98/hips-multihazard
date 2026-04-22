import { describe, it, expect } from 'vitest';
import { transformToElements } from './transform.js';

// Two normal nodes (declared edge between them), one bio node,
// one node with missing type/cluster, one unclustered node.
const FIXTURE = {
  nodes: [
    {
      id: 'urn:geo1',
      label: 'Earthquake',
      identifier: 'HAZ-001',
      typeId: 'type-geo',
      typeName: 'Geological',
      clusterId: 'cluster-seismic',
      clusterName: 'Seismic',
      causes: ['urn:geo2'],
      causedBy: [],
    },
    {
      id: 'urn:geo2',
      label: 'Tsunami',
      identifier: 'HAZ-002',
      typeId: 'type-geo',
      typeName: 'Geological',
      clusterId: 'cluster-seismic',
      clusterName: 'Seismic',
      causes: [],
      causedBy: ['urn:geo1'], // acknowledges geo1 → declared edge
    },
    {
      id: 'urn:bio1',
      label: 'Epidemic',
      identifier: 'HAZ-003',
      typeId: 'type-bio',
      typeName: 'Biological',
      clusterId: 'cluster-disease',
      clusterName: 'Disease',
      causes: [],
      causedBy: [], // does NOT acknowledge geo1 → inferred edge
    },
    // Node with missing typeName and clusterName
    {
      id: 'urn:unk1',
      label: 'Unknown Hazard',
      identifier: 'HAZ-004',
      typeId: null,
      typeName: null,
      clusterId: null,
      clusterName: null,
      causes: [],
      causedBy: [],
    },
    // Node that has a type but no cluster
    {
      id: 'urn:geo3',
      label: 'Unclustered Geo',
      identifier: 'HAZ-005',
      typeId: 'type-geo',
      typeName: 'Geological',
      clusterId: null,
      clusterName: null,
      causes: [],
      causedBy: [],
    },
  ],
  edges: [
    { source: 'urn:geo1', target: 'urn:geo2', type: 'causes' }, // declared
    { source: 'urn:geo1', target: 'urn:bio1', type: 'causes' }, // inferred
    { source: 'urn:geo1', target: 'urn:notexist', type: 'causes' }, // invalid target
  ],
};

describe('transformToElements() — flat grouping', () => {
  it('returns one element per node with no compound parents', () => {
    const { elements } = transformToElements(FIXTURE, 'flat');
    const nodes = elements.filter(e => e.group === 'nodes');
    expect(nodes).toHaveLength(FIXTURE.nodes.length);
    expect(nodes.every(n => !n.data.isCompound)).toBe(true);
  });

  it('assigns no parent to any node in flat mode', () => {
    const { elements } = transformToElements(FIXTURE, 'flat');
    const hazardNodes = elements.filter(e => e.group === 'nodes');
    expect(hazardNodes.every(n => n.data.parent === undefined)).toBe(true);
  });
});

describe('transformToElements() — type grouping', () => {
  it('creates compound type nodes for each distinct typeId', () => {
    const { elements } = transformToElements(FIXTURE, 'type');
    const compounds = elements.filter(e => e.data.isCompound && e.data.compoundType === 'type');
    const compoundIds = compounds.map(c => c.data.id);
    expect(compoundIds).toContain('type:type-geo');
    expect(compoundIds).toContain('type:type-bio');
  });

  it('does not create cluster compound nodes in type mode', () => {
    const { elements } = transformToElements(FIXTURE, 'type');
    const clusterCompounds = elements.filter(e => e.data.compoundType === 'cluster');
    expect(clusterCompounds).toHaveLength(0);
  });

  it('assigns type parent to hazard nodes that have a typeId', () => {
    const { elements } = transformToElements(FIXTURE, 'type');
    const geoNode = elements.find(e => e.data.id === 'urn:geo1');
    expect(geoNode.data.parent).toBe('type:type-geo');
  });

  it('assigns no parent to nodes with missing typeId in type mode', () => {
    const { elements } = transformToElements(FIXTURE, 'type');
    const unkNode = elements.find(e => e.data.id === 'urn:unk1');
    expect(unkNode.data.parent).toBeUndefined();
  });
});

describe('transformToElements() — cluster grouping', () => {
  it('creates both type and cluster compound nodes', () => {
    const { elements } = transformToElements(FIXTURE, 'cluster');
    const typeCompounds = elements.filter(e => e.data.compoundType === 'type');
    const clusterCompounds = elements.filter(e => e.data.compoundType === 'cluster');
    expect(typeCompounds.length).toBeGreaterThan(0);
    expect(clusterCompounds.length).toBeGreaterThan(0);
  });

  it('assigns cluster parent to a fully-clustered hazard node', () => {
    const { elements } = transformToElements(FIXTURE, 'cluster');
    const geoNode = elements.find(e => e.data.id === 'urn:geo1');
    expect(geoNode.data.parent).toBe('cluster:cluster-seismic');
  });

  it('unclustered nodes have no parent in cluster mode (no type fallback)', () => {
    // The code only sets a type parent in 'type' grouping mode; in 'cluster' mode
    // a node without a clusterId has no compound parent.
    const { elements } = transformToElements(FIXTURE, 'cluster');
    const geo3 = elements.find(e => e.data.id === 'urn:geo3');
    expect(geo3.data.parent).toBeUndefined();
  });
});

describe('transformToElements() — edges', () => {
  it('filters out edges whose target is not in the node set', () => {
    const { elements } = transformToElements(FIXTURE, 'flat');
    const edges = elements.filter(e => e.group === 'edges');
    const ids = edges.map(e => e.data.id);
    expect(ids.every(id => !id.includes('notexist'))).toBe(true);
  });

  it('marks a reciprocated edge as declared', () => {
    const { elements } = transformToElements(FIXTURE, 'flat');
    const edge = elements.find(e => e.data.id === 'edge:urn:geo1->urn:geo2');
    expect(edge).toBeDefined();
    expect(edge.data.declared).toBe(true);
  });

  it('marks a one-sided edge as inferred (not declared)', () => {
    const { elements } = transformToElements(FIXTURE, 'flat');
    const edge = elements.find(e => e.data.id === 'edge:urn:geo1->urn:bio1');
    expect(edge).toBeDefined();
    expect(edge.data.declared).toBe(false);
  });
});

describe('transformToElements() — nodeDataMap', () => {
  it('maps every node ID to its original data object', () => {
    const { nodeDataMap } = transformToElements(FIXTURE, 'flat');
    expect(nodeDataMap.size).toBe(FIXTURE.nodes.length);
    expect(nodeDataMap.get('urn:geo1').label).toBe('Earthquake');
  });
});

describe('transformToElements() — missing fields', () => {
  it('falls back typeName to "Unknown" for nodes with no typeName', () => {
    const { elements } = transformToElements(FIXTURE, 'flat');
    const unk = elements.find(e => e.data.id === 'urn:unk1');
    expect(unk).toBeDefined();
    expect(unk.data.typeName).toBe('Unknown');
  });

  it('falls back clusterName to empty string for nodes with no clusterName', () => {
    const { elements } = transformToElements(FIXTURE, 'flat');
    const unk = elements.find(e => e.data.id === 'urn:unk1');
    expect(unk.data.clusterName).toBe('');
  });
});
