/**
 * @module utils/debounce
 * Shared debounce utility for throttling frequent events.
 */

/**
 * Create a debounced version of a function that delays invocation
 * until after `ms` milliseconds have elapsed since the last call.
 * @param {Function} fn - The function to debounce
 * @param {number} ms - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
