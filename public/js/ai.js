/**
 * AI Manager - All API calls go through OUR server (no CORS issues)
 */
class AIManager {
  constructor() {
    this.providers = [];
    this.currentMode = 'chat';
    this.messages = [];
    this.isLoading = false;
    this.init();
  }

  async init() {
    try {
      const res = await fetch('/api/providers');
      const data = await res.json();
      this.providers = data.providers;
      this.populateSelectors();
    } catch (e) { console.error('Failed to load providers:', e); }
  }

  populateSelectors() {
    const provSel = document.getElementById('provider-select');
    const modelSel = document.getElementById('model-select');
    if (!provSel) return;

    provSel.innerHTML = '<option value="">-- Select Provider --</option>' +
      this.providers.map(p => `<option value="${p.id}">${p.name}${p.free?' ✓ Free':''}</option>`).join('');

    const saved = Store.getProvider();
    if (saved) { provSel.value = saved; this.onProviderChange(saved); }

    provSel.onchange = () => {
      Store.setProvider(provSel.value);
      this.onProviderChange(provSel.value);
    };
    modelSel.onchange = () => Store.setModel(modelSel.value);
  }

  onProviderChange(providerId) {
    const modelSel = document.getElementById('model-select');
    const provider = this.providers.find(p => p.id === providerId);
    if (!provider) { modelSel.innerHTML = '<option>-- Select Model --</option>'; return; }
    modelSel.innerHTML = provider.models.map(m =>
      `<option value="${m.id}">${m.name} (${Math.round(m.context/1024)}K)</option>`
    ).join('');
    const savedModel = Store.getModel();
    if (savedModel && provider.models.find(m => m.id === savedModel)) {
      modelSel.value = savedModel;
    } else {
      modelSel.selectedIndex = 0;
      Store.setModel(modelSel.value);
    }
  }

  getConfig() {
    const provider = document.getElementById('provider-select')?.value || '';
    const model = document.getElementById('model-select')?.value || '';
    const apiKey = Store.getApiKey(provider);
    return { provider, model, apiKey };
  }

  async sendMessage(content) {
    const { provider, model, apiKey } = this.getConfig();
    if (!provider || !model) throw new Error('Please select a provider and model (click AI Chat in sidebar)');
    if (!apiKey && provider !== 'ollama') throw new Error(`Add your ${provider} API key in Settings (gear icon)`);

    this.messages.push({ role: 'user', content });

    // Call OUR server which proxies to AI provider (no CORS!)
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        apiKey,
        model,
        messages: this.messages,
        mode: this.currentMode
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error: ${res.status}`);
    }

    const data = await res.json();
    const reply = data.response || 'No response';
    this.messages.push({ role: 'assistant', content: reply });
    return reply;
  }

  clearMessages() { this.messages = []; }
}

window.AI = new AIManager();
