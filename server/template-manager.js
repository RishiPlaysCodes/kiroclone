import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECTS_DIR = path.join(__dirname, '..', 'user-projects');

export class TemplateManager {
  constructor() {
    this.templates = {
      'react-app': {
        name: 'React App',
        description: 'Modern React application with hooks',
        icon: 'react',
        files: {
          'src/App.jsx': this.reactApp(),
          'src/index.jsx': this.reactIndex(),
          'package.json': this.reactPkg(),
          'index.html': this.reactHTML(),
        }
      },
      'node-api': {
        name: 'Node.js API',
        description: 'Express REST API with routing',
        icon: 'node',
        files: {
          'src/index.js': this.nodeAPI(),
          'package.json': this.nodePkg(),
        }
      },

      'vanilla-js': {
        name: 'Vanilla JS',
        description: 'Clean HTML/CSS/JS project',
        icon: 'javascript',
        files: {
          'index.html': this.vanillaHTML(),
          'css/style.css': this.vanillaCSS(),
          'js/app.js': this.vanillaJS(),
        }
      },
      'python-app': {
        name: 'Python App',
        description: 'Python application starter',
        icon: 'python',
        files: {
          'main.py': this.pythonMain(),
          'requirements.txt': 'requests>=2.28.0\npython-dotenv>=1.0.0\n',
        }
      },
    };
  }

  listTemplates() {
    return Object.entries(this.templates).map(([id, t]) => ({
      id, name: t.name, description: t.description, icon: t.icon,
    }));
  }


  async createProject(name, templateId) {
    const template = this.templates[templateId];
    if (!template) throw new Error(`Template '${templateId}' not found`);
    const projectId = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const projectDir = path.join(PROJECTS_DIR, projectId);
    await fs.mkdir(projectDir, { recursive: true });
    for (const [filePath, content] of Object.entries(template.files)) {
      const fullPath = path.join(projectDir, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
    }
    return { id: projectId, name, template: templateId };
  }

  reactApp() {
    return `import React, { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);
  return (
    <div className="app">
      <h1>React App</h1>
      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
    </div>
  );
}
export default App;
`;
  }

  reactIndex() {
    return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
`;
  }


  reactPkg() {
    return JSON.stringify({
      name: "my-react-app", version: "1.0.0",
      scripts: { dev: "vite", build: "vite build" },
      dependencies: { react: "^18.2.0", "react-dom": "^18.2.0" },
      devDependencies: { vite: "^5.0.0", "@vitejs/plugin-react": "^4.0.0" },
    }, null, 2);
  }

  reactHTML() {
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>React App</title></head>
<body><div id="root"></div><script type="module" src="/src/index.jsx"></script></body></html>`;
  }

  nodeAPI() {
    return `import express from 'express';
import cors from 'cors';
const app = express();
app.use(cors());
app.use(express.json());
let items = [];
app.get('/api/items', (req, res) => res.json(items));
app.post('/api/items', (req, res) => {
  const item = { id: Date.now(), ...req.body };
  items.push(item);
  res.status(201).json(item);
});
app.listen(3000, () => console.log('Server running on :3000'));
`;
  }

  nodePkg() {
    return JSON.stringify({
      name: "my-api", version: "1.0.0", type: "module",
      scripts: { start: "node src/index.js" },
      dependencies: { express: "^4.18.0", cors: "^2.8.5" },
    }, null, 2);
  }


  vanillaHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>My App</title><link rel="stylesheet" href="css/style.css"></head>
<body><div id="app"><h1>My App</h1><p>Start building!</p></div>
<script src="js/app.js"></script></body></html>`;
  }

  vanillaCSS() {
    return `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui, sans-serif; background: #1a1a2e; color: #eee; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
#app { text-align: center; }
h1 { font-size: 2.5rem; margin-bottom: 1rem; }`;
  }

  vanillaJS() {
    return `document.addEventListener('DOMContentLoaded', () => {
  console.log('App loaded!');
});`;
  }

  pythonMain() {
    return `#!/usr/bin/env python3
"""Main application entry point."""

def main():
    print("Hello from Python!")
    data = [i * 2 for i in range(10)]
    print(f"Processed: {data}")

if __name__ == '__main__':
    main()
`;
  }
}
