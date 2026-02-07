/**
 * @module utils/dom
 * Shared DOM utility functions used across UI modules.
 */

/**
 * HTML-escape a string using the DOM's built-in textContent→innerHTML conversion.
 * Prevents XSS when interpolating user/API data into innerHTML.
 * @param {string} str - The string to escape
 * @returns {string} HTML-safe string
 */
export function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}

/**
 * Make a panel draggable by its title bar handle.
 * On first drag, switches from centered CSS transform to absolute positioning.
 * @param {HTMLElement} panel - The panel element to make draggable
 * @param {HTMLElement} handle - The drag handle element (e.g. title bar)
 */
export function setupDrag(panel, handle) {
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  handle.addEventListener('mousedown', (e) => {
    if (e.target.closest('button')) return; // don't drag from close button
    dragging = true;
    const rect = panel.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    // Switch from centered transform to absolute positioning
    if (!panel.classList.contains('dragged')) {
      panel.style.left = rect.left + 'px';
      panel.style.top = rect.top + 'px';
      panel.style.bottom = 'auto';
      panel.classList.add('dragged');
    }
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    panel.style.left = (e.clientX - offsetX) + 'px';
    panel.style.top = (e.clientY - offsetY) + 'px';
  });

  document.addEventListener('mouseup', () => {
    dragging = false;
  });
}

/**
 * Get a DOM element by ID with a console warning if not found.
 * @param {string} id - The element ID
 * @param {Document|Element} [context=document] - The context to search within
 * @returns {HTMLElement|null} The element, or null if not found
 */
export function getEl(id, context = document) {
  const el = context.getElementById ? context.getElementById(id) : document.getElementById(id);
  if (!el) {
    console.warn(`[getEl] Element not found: #${id}`);
  }
  return el;
}
