(function () {
  const storageKey = 'portfolio-theme';
  const root = document.documentElement;
  const toggle = document.getElementById('theme-toggle');
  const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');

  function getSavedTheme() {
    try {
      return window.localStorage.getItem(storageKey);
    } catch (_error) {
      return null;
    }
  }

  function getPreferredTheme() {
    return mediaQuery.matches ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    if (toggle) {
      const nextTheme = theme === 'light' ? 'dark' : 'light';
      toggle.setAttribute('aria-label', `Switch to ${nextTheme} mode`);
      toggle.setAttribute('title', `Switch to ${nextTheme} mode`);
    }
  }

  function persistTheme(theme) {
    try {
      window.localStorage.setItem(storageKey, theme);
    } catch (_error) {
      // Ignore storage failures and keep the session theme in memory only.
    }
  }

  applyTheme(root.dataset.theme || getSavedTheme() || getPreferredTheme());

  if (toggle) {
    toggle.addEventListener('click', () => {
      const nextTheme = root.dataset.theme === 'light' ? 'dark' : 'light';
      applyTheme(nextTheme);
      persistTheme(nextTheme);
    });
  }

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', () => {
      if (getSavedTheme()) return;
      applyTheme(getPreferredTheme());
    });
  }

  window.requestAnimationFrame(() => {
    root.classList.add('theme-ready');
  });
}());
