import { AIProviders } from './ai-providers.js';
import { FileManager } from './file-manager.js';
import { GitHubIntegration } from './github-integration.js';
import { AutonomousEngine } from './autonomous.js';
import https from 'https';
import http from 'http';

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

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}
function error(res, msg, status = 400) { json(res, { error: msg }, status); }

// Server-side HTTP fetch (since we can't use external fetch in all Node versions)
function serverFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = lib.request(reqOptions, (resp) => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => {
        resolve({ status: resp.statusCode, headers: resp.headers, body: data });
      });
    });

    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Request timeout')); });
    if (options.body) req.write(options.body);
    req.end();
  });
}

export async function handleApiRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;

  try {
    // === AI CHAT - SERVER PROXY (fixes CORS) ===
    if (p === '/api/chat' && req.method === 'POST') {
      const { provider, apiKey, model, messages, mode } = await parseBody(req);
      if (!provider || !model || !messages) return error(res, 'provider, model, messages required');
      
      // Use provided key, or fallback to env variable
      const key = apiKey || process.env.OPENROUTER_KEY || '';
      if (!key && provider !== 'ollama') return error(res, `API key required for ${provider}. Set in Settings or create .env file.`);

      const systemPrompt = ai.getSystemPrompt(mode || 'chat');
      const fullMessages = [{ role: 'system', content: systemPrompt }, ...messages];
      const config = await ai.chat(provider, key, model, fullMessages, false);

      // Make the actual API call from server (no CORS issues!)
      const response = await serverFetch(config.url, {
        method: 'POST',
        headers: config.headers,
        body: JSON.stringify(config.body),
      });

      if (response.status !== 200) {
        let errMsg = response.body;
        try {
          const errData = JSON.parse(response.body);
          errMsg = errData.error?.message || errData.message || response.body;
        } catch {}
        return error(res, `AI Error: ${errMsg}`, 502);
      }

      try {
        const data = JSON.parse(response.body);
        const reply = data.choices?.[0]?.message?.content || 'No response from AI';
        return json(res, { response: reply });
      } catch {
        return error(res, 'Failed to parse AI response', 500);
      }
    }

    // === AI CHAT CONFIG (returns config for reference, not used for actual calls) ===
    if (p === '/api/chat/config' && req.method === 'POST') {
      const { provider, apiKey, model, messages, mode } = await parseBody(req);
      const systemPrompt = ai.getSystemPrompt(mode || 'chat');
      const fullMessages = [{ role: 'system', content: systemPrompt }, ...messages];
      const config = await ai.chat(provider, apiKey, model, fullMessages, false);
      return json(res, { config });
    }

    // === PROVIDERS & MODELS ===
    if (p === '/api/providers' && req.method === 'GET') {
      return json(res, { providers: ai.getProviders() });
    }

    // === AUTONOMOUS MODE - MULTI-STEP PROJECT BUILDER ===
    
    // Step 1: Create plan
    if (p === '/api/autonomous/plan' && req.method === 'POST') {
      const { prompt, provider, apiKey, model, projectId } = await parseBody(req);
      if (!prompt || !provider || !model) return error(res, 'prompt, provider, model required');
      const key = apiKey || process.env.OPENROUTER_KEY || '';
      if (!key && provider !== 'ollama') return error(res, 'API key required');

      const task = autonomous.createTask(prompt, projectId || 'default');
      autonomous.updateTask(task.id, { status: 'planning' });

      // Ask AI to create file plan
      const planPrompt = autonomous.getPlanPrompt(prompt);
      const config = await ai.chat(provider, key, model, [
        { role: 'system', content: 'You are a project planner. Output only JSON arrays.' },
        { role: 'user', content: planPrompt }
      ], false);

      const response = await serverFetch(config.url, {
        method: 'POST', headers: config.headers, body: JSON.stringify(config.body),
      });

      if (response.status !== 200) {
        let errMsg = response.body;
        try { errMsg = JSON.parse(response.body).error?.message || errMsg; } catch {}
        autonomous.updateTask(task.id, { status: 'failed' });
        return error(res, `AI Error: ${errMsg}`, 502);
      }

      const aiData = JSON.parse(response.body);
      const reply = aiData.choices?.[0]?.message?.content || '';
      const plan = autonomous.parsePlan(reply);

      if (plan.length === 0) {
        autonomous.updateTask(task.id, { status: 'failed' });
        return error(res, 'AI could not create a plan. Try a more specific prompt.');
      }

      autonomous.updateTask(task.id, { status: 'planned', plan, totalFiles: plan.length });
      return json(res, { task: autonomous.getTask(task.id) });
    }

    // Step 2: Generate one file at a time
    if (p === '/api/autonomous/generate-file' && req.method === 'POST') {
      const { taskId, fileIndex, provider, apiKey, model } = await parseBody(req);
      const task = autonomous.getTask(taskId);
      if (!task) return error(res, 'Task not found');

      const fileInfo = task.plan[fileIndex];
      if (!fileInfo) return error(res, 'File index out of range');

      const key = apiKey || process.env.OPENROUTER_KEY || '';
      autonomous.updateTask(taskId, { status: 'generating', currentFile: fileInfo.path, progress: fileIndex });

      const filePrompt = autonomous.getFilePrompt(task.prompt, fileInfo.path, fileInfo.desc, task.completed);
      const config = await ai.chat(provider, key, model, [
        { role: 'system', content: 'Output ONLY file content. No explanations, no markdown wrapping. Just the raw file code.' },
        { role: 'user', content: filePrompt }
      ], false);

      const response = await serverFetch(config.url, {
        method: 'POST', headers: config.headers, body: JSON.stringify(config.body),
      });

      if (response.status !== 200) {
        task.failed.push({ path: fileInfo.path, error: 'AI generation failed' });
        return json(res, { success: false, error: 'Generation failed', task: autonomous.getTask(taskId) });
      }

      const aiData = JSON.parse(response.body);
      const content = aiData.choices?.[0]?.message?.content || '';
      const fileContent = autonomous.parseFileContent(content, fileInfo.path);

      // Save file to project
      await files.writeFile(task.projectId, fileInfo.path, fileContent);
      task.completed.push({ path: fileInfo.path, status: 'done' });

      // Check if done
      if (task.completed.length + task.failed.length >= task.plan.length) {
        autonomous.updateTask(taskId, { status: 'completed', progress: task.plan.length });
      } else {
        autonomous.updateTask(taskId, { progress: fileIndex + 1 });
      }

      return json(res, { success: true, file: fileInfo.path, task: autonomous.getTask(taskId) });
    }

    // Get task status
    if (p === '/api/autonomous/status' && req.method === 'POST') {
      const { taskId } = await parseBody(req);
      const task = autonomous.getTask(taskId);
      if (!task) return error(res, 'Task not found');
      return json(res, { task });
    }

    // Legacy: single-shot execute (for simple tasks)
    if (p === '/api/autonomous/execute' && req.method === 'POST') {
      const { taskId, response: aiResponse, projectId, prompt, provider, apiKey, model } = await parseBody(req);

      if (prompt && provider && model) {
        const systemPrompt = ai.getSystemPrompt('autonomous');
        const fullMessages = [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }];
        const config = await ai.chat(provider, apiKey, model, fullMessages, false);
        config.body.max_tokens = 4096;

        const aiRes = await serverFetch(config.url, {
          method: 'POST', headers: config.headers, body: JSON.stringify(config.body),
        });

        if (aiRes.status !== 200) {
          let errMsg = aiRes.body;
          try { errMsg = JSON.parse(aiRes.body).error?.message || errMsg; } catch {}
          return error(res, `AI Error: ${errMsg}`, 502);
        }

        const aiData = JSON.parse(aiRes.body);
        const reply = aiData.choices?.[0]?.message?.content || '';
        const parsedFiles = autonomous.parseFileContent ? [] : []; // Use new parser
        
        // Try to extract files from response
        const filePattern = /```(\w+):([^\n]+)\n([\s\S]*?)```/g;
        const extractedFiles = [];
        let match;
        while ((match = filePattern.exec(reply)) !== null) {
          extractedFiles.push({ path: match[2].trim(), content: match[3].trim() });
        }

        if (extractedFiles.length > 0 && projectId) {
          const results = await files.writeMultipleFiles(projectId, extractedFiles);
          return json(res, { success: true, files: results, response: reply });
        }
        return json(res, { success: true, files: [], response: reply });
      }

      if (aiResponse) {
        const filePattern = /```(\w+):([^\n]+)\n([\s\S]*?)```/g;
        const extractedFiles = [];
        let match;
        while ((match = filePattern.exec(aiResponse)) !== null) {
          extractedFiles.push({ path: match[2].trim(), content: match[3].trim() });
        }
        if (extractedFiles.length > 0 && projectId) {
          const results = await files.writeMultipleFiles(projectId, extractedFiles);
          return json(res, { success: true, files: results });
        }
      }
      return json(res, { success: true, files: [] });
    }

    // === GITHUB PROXY ===
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

      // Execute GitHub API call from server
      const ghRes = await serverFetch(config.url, {
        method: config.method,
        headers: config.headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
      });

      if (ghRes.status >= 400) {
        return error(res, `GitHub Error: ${ghRes.body}`, ghRes.status);
      }
      try {
        return json(res, JSON.parse(ghRes.body || '{}'));
      } catch {
        return json(res, { success: true });
      }
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

    // === DEFAULT CONFIG (auto-loads key from .env) ===
    if (p === '/api/config' && req.method === 'GET') {
      return json(res, {
        hasKey: !!process.env.OPENROUTER_KEY,
        defaultProvider: 'openrouter',
        defaultModel: 'deepseek/deepseek-chat-v3-0324:free',
      });
    }

    error(res, 'Not found', 404);
  } catch (e) {
    console.error('API Error:', e);
    error(res, e.message, 500);
  }
}
