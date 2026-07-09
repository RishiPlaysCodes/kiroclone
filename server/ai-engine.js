/**
 * AI Engine - Built-in code intelligence without external API dependencies
 * Uses pattern matching, templates, and heuristics for code generation
 * Can be extended to use free AI APIs (Ollama, HuggingFace, etc.)
 */

export class AIEngine {
  constructor() { this.conversationHistory = []; }

  async chat(messages, context = {}) {
    const lastMessage = messages[messages.length - 1];
    const userMessage = lastMessage?.content || '';
    return this.generateResponse(userMessage, context);
  }

  async streamChat(messages, context, onChunk) {
    const response = await this.chat(messages, context);
    const words = response.split(' ');
    for (let i = 0; i < words.length; i++) {
      onChunk((i === 0 ? '' : ' ') + words[i]);
      await new Promise(r => setTimeout(r, 20));
    }
  }

  async generateCode(prompt, language = 'javascript', context = {}) {
    return this.handleCreationRequest(prompt, context);
  }

  async explainCode(code, language = 'javascript') {
    const lines = code.split('\n').length;
    const hasAsync = code.includes('async') || code.includes('await');
    const hasClasses = code.includes('class ');
    let explanation = `## Code Analysis\n\n**Language:** ${language}\n**Lines:** ${lines}\n`;
    explanation += `**Features:** ${[hasAsync && 'Async/Await', hasClasses && 'Classes'].filter(Boolean).join(', ') || 'Basic syntax'}\n\n`;
    explanation += '**Suggestions:**\n- Add error handling for edge cases\n- Consider adding JSDoc comments\n- Extract magic numbers into named constants\n';
    return explanation;
  }

  async refactorCode(code, language, instruction) {
    let refactored = code;
    if (instruction?.includes('arrow')) refactored = refactored.replace(/function\s+(\w+)\s*\(([^)]*)\)\s*{/g, 'const $1 = ($2) => {');
    if (instruction?.includes('const')) refactored = refactored.replace(/\bvar\b/g, 'const');
    return refactored || code;
  }

