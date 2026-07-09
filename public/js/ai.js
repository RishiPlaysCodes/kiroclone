/**
 * AI Manager - Handles communication with AI providers
 * Makes API calls directly from browser (keys stored locally)
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
    const res = await fetch('/api/providers');
    const data = await res.json();
    this.providers = data.providers;
    this.populateSelectors();
  }

  populateSelectors() {
    const provSel = document.getElementById('provider-select');
    const modelSel = document.getElementById('model-select');
    provSel.innerHTML = '<option value="">Select Provider</option>' +
      this.providers.map(p => `<option value="${p.id}">${p.name}${p.free?' (Free)':''}</option>`).join('');

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
    if (!provider) { modelSel.innerHTML = '<option>Select Model</option>'; return; }
    modelSel.innerHTML = provider.models.map(m =>
      `<option value="${m.id}">${m.name} (${Math.round(m.context/1024)}K ctx)</option>`
    ).join('');
    const savedModel = Store.getModel();
    if (savedModel && provider.models.find(m => m.id === savedModel)) modelSel.value = savedModel;
    else { modelSel.selectedIndex = 0; Store.setModel(modelSel.value); }
  }

  getConfig() {
    const provider = document.getElementById('provider-select').value;
    const model = document.getElementById('model-select').value;
    const apiKey = Store.getApiKey(provider);
    return { provider, model, apiKey };
  }

  async sendMessage(content) {
    const { provider, model, apiKey } = this.getConfig();
    if (!provider || !model) throw new Error('Please select a provider and model in the sidebar');
    if (!apiKey && provider !== 'ollama') throw new Error(`Add your ${provider} API key in Settings`);

    this.messages.push({ role: 'user', content });

    // Get chat config from server
    const res = await fetch('/api/chat/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey, model, messages: this.messages, mode: this.currentMode })
    });
    const { config } = await res.json();

    // Make actual API call to provider from browser
    const response = await fetch(config.url, {
      method: 'POST',
      headers: config.headers,
      body: JSON.stringify(config.body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API Error (${response.status}): ${err}`);
    }

    // Handle streaming response
    if (config.body.stream) {
      return this.handleStream(response);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'No response';
    this.messages.push({ role: 'assistant', content: reply });
    return reply;
  }

  async handleStream(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
      for (const line of lines) {
        const data = line.slice(6);
        if (data === '[DONE]') break;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || '';
          result += content;
          this.onStreamChunk?.(content);
        } catch {}
      }
    }

    this.messages.push({ role: 'assistant', content: result });
    return result;
  }

  clearMessages() { this.messages = []; }
}

window.AI = new AIManager();
