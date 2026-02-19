/**
 * @module ui/toolbar
 * Toolbar: zoom controls (in/out/fit/reset), Home button.
 * Now delegates to the view manager instead of Cytoscape directly.
 */
import { getEl } from '../utils/dom.js';

/**
 * Initialize toolbar controls.
 * @param {object} viewManager - View manager with zoom/fit/reset methods
 */
export function initToolbar(viewManager) {
  // Zoom controls
  getEl('btn-zoom-in')?.addEventListener('click', () => {
    viewManager.zoomIn();
  });

  getEl('btn-zoom-out')?.addEventListener('click', () => {
    viewManager.zoomOut();
  });

  getEl('btn-fit')?.addEventListener('click', () => {
    viewManager.fit();
  });

  getEl('btn-reset')?.addEventListener('click', () => {
    viewManager.reset();
  });

  // Home button — navigate back to start screen (clear URL params)
  const homeBtn = getEl('btn-about');
  if (homeBtn) {
    homeBtn.addEventListener('click', () => {
      window.location.href = window.location.pathname;
    });
  }
}
