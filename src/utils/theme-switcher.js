// Theme Switcher Utility — single-theme baseline for fullstack-vc.
// Theme axis is currently a no-op (only `theme-default` exists). The infrastructure
// is in place so a future second brand theme can be added without refactoring consumers.

const VALID_THEMES = ['default'];

export class ThemeSwitcher {
  constructor() {
    this.currentTheme = this.getStoredTheme() || 'default';
    this.applyTheme(this.currentTheme, true);
  }

  getStoredTheme() {
    if (typeof window === 'undefined') return 'default';
    const stored = localStorage.getItem('theme');
    return VALID_THEMES.includes(stored) ? stored : 'default';
  }

  storeTheme(theme) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
    }
  }

  applyTheme(theme, initialLoad = false) {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;

    VALID_THEMES.forEach(t => html.classList.remove(`theme-${t}`));
    html.removeAttribute('data-theme');

    const next = VALID_THEMES.includes(theme) ? theme : 'default';
    html.setAttribute('data-theme', next);
    html.classList.add(`theme-${next}`);

    if (!initialLoad) {
      this.currentTheme = next;
      this.storeTheme(next);
    }
    this.dispatchThemeChange(next);
  }

  dispatchThemeChange(theme) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme } }));
    }
  }

  toggleTheme() {
    const idx = VALID_THEMES.indexOf(this.currentTheme);
    const next = VALID_THEMES[(idx + 1) % VALID_THEMES.length];
    this.applyTheme(next);
    return next;
  }

  getCurrentTheme() {
    if (typeof document === 'undefined') return this.currentTheme;
    const html = document.documentElement;
    return VALID_THEMES.find(t => html.classList.contains(`theme-${t}`)) || 'default';
  }

  setTheme(theme) {
    if (!VALID_THEMES.includes(theme)) {
      console.warn(`Invalid theme: ${theme}. Valid: ${VALID_THEMES.join(', ')}`);
      return this.currentTheme;
    }
    this.applyTheme(theme);
    return theme;
  }

  getValidThemes() {
    return [...VALID_THEMES];
  }
}

export const themeSwitcher = new ThemeSwitcher();

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    themeSwitcher.applyTheme(themeSwitcher.getStoredTheme(), true);
    setTimeout(() => {
      document.documentElement.classList.add('theme-transition');
    }, 0);
  });
}