  generateResponse(message, context) {
    const msg = message.toLowerCase();
    if (msg.includes('create') || msg.includes('build') || msg.includes('make')) return this.handleCreationRequest(message, context);
    if (msg.includes('fix') || msg.includes('bug') || msg.includes('error')) return this.handleFixRequest(message, context);
    if (msg.includes('explain') || msg.includes('what') || msg.includes('how')) return this.handleExplanationRequest(message, context);
    if (msg.includes('refactor') || msg.includes('improve')) return this.handleRefactorRequest(message, context);
    if (msg.includes('test')) return this.handleTestRequest(message, context);
    if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) return this.getGreeting();
    return this.getDefaultResponse(message);
  }

  getGreeting() {
    return `Hello! I'm **Kiro Clone**, your AI coding assistant. I can help you with:\n\n- **Create** new projects, components, and features\n- **Fix** bugs and resolve errors\n- **Explain** code and concepts\n- **Refactor** and optimize your code\n- **Generate** tests for your code\n\nWhat would you like to build today?`;
  }

  getDefaultResponse(message) {
    return `I understand you're asking about: "${message}"\n\nHere's how I can help:\n\n1. **Code Generation** - Tell me what to build\n2. **Bug Fixing** - Share your error\n3. **Code Review** - Paste your code\n4. **Explanation** - Ask me to explain any concept\n\nTry being more specific, like:\n- "Create a React component for a todo list"\n- "Fix this error: TypeError undefined is not a function"\n- "Explain how async/await works"`;
  }

  handleCreationRequest(message, context) {
    const msg = message.toLowerCase();
    if (msg.includes('react') || msg.includes('component')) return this.generateReactComponent(message);
    if (msg.includes('api') || msg.includes('endpoint')) return this.generateAPI(message);
    if (msg.includes('function') || msg.includes('util')) return this.generateFunction(message);
    if (msg.includes('page') || msg.includes('html')) return this.generateHTML(message);
    if (msg.includes('css') || msg.includes('style')) return this.generateCSS(message);
    if (msg.includes('python') || msg.includes('script')) return this.generatePython(message);
    return `I'll help you create that! Here's a starting point:\n\n\`\`\`javascript\n// ${message}\nexport function main() {\n  console.log('Feature created successfully!');\n}\nmain();\n\`\`\`\n\nWould you like me to add more detail?`;
  }

  handleFixRequest(message, context) {
    return `I'll help you fix that! Here's my analysis:\n\n**Common fixes:**\n\n\`\`\`javascript\n// Null/Undefined checks\nconst value = obj?.property?.nested ?? defaultValue;\n\n// Async/Await fix\nasync function getData() {\n  const response = await fetch('/api/data');\n  if (!response.ok) throw new Error(\`HTTP \${response.status}\`);\n  return response.json();\n}\n\n// Event listener cleanup\nuseEffect(() => {\n  window.addEventListener('resize', handleResize);\n  return () => window.removeEventListener('resize', handleResize);\n}, []);\n\`\`\`\n\n**Share your specific error** and I'll provide a targeted fix!`;
  }

  handleExplanationRequest(message, context) {
    const msg = message.toLowerCase();
    if (msg.includes('async') || msg.includes('await') || msg.includes('promise')) {
      return `## Async/Await Explained\n\n\`\`\`javascript\n// Promise chain (old way)\nfetch('/api/users')\n  .then(r => r.json())\n  .then(users => console.log(users))\n  .catch(err => console.error(err));\n\n// Async/Await (modern way)\nasync function getUsers() {\n  try {\n    const response = await fetch('/api/users');\n    const users = await response.json();\n    console.log(users);\n  } catch (error) {\n    console.error('Failed:', error);\n  }\n}\n\`\`\`\n\n**Key Points:**\n- \`async\` marks a function as asynchronous\n- \`await\` pauses execution until Promise resolves\n- Use \`try/catch\` for error handling\n- Use \`Promise.all()\` for parallel execution`;
    }
    return `Great question about: **${message}**\n\nHere's a breakdown:\n\n\`\`\`javascript\n// Example demonstrating the concept\nfunction example() {\n  // Readable, maintainable, testable code\n  return 'Understanding leads to better code!';\n}\n\`\`\`\n\nWould you like me to go deeper into any specific aspect?`;
  }

  handleRefactorRequest(message, context) {
    return `I'll help you refactor!\n\n\`\`\`javascript\n// Before: Nested callbacks\nfunction loadUser(id, callback) {\n  db.find(id, (err, user) => {\n    if (err) return callback(err);\n    callback(null, user);\n  });\n}\n\n// After: Clean async/await\nasync function loadUser(id) {\n  return await db.find(id);\n}\n\n// Before: Repetitive conditionals\nfunction getDiscount(type) {\n  if (type === 'student') return 0.2;\n  if (type === 'senior') return 0.3;\n  return 0;\n}\n\n// After: Data-driven\nconst DISCOUNTS = { student: 0.2, senior: 0.3 };\nconst getDiscount = (type) => DISCOUNTS[type] ?? 0;\n\`\`\`\n\n**Share your code** and I'll provide specific refactoring suggestions!`;
  }

  handleTestRequest(message, context) {
    return `Here are tests for your code:\n\n\`\`\`javascript\nimport { describe, it, expect, vi } from 'vitest';\n\ndescribe('MyFeature', () => {\n  it('should initialize with default values', () => {\n    const instance = new MyFeature();\n    expect(instance.data).toEqual([]);\n  });\n\n  it('should load data successfully', async () => {\n    vi.spyOn(global, 'fetch').mockResolvedValue({\n      ok: true,\n      json: () => Promise.resolve([{ id: 1 }]),\n    });\n    const result = await loadData();\n    expect(result).toHaveLength(1);\n  });\n\n  it('should handle errors gracefully', async () => {\n    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));\n    await expect(loadData()).rejects.toThrow('Network error');\n  });\n});\n\`\`\`\n\nShare your specific code and I'll generate tailored tests!`;
  }

  extractName(message) {
    const pascalMatch = message.match(/\b([A-Z][a-zA-Z]+)\b/);
    if (pascalMatch) return pascalMatch[1];
    const words = message.split(' ');
    const indicators = ['called', 'named', 'for', 'component'];
    for (let i = 0; i < words.length; i++) {
      if (indicators.includes(words[i].toLowerCase()) && words[i + 1]) {
        const name = words[i + 1].replace(/[^a-zA-Z]/g, '');
        if (name.length > 2) return name.charAt(0).toUpperCase() + name.slice(1);
      }
    }
    return 'MyComponent';
  }

  generateReactComponent(message) {
    const name = this.extractName(message);
    return `Here's your React component:\n\n\`\`\`jsx\nimport React, { useState, useEffect } from 'react';\n\nconst ${name} = ({ title, children }) => {\n  const [isLoading, setIsLoading] = useState(false);\n  const [data, setData] = useState(null);\n\n  useEffect(() => {\n    setIsLoading(true);\n    setTimeout(() => {\n      setData({ message: 'Component loaded!' });\n      setIsLoading(false);\n    }, 1000);\n  }, []);\n\n  if (isLoading) return <div className="${name.toLowerCase()}-loading">Loading...</div>;\n\n  return (\n    <div className="${name.toLowerCase()}">\n      <h2>{title || '${name}'}</h2>\n      {data && <p>{data.message}</p>}\n      <div className="${name.toLowerCase()}-content">{children}</div>\n    </div>\n  );\n};\n\nexport default ${name};\n\`\`\`\n\nWant me to add props validation, tests, or state management?`;
  }

  generateAPI(message) {
    return `Here's your API endpoint:\n\n\`\`\`javascript\nimport express from 'express';\nconst router = express.Router();\n\nrouter.get('/items', async (req, res) => {\n  try {\n    const { page = 1, limit = 10 } = req.query;\n    const items = await getItems({ page, limit });\n    res.json({ data: items, page, limit });\n  } catch (error) {\n    res.status(500).json({ error: error.message });\n  }\n});\n\nrouter.post('/items', async (req, res) => {\n  try {\n    const { name } = req.body;\n    if (!name) return res.status(400).json({ error: 'Name required' });\n    const item = await createItem({ name });\n    res.status(201).json(item);\n  } catch (error) {\n    res.status(500).json({ error: error.message });\n  }\n});\n\nrouter.delete('/items/:id', async (req, res) => {\n  try {\n    await deleteItem(req.params.id);\n    res.status(204).send();\n  } catch (error) {\n    res.status(500).json({ error: error.message });\n  }\n});\n\nexport default router;\n\`\`\`\n\nWant me to add authentication or database integration?`;
  }

  generateFunction(message) {
    return `Here's your utility function:\n\n\`\`\`javascript\n// Debounce\nexport function debounce(fn, delay = 300) {\n  let timeoutId;\n  return (...args) => {\n    clearTimeout(timeoutId);\n    timeoutId = setTimeout(() => fn(...args), delay);\n  };\n}\n\n// Deep clone\nexport function deepClone(obj) {\n  if (obj === null || typeof obj !== 'object') return obj;\n  if (Array.isArray(obj)) return obj.map(item => deepClone(item));\n  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, deepClone(v)]));\n}\n\n// Generate unique ID\nexport function generateId(prefix = '') {\n  const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);\n  return prefix ? \`\${prefix}_\${id}\` : id;\n}\n\`\`\`\n\nNeed more specific utility functions?`;
  }

  generateHTML(message) {
    return `Here's your HTML page:\n\n\`\`\`html\n<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My Page</title>\n  <style>\n    * { margin: 0; padding: 0; box-sizing: border-box; }\n    body { font-family: system-ui, sans-serif; background: linear-gradient(135deg, #667eea, #764ba2); min-height: 100vh; display: flex; align-items: center; justify-content: center; }\n    .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); max-width: 400px; width: 90%; }\n    h1 { color: #333; margin-bottom: 1rem; }\n  </style>\n</head>\n<body>\n  <div class="card">\n    <h1>Welcome</h1>\n    <p>Built with Kiro Clone</p>\n  </div>\n</body>\n</html>\n\`\`\``;
  }

  generateCSS(message) {
    return `Here's your CSS:\n\n\`\`\`css\n:root {\n  --primary: #6366f1;\n  --bg: #0f0f23;\n  --text: #e2e8f0;\n  --border: #334155;\n  --radius: 8px;\n}\n\n* { margin: 0; padding: 0; box-sizing: border-box; }\n\nbody {\n  font-family: 'Inter', system-ui, sans-serif;\n  background: var(--bg);\n  color: var(--text);\n  line-height: 1.6;\n}\n\n.btn {\n  padding: 0.625rem 1.25rem;\n  border: none;\n  border-radius: var(--radius);\n  font-size: 0.875rem;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n\n.btn-primary {\n  background: var(--primary);\n  color: white;\n}\n\n.btn-primary:hover {\n  transform: translateY(-1px);\n  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);\n}\n\`\`\``;
  }

  generatePython(message) {
    return `Here's your Python script:\n\n\`\`\`python\n#!/usr/bin/env python3\n\"\"\"Generated by Kiro Clone\"\"\"\n\nimport json\nfrom pathlib import Path\nfrom datetime import datetime\n\n\nclass App:\n    def __init__(self, config=None):\n        self.config = config or {}\n        self.data = []\n        self.created_at = datetime.now()\n\n    def load_data(self, filepath):\n        path = Path(filepath)\n        if path.exists():\n            self.data = json.loads(path.read_text())\n            print(f\"Loaded {len(self.data)} items\")\n\n    def process(self):\n        return [item for item in self.data]\n\n    def run(self):\n        print(f\"App started at {self.created_at}\")\n        results = self.process()\n        print(f\"Processed {len(results)} items\")\n        return results\n\n\nif __name__ == '__main__':\n    App().run()\n\`\`\``;
  }
}
