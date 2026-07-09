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
      if (!apiKey && provider !== 'ollama') return error(res, `API key required for ${provider}`);

      const systemPrompt = ai.getSystemPrompt(mode || 'chat');
      const fullMessages = [{ role: 'system', content: systemPrompt }, ...messages];
      const config = await ai.chat(provider, apiKey, model, fullMessages, false);

      // Make the actual API call from server (no CORS issues!)
      const response = await serverFetch(config.url, {
        method: 'POST',
        headers: config.headers,
        body: JSON.stringify(config.body),
      });

      if (response.status !== 200) {
        return error(res, `AI API Error (${response.status}): ${response.body}`, response.status);
      }

      try {
        const data = JSON.parse(response.body);
        const reply = data.choices?.[0]?.message?.content || 'No response from AI';
        return json(res, { response: reply });
      } catch {
        return error(res, 'Failed to parse AI response', 500);
      }
    }

    // === AI STREAMING via Server ===
    if (p === '/api/chat/stream' && req.method === 'POST') {
      const { provider, apiKey, model, messages, mode } = await parseBody(req);
      if (!provider || !model || !messages) return error(res, 'provider, model, messages required');

      const systemPrompt = ai.getSystemPrompt(mode || 'chat');
      const fullMessages = [{ role: 'system', content: systemPrompt }, ...messages];
      const config = await ai.chat(provider, apiKey, model, fullMessages, true);

      // Set up SSE
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      const parsed = new URL(config.url);
      const lib = parsed.protocol === 'https:' ? https : http;
      const reqOptions = {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: config.headers,
      };

      const proxyReq = lib.request(reqOptions, (proxyRes) => {
        proxyRes.on('data', chunk => {
          res.write(chunk);
        });
        proxyRes.on('end', () => {
          res.write('data: [DONE]\n\n');
          res.end();
        });
      });

      proxyReq.on('error', (e) => {
        res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
        res.end();
      });

      proxyReq.write(JSON.stringify(config.body));
      proxyReq.end();
      return;
    }

    // === PROVIDERS & MODELS ===
    if (p === '/api/providers' && req.method === 'GET') {
      return json(res, { providers: ai.getProviders() });
    }

    // === AUTONOMOUS MODE ===
    if (p === '/api/autonomous/execute' && req.method === 'POST') {
      const { taskId, response: aiResponse, projectId, prompt, provider, apiKey, model } = await parseBody(req);

      // If prompt is provided, make AI call first
      if (prompt && provider && model) {
        const systemPrompt = ai.getSystemPrompt('autonomous');
        const fullMessages = [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }];
        const config = await ai.chat(provider, apiKey, model, fullMessages, false);
        config.body.max_tokens = 16384;

        const aiRes = await serverFetch(config.url, {
          method: 'POST',
          headers: config.headers,
          body: JSON.stringify(config.body),
        });

        if (aiRes.status !== 200) {
          return error(res, `AI Error: ${aiRes.body}`, 500);
        }

        const aiData = JSON.parse(aiRes.body);
        const reply = aiData.choices?.[0]?.message?.content || '';
        const parsedFiles = autonomous.parseFilesFromResponse(reply);

        if (parsedFiles.length > 0 && projectId) {
          const results = await files.writeMultipleFiles(projectId, parsedFiles);
          return json(res, { success: true, files: results, response: reply });
        }
        return json(res, { success: true, files: [], response: reply });
      }

      // If aiResponse is provided directly
      if (aiResponse) {
        const parsedFiles = autonomous.parseFilesFromResponse(aiResponse);
        if (parsedFiles.length > 0 && projectId) {
          const results = await files.writeMultipleFiles(projectId, parsedFiles);
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

    error(res, 'Not found', 404);
  } catch (e) {
    console.error('API Error:', e);
    error(res, e.message, 500);
  }
}
