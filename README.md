# Kiro Clone - Free AI Coding Assistant

A free, open-source AI-powered coding assistant inspired by Kiro. Build apps, fix bugs, and learn programming — all from your browser.

## Features

- **AI Chat Assistant** - Ask questions, generate code, fix bugs, get explanations
- **Code Editor** - Full-featured editor with line numbers, tabs, and keyboard shortcuts
- **File Explorer** - Create, edit, and manage project files
- **Project Templates** - Start new projects from pre-built templates (React, Node.js, Vanilla JS, Python)
- **Dark/Light Theme** - Toggle between themes
- **Keyboard Shortcuts** - Ctrl+S (save), Ctrl+B (toggle sidebar), Ctrl+Shift+N (new project)

## Quick Start

```bash
# No dependencies needed! Just run:
node server/index.js

# Open http://localhost:3000
```

## How It Works

The app runs entirely as a standalone Node.js application with:
- **Zero external dependencies** - Uses only Node.js built-in modules
- **Built-in AI Engine** - Pattern-matching code intelligence (can be extended to use Ollama, HuggingFace, or any free AI API)
- **In-browser file management** - Projects stored locally on disk
- **Modern responsive UI** - Works on desktop and mobile

## Extending with Real AI

To connect a real AI model, edit `server/ai-engine.js`:

```javascript
// Example: Connect to Ollama (free, local AI)
async chat(messages, context) {
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    body: JSON.stringify({ model: 'codellama', messages }),
  });
  const data = await response.json();
  return data.message.content;
}
```

## Project Structure

```
kiro-clone/
├── server/
│   ├── index.js          # HTTP server
│   ├── api.js            # API route handler
│   ├── ai-engine.js      # AI/code intelligence engine
│   ├── file-manager.js   # File operations
│   └── template-manager.js # Project templates
├── public/
│   ├── index.html        # Main app page
│   ├── css/
│   │   ├── main.css      # Core styles & themes
│   │   ├── sidebar.css   # File explorer styles
│   │   ├── chat.css      # Chat interface styles
│   │   └── editor.css    # Code editor styles
│   └── js/
│       ├── app.js        # Main app controller
│       ├── chat.js       # Chat interface
│       ├── editor.js     # Code editor
│       └── files.js      # File explorer
├── user-projects/        # User's created projects
├── package.json
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send message to AI assistant |
| POST | `/api/generate` | Generate code from prompt |
| POST | `/api/explain` | Explain code snippet |
| POST | `/api/refactor` | Refactor code |
| GET | `/api/templates` | List project templates |
| POST | `/api/projects/create` | Create project from template |
| GET | `/api/projects` | List all projects |
| GET | `/api/files?projectId=x` | List project files |
| POST | `/api/files` | Create/save file |
| POST | `/api/files/read` | Read file content |
| DELETE | `/api/files` | Delete file |

## License

MIT - Free to use, modify, and distribute.
