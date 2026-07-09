/**
 * AI Providers - Connect to FREE AI APIs
 * Supports: Groq (free tier), Together AI, OpenRouter, Ollama (local)
 * User brings their own API key - all have free tiers
 */

export class AIProviders {
  constructor() {
    this.providers = {
      groq: {
        name: 'Groq',
        baseUrl: 'https://api.groq.com/openai/v1',
        models: [
          { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Recommended - High Limits)', context: 131072 },
          { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Smart but Low Limits)', context: 32768 },
          { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', context: 32768 },
          { id: 'gemma2-9b-it', name: 'Gemma 2 9B', context: 8192 },
        ],
        free: true,
        signupUrl: 'https://console.groq.com',
      },
      together: {
        name: 'Together AI',
        baseUrl: 'https://api.together.xyz/v1',
        models: [
          { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', name: 'Llama 3.1 70B', context: 131072 },
          { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', name: 'Llama 3.1 8B', context: 131072 },
          { id: 'Qwen/Qwen2.5-Coder-32B-Instruct', name: 'Qwen 2.5 Coder 32B', context: 32768 },
          { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', context: 131072 },
        ],
        free: true,
        signupUrl: 'https://api.together.xyz',
      },
      openrouter: {
        name: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        models: [
          { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (Free)', context: 131072 },
          { id: 'qwen/qwen-2.5-coder-32b-instruct:free', name: 'Qwen Coder 32B (Free)', context: 32768 },
          { id: 'deepseek/deepseek-chat-v3-0324:free', name: 'DeepSeek V3 (Free)', context: 131072 },
          { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B (Free)', context: 8192 },
        ],
        free: true,
        signupUrl: 'https://openrouter.ai',
      },
      ollama: {
        name: 'Ollama (Local)',
        baseUrl: 'http://localhost:11434/v1',
        models: [
          { id: 'llama3.1', name: 'Llama 3.1', context: 131072 },
          { id: 'codellama', name: 'Code Llama', context: 16384 },
          { id: 'deepseek-coder-v2', name: 'DeepSeek Coder V2', context: 131072 },
          { id: 'qwen2.5-coder', name: 'Qwen 2.5 Coder', context: 32768 },
        ],
        free: true,
        signupUrl: 'https://ollama.ai',
        local: true,
      },
    };
  }

  getProviders() {
    return Object.entries(this.providers).map(([id, p]) => ({
      id, name: p.name, models: p.models, free: p.free, signupUrl: p.signupUrl, local: p.local || false,
    }));
  }

  getSystemPrompt(mode = 'chat') {
    const base = `You are KiroClone AI, an expert coding assistant. Write complete, working code. Use modern best practices. Be concise.`;

    if (mode === 'autonomous') {
      return base + ` AUTONOMOUS MODE: Generate ALL files. Use format: \`\`\`language:filepath\ncode\n\`\`\` for each file. Complete code only.`;
    }

    return base;
  }

  async chat(provider, apiKey, model, messages, stream = false) {
    const providerConfig = this.providers[provider];
    if (!providerConfig) throw new Error(`Unknown provider: ${provider}`);

    const url = `${providerConfig.baseUrl}/chat/completions`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    // OpenRouter needs extra headers
    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://kiroclone.app';
      headers['X-Title'] = 'KiroClone IDE';
    }

    const body = {
      model,
      messages,
      stream,
      temperature: 0.7,
      max_tokens: 4096,
    };

    return { url, headers, body };
  }
}
