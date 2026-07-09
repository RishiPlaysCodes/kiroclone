const app = {
  init() {
    AI.init();
    Ed.init();
    Files.init();
    Preview.init();
    Build.init();
    this.bindSideTabs();
    this.bindChat();
    this.bindSettings();
    this.bindTheme();
  },

  bindSideTabs() {
    document.querySelectorAll('.side-tab').forEach(t => {
      t.addEventListener('click', () => this.switchSide(t.dataset.tab));
    });
  },

  switchSide(tab) {
    document.querySelectorAll('.side-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.side-panel').forEach(p => p.classList.toggle('active', p.id === `panel-${tab}`));
  },

  bindChat() {
    const input = document.getElementById('chat-in');
    const send = async () => {
      const txt = input.value.trim(); if (!txt || AI.loading) return;
      input.value = '';
      this.addChat('user', txt);
      AI.loading = true;
      const ld = this.addTyping();
      try {
        const reply = await AI.send(txt);
        ld.remove();
        this.addChat('ai', reply);
      } catch (e) {
        ld.remove();
        this.addChat('ai', `❌ ${e.message}`);
      }
      AI.loading = false;
    };
    document.getElementById('btn-send')?.addEventListener('click', send);
    input?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }});
    document.getElementById('btn-clear-chat')?.addEventListener('click', () => { document.getElementById('chat-msgs').innerHTML = ''; AI.clear(); });
  },

  addChat(role, text) {
    const el = document.createElement('div');
    el.className = `chat-msg ${role}`;
    el.innerHTML = this.md(text);
    document.getElementById('chat-msgs').appendChild(el);
    document.getElementById('chat-msgs').scrollTop = 99999;
  },

  addTyping() {
    const el = document.createElement('div');
    el.className = 'chat-msg ai';
    el.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
    document.getElementById('chat-msgs').appendChild(el);
    document.getElementById('chat-msgs').scrollTop = 99999;
    return el;
  },

  md(t) {
    let h = t;
    h = h.replace(/```(\w*)\n([\s\S]*?)```/g, (_, l, c) => `<pre>${this.esc(c.trim())}</pre>`);
    h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
    h = h.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    h = h.replace(/\n/g, '<br>');
    return h;
  },

  esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; },

  bindSettings() {
    document.getElementById('btn-settings')?.addEventListener('click', () => this.showSettings());
    document.getElementById('btn-close-settings')?.addEventListener('click', () => document.getElementById('modal-settings').classList.add('hidden'));
  },

  showSettings() {
    const body = document.getElementById('settings-body');
    const provs = [
      { id:'groq', name:'Groq', url:'console.groq.com/keys' },
      { id:'together', name:'Together AI', url:'api.together.xyz/settings/api-keys' },
      { id:'openrouter', name:'OpenRouter', url:'openrouter.ai/keys' },
    ];
    body.innerHTML = provs.map(p => `
      <label>${p.name} API Key ${S.key(p.id)?'<span style="color:var(--ok)">✓</span>':''}</label>
      <input type="password" id="sk-${p.id}" value="${S.key(p.id)}" placeholder="Enter key">
      <div class="hint"><a href="https://${p.url}" target="_blank">Get free key →</a></div>
    `).join('') + `
      <label>GitHub Token</label>
      <input type="password" id="sk-gh" value="${S.ghToken()}" placeholder="For pushing to repos">
      <div class="hint"><a href="https://github.com/settings/tokens" target="_blank">Get token →</a></div>
      <button class="save-btn" id="btn-save-keys">Save All</button>
    `;
    document.getElementById('modal-settings').classList.remove('hidden');
    document.getElementById('btn-save-keys')?.addEventListener('click', () => {
      provs.forEach(p => S.setKey(p.id, document.getElementById(`sk-${p.id}`)?.value || ''));
      S.setGhToken(document.getElementById('sk-gh')?.value || '');
      document.getElementById('modal-settings').classList.add('hidden');
      document.getElementById('status-left').textContent = 'Settings saved ✓';
    });
  },

  bindTheme() {
    document.getElementById('btn-theme')?.addEventListener('click', () => {
      const t = S.theme() === 'dark' ? 'light' : 'dark';
      S.setTheme(t);
      document.getElementById('btn-theme').textContent = t === 'dark' ? '🌙' : '☀️';
    });
  }
};

document.addEventListener('DOMContentLoaded', () => app.init());
