'use client';

import { useEffect } from 'react';

/**
 * Pins the dark theme while the calling page is mounted.
 *
 * Several pages (landing, labs, safety, bio-synthetics, store, Life OS) are
 * styled dark-first with hardcoded colors and do not have a clean light-mode
 * appearance. This hook forces `data-theme="dark"` on those pages so toggling
 * light never produces a broken layout, and restores the user's previous
 * preference when they navigate away. A MutationObserver re-applies dark if
 * next-themes (or the theme switcher) tries to change it while mounted.
 */
export function useForceDarkTheme() {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute('data-theme');

    const force = () => {
      if (root.getAttribute('data-theme') !== 'dark') {
        root.setAttribute('data-theme', 'dark');
      }
    };

    force();
    const observer = new MutationObserver(force);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      observer.disconnect();
      if (previous) root.setAttribute('data-theme', previous);
    };
  }, []);
}
