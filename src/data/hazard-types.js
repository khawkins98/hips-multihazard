/**
 * @module data/hazard-types
 * 8 HIPs hazard type definitions with colors, short labels, and icons.
 * Colors chosen for accessibility and distinctiveness on dark backgrounds.
 */
export const HAZARD_TYPES = {
  'Biological': {
    border: '#808080', bg: '#E8E8E8',
    short: 'Biological',
    icon: '🦠',
  },
  'Meteorological and Hydrological': {
    border: '#3AAE2B', bg: '#E8F5E5',
    short: 'Met/Hydro',
    icon: '🌊',
  },
  'Technological': {
    border: '#B8860B', bg: '#F5EDD6',
    short: 'Technological',
    icon: '⚙️',
  },
  'Chemical': {
    border: '#5B92C5', bg: '#ECF2F9',
    short: 'Chemical',
    icon: '⚗️',
  },
  'Geological': {
    border: '#C21E2C', bg: '#F9E6E8',
    short: 'Geological',
    icon: '🌋',
  },
  'Environmental': {
    border: '#1B355F', bg: '#E3E8EF',
    short: 'Environmental',
    icon: '🌿',
  },
  'Extraterrestrial': {
    border: '#E8792B', bg: '#FCF0E8',
    short: 'Extraterrestrial',
    icon: '☄️',
  },
  'Societal': {
    border: '#8B3FA0', bg: '#F2E8F6',
    short: 'Societal',
    icon: '👥',
  },
};

// Fallback for unmapped types
export const DEFAULT_TYPE = {
  border: '#9E9E9E', bg: '#F5F5F5',
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
