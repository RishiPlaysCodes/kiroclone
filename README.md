# KiroClone IDE - Free AI-Powered Coding Assistant

> Better than paid tools. Free forever. Your keys, your data.

![Version](https://img.shields.io/badge/version-2.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## What is this?

KiroClone is a **free, open-source AI-powered IDE** that runs in your browser. It connects to free AI models (Groq, Together AI, OpenRouter, Ollama) and lets you:

- **Chat with AI** - Ask questions, generate code, fix bugs
- **Autonomous Mode** - Describe what to build → AI creates ALL files automatically
- **GitHub Integration** - Push code directly to your repos
- **Code Editor** - Full editor with tabs, line numbers, shortcuts

## Quick Start

```bash
git clone https://github.com/RishiPlaysCodes/kiroclone.git
cd kiroclone
node server/index.js
# Open http://localhost:3000
```

## Get Free API Keys (60 seconds setup)

| Provider | Free Tier | Get Key |
|----------|-----------|---------|
| **Groq** | 30 req/min, fastest inference | [console.groq.com](https://console.groq.com) |
| **Together AI** | $1 free credit | [api.together.xyz](https://api.together.xyz) |
| **OpenRouter** | Free models available | [openrouter.ai](https://openrouter.ai) |
| **Ollama** | Unlimited (local) | [ollama.ai](https://ollama.ai) |

## Features

### 🤖 Real AI Models (not pattern matching!)
Connect to actual LLMs - Llama 3.3 70B, DeepSeek V3, Qwen Coder, Mixtral

### ⚡ Autonomous Mode
Tell the AI: "Create a full todo app with React"
→ AI generates ALL files → Files saved automatically to your project

### 🔗 GitHub Integration
- Connect with Personal Access Token
- Browse your repos
- Push files directly from the IDE

### 📝 Code Editor
- Syntax-aware editing
- Multiple file tabs
- Ctrl+S to save
- Line numbers

### 🔒 Privacy First
- API keys stored in YOUR browser (localStorage)
- Keys are sent directly from browser to AI provider
- Our server never sees your keys

## Architecture

```
kiroclone/
├── server/
│   ├── index.js           # HTTP server
│   ├── api.js             # API routes
│   ├── ai-providers.js    # Multi-provider AI config
│   ├── github-integration.js  # GitHub API
│   ├── autonomous.js      # Autonomous task engine
│   └── file-manager.js    # File operations
├── public/
│   ├── index.html         # Main UI
│   ├── css/               # Styles (dark/light themes)
│   └── js/
│       ├── app.js         # Main controller
│       ├── ai.js          # AI client (direct API calls)
│       ├── editor.js      # Code editor
│       ├── files.js       # File explorer
│       ├── github.js      # GitHub client
│       ├── store.js       # localStorage state
│       └── settings.js    # Settings panel
└── user-projects/         # Local projects
```

## Zero Dependencies

No npm install needed. Just Node.js. The entire app is self-contained.

## License

MIT - Use it, fork it, make it better.
