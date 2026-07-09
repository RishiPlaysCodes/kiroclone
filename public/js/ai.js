/**
 * AI - Server-proxied calls (no CORS)
 */
const AI = {
  providers: [],
  msgs: [],
  loading: false,

  async init() {
    try {
      const r = await fetch('/api/providers');
      const d = await r.json();
      this.providers = d.providers;
      this.populateUI();
    } catch {}
  },

  populateUI() {
    const ps = document.getElementById('sel-provider');
    const ms = document.getElementById('sel-model');
    ps.innerHTML = this.providers.map(p =>
      `<option value="${p.id}">${p.name}</option>`
    ).join('');
    ps.value = S.prov() || this.providers[0]?.id;
    ps.onchange = () => { S.setProv(ps.value); this.updateModels(); };
    ms.onchange = () => S.setModel(ms.value);
    this.updateModels();
  },

  updateModels() {
    const ms = document.getElementById('sel-model');
    const p = this.providers.find(x => x.id === S.prov());
    if (!p) return;
    ms.innerHTML = p.models.map(m =>
      `<option value="${m.id}">${m.name}</option>`
    ).join('');
    const saved = S.model();
    if (saved && p.models.find(m => m.id === saved)) ms.value = saved;
    else S.setModel(ms.value);
  },

  conf() {
    return {
      provider: document.getElementById('sel-provider')?.value,
      model: document.getElementById('sel-model')?.value,
      apiKey: S.key(document.getElementById('sel-provider')?.value)
    };
  },

  async send(content) {
    const { provider, model, apiKey } = this.conf();
    if (!provider || !model) throw new Error('Select provider & model');
    if (!apiKey && provider !== 'ollama') throw new Error('Set API key in Settings ⚙️');
    this.msgs.push({ role: 'user', content });
    const r = await fetch('/api/chat', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ provider, apiKey, model, messages: this.msgs, mode: 'chat' })
    });
    if (!r.ok) { const e = await r.json().catch(()=>({})); throw new Error(e.error || 'AI Error'); }
    const d = await r.json();
    const reply = d.response || 'No response';
    this.msgs.push({ role: 'assistant', content: reply });
    return reply;
  },

  clear() { this.msgs = []; }
};
