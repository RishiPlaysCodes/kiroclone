import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECTS_DIR = path.join(__dirname, '..', 'user-projects');

export class FileManager {
  constructor() { this.ensureProjectsDir(); }

  async ensureProjectsDir() {
    try { await fs.mkdir(PROJECTS_DIR, { recursive: true }); } catch (e) {}
  }

  async listProjects() {
    await this.ensureProjectsDir();
    try {
      const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
      return entries.filter(e => e.isDirectory()).map(e => ({ name: e.name, path: e.name }));
    } catch { return []; }
  }

  async listFiles(projectId) {
    const projectDir = path.join(PROJECTS_DIR, projectId);
    try {
      await fs.mkdir(projectDir, { recursive: true });
      return await this.walkDir(projectDir, projectDir);
    } catch { return []; }
  }

  async walkDir(dir, baseDir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);
      if (entry.name.startsWith('.')) continue;
      if (entry.isDirectory()) {
        files.push({ name: entry.name, path: relativePath, type: 'directory', children: await this.walkDir(fullPath, baseDir) });
      } else {
        files.push({ name: entry.name, path: relativePath, type: 'file', extension: path.extname(entry.name) });
      }
    }
    return files.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  async readFile(projectId, filePath) {
    const fullPath = path.join(PROJECTS_DIR, projectId, filePath);
    if (!fullPath.startsWith(PROJECTS_DIR)) throw new Error('Invalid file path');
    return await fs.readFile(fullPath, 'utf-8');
  }

  async saveFile(projectId, filePath, content) {
    const fullPath = path.join(PROJECTS_DIR, projectId, filePath);
    if (!fullPath.startsWith(PROJECTS_DIR)) throw new Error('Invalid file path');
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  async deleteFile(projectId, filePath) {
    const fullPath = path.join(PROJECTS_DIR, projectId, filePath);
    if (!fullPath.startsWith(PROJECTS_DIR)) throw new Error('Invalid file path');
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) { await fs.rm(fullPath, { recursive: true }); }
    else { await fs.unlink(fullPath); }
  }
}
