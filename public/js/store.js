/**
 * Store - localStorage wrapper for settings/state
 */
const Store = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem('kc_' + key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    localStorage.setItem('kc_' + key, JSON.stringify(value));
  },
  remove(key) { localStorage.removeItem('kc_' + key); },

  // Specific getters
  getApiKey(provider) { return this.get(`key_${provider}`, ''); },
  setApiKey(provider, key) { this.set(`key_${provider}`, key); },
  getProvider() { return this.get('provider', 'groq'); },
  setProvider(p) { this.set('provider', p); },
  getModel() { return this.get('model', ''); },
  setModel(m) { this.set('model', m); },
  getGitHubToken() { return this.get('github_token', ''); },
  setGitHubToken(t) { this.set('github_token', t); },
  getTheme() { return this.get('theme', 'dark'); },
  setTheme(t) { this.set('theme', t); document.documentElement.setAttribute('data-theme', t); },
  getProject() { return this.get('current_project', ''); },
  setProject(p) { this.set('current_project', p); },
};

// Apply saved theme on load
document.documentElement.setAttribute('data-theme', Store.getTheme());
window.Store = Store;
