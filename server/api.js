import { AIProviders } from './ai-providers.js';
import { FileManager } from './file-manager.js';
import { GitHubIntegration } from './github-integration.js';
import { AutonomousEngine } from './autonomous.js';

const ai = new AIProviders();
const files = new FileManager();
const github = new GitHubIntegration();
const autonomous = new AutonomousEngine();

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Invalid JSON')); } });
  });
}

function json(res, data, status = 200) { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); }
function error(res, msg, status = 400) { json(res, { error: msg }, status); }

export async function handleApiRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;

  try {
    // === AI CHAT (with real providers) ===
    if (p === '/api/chat' && req.method === 'POST') {
      const { provider, apiKey, model, messages, mode } = await parseBody(req);
      if (!provider || !model || !messages) return error(res, 'provider, model, messages required');

      const systemPrompt = ai.getSystemPrompt(mode || 'chat');
      const fullMessages = [{ role: 'system', content: systemPrompt }, ...messages];
      const config = await ai.chat(provider, apiKey || '', model, fullMessages, false);
      return json(res, { config }); // Frontend will make the actual API call
    }

    // === AI STREAMING ===
    if (p === '/api/chat/config' && req.method === 'POST') {
      const { provider, apiKey, model, messages, mode } = await parseBody(req);
      const systemPrompt = ai.getSystemPrompt(mode || 'chat');
      const fullMessages = [{ role: 'system', content: systemPrompt }, ...messages];
      const config = await ai.chat(provider, apiKey, model, fullMessages, true);
      return json(res, { config });
    }

    // === PROVIDERS & MODELS ===
    if (p === '/api/providers' && req.method === 'GET') {
      return json(res, { providers: ai.getProviders() });
    }

    // === AUTONOMOUS MODE ===
    if (p === '/api/autonomous/create' && req.method === 'POST') {
      const { prompt, projectId } = await parseBody(req);
      const task = autonomous.createTask(prompt, projectId || 'default');
      return json(res, { task });
    }

    if (p === '/api/autonomous/execute' && req.method === 'POST') {
      const { taskId, response, projectId } = await parseBody(req);
      // Parse files from AI response and write them
      const parsedFiles = autonomous.parseFilesFromResponse(response);
      if (parsedFiles.length > 0 && projectId) {
        const results = await files.writeMultipleFiles(projectId, parsedFiles);
        autonomous.updateTaskStatus(taskId, 'completed', { filesCreated: results });
        return json(res, { success: true, files: results, task: autonomous.getTask(taskId) });
      }
      autonomous.updateTaskStatus(taskId, 'completed', { message: 'No files to create' });
      return json(res, { success: true, files: [], task: autonomous.getTask(taskId) });
    }

    if (p === '/api/autonomous/tasks' && req.method === 'GET') {
      return json(res, { tasks: autonomous.listTasks() });
    }

    // === GITHUB INTEGRATION ===
    if (p === '/api/github/proxy' && req.method === 'POST') {
      const { token, action, params } = await parseBody(req);
      if (!token) return error(res, 'GitHub token required');

      let config;
      switch (action) {
        case 'user': config = await github.getUser(token); break;
        case 'repos': config = await github.listRepos(token, params?.page); break;
        case 'contents': config = await github.getRepoContents(token, params.owner, params.repo, params.path); break;
        case 'file': config = await github.getFileContent(token, params.owner, params.repo, params.path); break;
        case 'createFile': config = await github.createOrUpdateFile(token, params.owner, params.repo, params.path, params.content, params.message, params.sha); break;
        case 'deleteFile': config = await github.deleteFile(token, params.owner, params.repo, params.path, params.sha, params.message); break;
        case 'createRepo': config = await github.createRepo(token, params.name, params.description, params.private); break;
        case 'branches': config = await github.getBranches(token, params.owner, params.repo); break;
        case 'commits': config = await github.getCommits(token, params.owner, params.repo, params.page); break;
        default: return error(res, `Unknown action: ${action}`);
      }
      return json(res, { config });
    }

    // === FILE MANAGEMENT ===
    if (p === '/api/files' && req.method === 'GET') {
      const projectId = url.searchParams.get('projectId') || 'default';
      return json(res, { files: await files.listFiles(projectId) });
    }
    if (p === '/api/files/read' && req.method === 'POST') {
      const { projectId, filePath } = await parseBody(req);
      return json(res, { content: await files.readFile(projectId || 'default', filePath) });
    }
    if (p === '/api/files/write' && req.method === 'POST') {
      const { projectId, filePath, content } = await parseBody(req);
      await files.writeFile(projectId || 'default', filePath, content);
      return json(res, { success: true });
    }
    if (p === '/api/files/delete' && req.method === 'POST') {
      const { projectId, filePath } = await parseBody(req);
      await files.deleteFile(projectId || 'default', filePath);
      return json(res, { success: true });
    }

    // === PROJECTS ===
    if (p === '/api/projects' && req.method === 'GET') {
      return json(res, { projects: await files.listProjects() });
    }
    if (p === '/api/projects/create' && req.method === 'POST') {
      const { name } = await parseBody(req);
      return json(res, { project: await files.createProject(name) });
    }

    error(res, 'Not found', 404);
  } catch (e) {
    console.error('API Error:', e);
    error(res, e.message, 500);
  }
}
