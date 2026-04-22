import { describe, it, expect } from 'vitest';
import { buildHierarchy } from './transform.js';

// Fixture: 2 Geological nodes (1 clustered, 1 unclustered), 1 Biological, 1 unknown type.
// geo1→bio1 is declared (bio1.causedBy includes geo1).
// bio1→geo1 is inferred (geo1.causedBy is empty).
const FIXTURE = {
  nodes: [
    {
      id: 'urn:geo1',
      label: 'Earthquake',
      identifier: 'HAZ-001',
      typeName: 'Geological',
      clusterName: 'Seismic',
      causes: ['urn:bio1'],
      causedBy: [],
    },
    {
      id: 'urn:bio1',
      label: 'Epidemic',
      identifier: 'HAZ-002',
      typeName: 'Biological',
      clusterName: 'Disease',
      causes: ['urn:geo1'],
      causedBy: ['urn:geo1'], // acknowledges geo1 → edge geo1→bio1 is declared
    },
    // Unclustered node (clusterName null → 'Unclustered')
    {
      id: 'urn:geo2',
      label: 'Volcano',
      identifier: 'HAZ-003',
      typeName: 'Geological',
      clusterName: null,
      causes: [],
      causedBy: [],
    },
    // Unknown type (not in TYPE_ORDER — excluded from tree children)
    {
      id: 'urn:unk1',
      label: 'Unknown Hazard',
      identifier: 'HAZ-004',
      typeName: 'UnknownType',
      clusterName: 'Mystery Cluster',
      causes: [],
      causedBy: [],
    },
  ],
  edges: [
    { source: 'urn:geo1', target: 'urn:bio1', type: 'causes' }, // declared
    { source: 'urn:bio1', target: 'urn:geo1', type: 'causes' }, // inferred (geo1.causedBy=[])
    { source: 'urn:geo1', target: 'urn:notexist', type: 'causes' }, // invalid
  ],
};

describe('buildHierarchy() — tree structure', () => {
  it('returns a root node with type children', () => {
    const { tree } = buildHierarchy(FIXTURE);
    expect(tree.name).toBe('root');
    expect(tree.children.length).toBeGreaterThan(0);
  });

  it('groups known hazard types under the correct tree branches', () => {
    const { tree } = buildHierarchy(FIXTURE);
    const typeNames = tree.children.map(c => c.label);
    expect(typeNames).toContain('Geological');
    expect(typeNames).toContain('Biological');
  });

  it('excludes nodes whose typeName is not in TYPE_ORDER from the tree', () => {
    const { tree } = buildHierarchy(FIXTURE);
    const typeNames = tree.children.map(c => c.label);
    expect(typeNames).not.toContain('UnknownType');
  });

  it('nests cluster children under their type node', () => {
    const { tree } = buildHierarchy(FIXTURE);
    const geoType = tree.children.find(c => c.label === 'Geological');
    expect(geoType).toBeDefined();
    const clusterNames = geoType.children.map(c => c.label);
    expect(clusterNames).toContain('Seismic');
  });

  it('places unclustered nodes under an "Unclustered" cluster', () => {
    const { tree } = buildHierarchy(FIXTURE);
    const geoType = tree.children.find(c => c.label === 'Geological');
    const clusterNames = geoType.children.map(c => c.label);
    expect(clusterNames).toContain('Unclustered');
  });

  it('places hazard leaf nodes inside their cluster', () => {
    const { tree } = buildHierarchy(FIXTURE);
    const geoType = tree.children.find(c => c.label === 'Geological');
    const seismic = geoType.children.find(c => c.label === 'Seismic');
    const leafNames = seismic.children.map(c => c.name);
    expect(leafNames).toContain('urn:geo1');
  });
});

describe('buildHierarchy() — hidden types', () => {
  it('excludes nodes of a hidden type from the tree', () => {
    const { tree } = buildHierarchy(FIXTURE, new Set(['Geological']));
    const typeNames = tree.children.map(c => c.label);
    expect(typeNames).not.toContain('Geological');
    expect(typeNames).toContain('Biological');
  });

  it('excludes edges involving hidden-type nodes', () => {
    const { edges } = buildHierarchy(FIXTURE, new Set(['Geological']));
    const ids = edges.flatMap(e => [e.source, e.target]);
    expect(ids).not.toContain('urn:geo1');
    expect(ids).not.toContain('urn:geo2');
  });
});

describe('buildHierarchy() — edges', () => {
  it('filters out edges to nodes not present in the dataset', () => {
    const { edges } = buildHierarchy(FIXTURE);
    expect(edges.every(e => e.source !== 'urn:notexist' && e.target !== 'urn:notexist')).toBe(true);
  });

  it('marks a reciprocated edge as declared', () => {
    const { edges } = buildHierarchy(FIXTURE);
    const edge = edges.find(e => e.source === 'urn:geo1' && e.target === 'urn:bio1');
    expect(edge).toBeDefined();
    expect(edge.declared).toBe(true);
  });

  it('marks a one-sided edge as not declared', () => {
    const { edges } = buildHierarchy(FIXTURE);
    const edge = edges.find(e => e.source === 'urn:bio1' && e.target === 'urn:geo1');
    expect(edge).toBeDefined();
    expect(edge.declared).toBe(false);
  });

  it('excludes inferred edges when declaredOnly is true', () => {
    const { edges } = buildHierarchy(FIXTURE, new Set(), { visible: true, declaredOnly: true });
    expect(edges.every(e => e.declared)).toBe(true);
  });
});

describe('buildHierarchy() — adjacency map', () => {
  it('builds an adjacency map with correct neighbours', () => {
    const { adjacency } = buildHierarchy(FIXTURE);
    expect(adjacency.get('urn:geo1')).toContain('urn:bio1');
    expect(adjacency.get('urn:bio1')).toContain('urn:geo1');
  });

  it('does not include unknown-type nodes in the adjacency map', () => {
    const { adjacency } = buildHierarchy(FIXTURE);
    expect(adjacency.has('urn:unk1')).toBe(false);
  });
});

describe('buildHierarchy() — nodeById map', () => {
  it('maps every node ID (including unknown type) to its data', () => {
    const { nodeById } = buildHierarchy(FIXTURE);
    expect(nodeById.size).toBe(FIXTURE.nodes.length);
    expect(nodeById.get('urn:geo1').label).toBe('Earthquake');
  });
});
