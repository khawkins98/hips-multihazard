/**
 * 8 HIPs hazard type definitions with colors and labels.
 * Colors chosen for accessibility and distinctiveness.
 */
export const HAZARD_TYPES = {
  'Meteorological and Hydrological': {
    color: '#2196F3',
    short: 'Met/Hydro',
    icon: '🌊',
  },
  'Extraterrestrial': {
    color: '#9C27B0',
    short: 'Extraterrestrial',
    icon: '☄️',
  },
  'Geological': {
    color: '#795548',
    short: 'Geological',
    icon: '🌋',
  },
  'Environmental': {
    color: '#4CAF50',
    short: 'Environmental',
    icon: '🌿',
  },
  'Chemical': {
    color: '#FF9800',
    short: 'Chemical',
    icon: '⚗️',
  },
  'Biological': {
    color: '#F44336',
    short: 'Biological',
    icon: '🦠',
  },
  'Technological': {
    color: '#607D8B',
    short: 'Technological',
    icon: '⚙️',
  },
  'Societal': {
    color: '#E91E63',
    short: 'Societal',
    icon: '👥',
  },
};

// Fallback for unmapped types
export const DEFAULT_TYPE = {
  color: '#9E9E9E',
  short: 'Unknown',
  icon: '?',
};

/**
 * Look up a type definition by name, handling partial matches.
 * The API type names don't always match exactly.
 */
export function getTypeDef(typeName) {
  if (!typeName) return DEFAULT_TYPE;

  // Direct match
  if (HAZARD_TYPES[typeName]) return HAZARD_TYPES[typeName];

  // Partial match (API names can vary slightly)
  const lower = typeName.toLowerCase();
  for (const [key, def] of Object.entries(HAZARD_TYPES)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return def;
    }
  }

  return DEFAULT_TYPE;
}
