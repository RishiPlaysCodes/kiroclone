import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECTS_DIR = path.join(__dirname, '..', 'user-projects');

export class FileManager {
  constructor() { fs.mkdir(PROJECTS_DIR, { recursive: true }).catch(() => {}); }

  async listProjects() {
    try {
      await fs.mkdir(PROJECTS_DIR, { recursive: true });
      const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
      return entries.filter(e => e.isDirectory()).map(e => ({ name: e.name, id: e.name }));
    } catch { return []; }
  }

  async listFiles(projectId) {
    const dir = path.join(PROJECTS_DIR, projectId);
    await fs.mkdir(dir, { recursive: true });
    return this.walkDir(dir, dir);
  }

  async walkDir(dir, baseDir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      const rel = path.relative(baseDir, full);
      if (entry.isDirectory()) {
        files.push({ name: entry.name, path: rel, type: 'directory', children: await this.walkDir(full, baseDir) });
      } else {
        files.push({ name: entry.name, path: rel, type: 'file', ext: path.extname(entry.name) });
      }
    }
    return files.sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'directory' ? -1 : 1);
  }

  async readFile(projectId, filePath) {
    const full = path.join(PROJECTS_DIR, projectId, filePath);
    if (!full.startsWith(PROJECTS_DIR)) throw new Error('Invalid path');
    return fs.readFile(full, 'utf-8');
  }

  async writeFile(projectId, filePath, content) {
    const full = path.join(PROJECTS_DIR, projectId, filePath);
    if (!full.startsWith(PROJECTS_DIR)) throw new Error('Invalid path');
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content, 'utf-8');
  }

  async deleteFile(projectId, filePath) {
    const full = path.join(PROJECTS_DIR, projectId, filePath);
    if (!full.startsWith(PROJECTS_DIR)) throw new Error('Invalid path');
    await fs.rm(full, { recursive: true });
  }

  async createProject(name) {
    const id = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    await fs.mkdir(path.join(PROJECTS_DIR, id), { recursive: true });
    return { id, name };
  }

  // Write multiple files at once (for autonomous mode)
  async writeMultipleFiles(projectId, files) {
    const results = [];
    for (const file of files) {
      await this.writeFile(projectId, file.path, file.content);
      results.push({ path: file.path, status: 'created' });
    }
    return results;
  }
}
