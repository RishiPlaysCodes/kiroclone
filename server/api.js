import { AIEngine } from './ai-engine.js';
import { FileManager } from './file-manager.js';
import { TemplateManager } from './template-manager.js';

const ai = new AIEngine();
const fileManager = new FileManager();
const templateManager = new TemplateManager();

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function sendJSON(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function sendError(res, message, status = 400) {
  sendJSON(res, { error: message }, status);
}

export async function handleApiRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  try {
    if (pathname === '/api/chat' && req.method === 'POST') {
      const { messages, context } = await parseBody(req);
      if (!messages || !Array.isArray(messages)) return sendError(res, 'Messages array required');
      const response = await ai.chat(messages, context);
      return sendJSON(res, { response });
    }

    if (pathname === '/api/chat/stream' && req.method === 'POST') {
      const { messages, context } = await parseBody(req);
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
      await ai.streamChat(messages, context, (chunk) => {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      });
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    if (pathname === '/api/generate' && req.method === 'POST') {
      const { prompt, language, context } = await parseBody(req);
      const code = await ai.generateCode(prompt, language, context);
      return sendJSON(res, { code });
    }

    if (pathname === '/api/explain' && req.method === 'POST') {
      const { code, language } = await parseBody(req);
      const explanation = await ai.explainCode(code, language);
      return sendJSON(res, { explanation });
    }

    if (pathname === '/api/refactor' && req.method === 'POST') {
      const { code, language, instruction } = await parseBody(req);
      const refactored = await ai.refactorCode(code, language, instruction);
      return sendJSON(res, { code: refactored });
    }

    if (pathname === '/api/files' && req.method === 'GET') {
      const projectId = url.searchParams.get('projectId') || 'default';
      const files = await fileManager.listFiles(projectId);
      return sendJSON(res, { files });
    }

    if (pathname === '/api/files' && req.method === 'POST') {
      const { projectId, filePath, content } = await parseBody(req);
      await fileManager.saveFile(projectId || 'default', filePath, content);
      return sendJSON(res, { success: true });
    }

    if (pathname === '/api/files' && req.method === 'DELETE') {
      const { projectId, filePath } = await parseBody(req);
      await fileManager.deleteFile(projectId || 'default', filePath);
      return sendJSON(res, { success: true });
    }

    if (pathname === '/api/files/read' && req.method === 'POST') {
      const { projectId, filePath } = await parseBody(req);
      const content = await fileManager.readFile(projectId || 'default', filePath);
      return sendJSON(res, { content });
    }

    if (pathname === '/api/templates' && req.method === 'GET') {
      return sendJSON(res, { templates: templateManager.listTemplates() });
    }

    if (pathname === '/api/projects/create' && req.method === 'POST') {
      const { name, template } = await parseBody(req);
      const project = await templateManager.createProject(name, template);
      return sendJSON(res, { project });
    }

    if (pathname === '/api/projects' && req.method === 'GET') {
      const projects = await fileManager.listProjects();
      return sendJSON(res, { projects });
    }

    sendError(res, 'Not found', 404);
  } catch (error) {
    console.error('API Error:', error);
    sendError(res, error.message || 'Internal server error', 500);
  }
}
