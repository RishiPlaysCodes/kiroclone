/**
 * Settings Panel
 */
class SettingsManager {
  constructor() { this.render(); }

  render() {
    const el = document.getElementById('settings-content');
    if (!el) return;
    const providers = [
      { id: 'groq', name: 'Groq', url: 'https://console.groq.com/keys' },
      { id: 'together', name: 'Together AI', url: 'https://api.together.xyz/settings/api-keys' },
      { id: 'openrouter', name: 'OpenRouter', url: 'https://openrouter.ai/keys' },
    ];

    el.innerHTML = `
      <div class="settings-section">
        <h4>🔑 API Keys (stored locally, never sent to our servers)</h4>
        ${providers.map(p => {
          const hasKey = !!Store.getApiKey(p.id);
          return `<div class="settings-item">
            <label>${p.name} <span class="key-status ${hasKey?'set':'unset'}">${hasKey?'✓ Set':'Not set'}</span></label>
            <input type="password" id="key-${p.id}" value="${Store.getApiKey(p.id)}" placeholder="Enter API key">
            <p class="hint"><a href="${p.url}" target="_blank">Get free API key →</a></p>
          </div>`;
        }).join('')}
        <button class="btn btn-sm btn-primary" id="save-keys-btn">Save Keys</button>
      </div>
      <div class="settings-section">
        <h4>🎨 Theme</h4>
        <div class="theme-switch">
          <button data-theme="dark" class="${Store.getTheme()==='dark'?'active':''}">🌙 Dark</button>
          <button data-theme="light" class="${Store.getTheme()==='light'?'active':''}">☀️ Light</button>
        </div>
      </div>
      <div class="settings-section">
        <h4>ℹ️ About</h4>
        <p style="font-size:12px;color:var(--text-2)">KiroClone IDE v2.0</p>
        <p style="font-size:11px;color:var(--text-3);margin-top:4px">Free, open-source AI coding assistant. All AI calls go directly from your browser to the AI provider - your keys never touch our server.</p>
      </div>
    `;

    el.querySelector('#save-keys-btn')?.addEventListener('click', () => {
      providers.forEach(p => {
        const val = document.getElementById(`key-${p.id}`)?.value || '';
        Store.setApiKey(p.id, val);
      });
      this.render();
      alert('Keys saved!');
    });

    el.querySelectorAll('.theme-switch button').forEach(btn => {
      btn.addEventListener('click', () => {
        Store.setTheme(btn.dataset.theme);
        this.render();
      });
    });
  }
}

window.Settings = new SettingsManager();
