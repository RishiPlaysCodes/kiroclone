/**
 * File Explorer
 */
class FileExplorer {
  constructor() {
    this.treeEl = document.getElementById('file-tree');
    this.projectId = Store.getProject();
    document.getElementById('btn-new-file')?.addEventListener('click', () => this.newFile());
    document.getElementById('btn-new-project')?.addEventListener('click', () => this.newProject());
    document.getElementById('open-project-btn')?.addEventListener('click', () => this.newProject());
    if (this.projectId) this.load(this.projectId);
  }

  async load(projectId) {
    this.projectId = projectId;
    Store.setProject(projectId);
    try {
      const r = await fetch(`/api/files?projectId=${projectId}`);
      const d = await r.json();
      this.render(d.files || []);
    } catch { this.treeEl.innerHTML = '<div class="empty-state"><p>Error loading files</p></div>'; }
  }

  render(files) {
    if (!files.length) { this.treeEl.innerHTML = '<div class="empty-state"><p>Empty project</p><button class="btn btn-sm" onclick="Files.newFile()">Create File</button></div>'; return; }
    this.treeEl.innerHTML = this.buildTree(files, 0);
    this.bindTree();
  }

  buildTree(items, depth) {
    return items.map(i => {
      if (i.type === 'directory') {
        return `<div class="tree-node" data-path="${i.path}" data-type="dir">
          <div class="tree-item" style="padding-left:${depth*14+6}px"><span class="chevron">▶</span> 📁 <span class="name">${i.name}</span></div>
          <div class="tree-children" style="display:none">${i.children ? this.buildTree(i.children, depth+1) : ''}</div></div>`;
      }
      const icons = {js:'📄',jsx:'⚛️',ts:'📘',py:'🐍',html:'🌐',css:'🎨',json:'📋',md:'📝'};
      const ext = (i.ext||'').replace('.','');
      return `<div class="tree-node" data-path="${i.path}" data-type="file">
        <div class="tree-item" style="padding-left:${depth*14+20}px">${icons[ext]||'📄'} <span class="name">${i.name}</span></div></div>`;
    }).join('');
  }

  bindTree() {
    this.treeEl.querySelectorAll('.tree-node').forEach(node => {
      node.querySelector('.tree-item').addEventListener('click', () => {
        if (node.dataset.type === 'dir') {
          const ch = node.querySelector('.tree-children');
          const open = ch.style.display !== 'none';
          ch.style.display = open ? 'none' : 'block';
          node.querySelector('.tree-item').classList.toggle('open', !open);
        } else { this.openFile(node.dataset.path); }
      });
    });
  }

  async openFile(path) {
    try {
      const r = await fetch('/api/files/read', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ projectId: this.projectId, filePath: path }) });
      const d = await r.json();
      if (d.content !== undefined) window.Editor.open(path, d.content);
      this.treeEl.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
      const n = this.treeEl.querySelector(`[data-path="${path}"] .tree-item`);
      if (n) n.classList.add('active');
    } catch(e) { console.error(e); }
  }

  async newFile() {
    const name = prompt('File path (e.g. src/index.js):');
    if (!name || !this.projectId) return;
    await fetch('/api/files/write', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId: this.projectId, filePath: name.trim(), content: '' }) });
    this.load(this.projectId);
    this.openFile(name.trim());
  }

  async newProject() {
    const name = prompt('Project name:');
    if (!name) return;
    const r = await fetch('/api/projects/create', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name }) });
    const d = await r.json();
    if (d.project) this.load(d.project.id);
  }
}

window.Files = new FileExplorer();
