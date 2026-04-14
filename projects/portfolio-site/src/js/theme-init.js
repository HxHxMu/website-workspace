(function () {
  const storageKey = 'portfolio-theme';
  const root = document.documentElement;
  let theme = 'dark';

  try {
    const savedTheme = window.localStorage.getItem(storageKey);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      theme = savedTheme;
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      theme = 'light';
    }
  } catch (_error) {
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      theme = 'light';
    }
  }

  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}());
