const Files = {
  tree: null,
  init() {
    this.tree = document.getElementById('file-tree');
    document.getElementById('btn-add-file')?.addEventListener('click', () => this.newFile());
    document.getElementById('btn-new-proj')?.addEventListener('click', () => this.newProj());
    document.getElementById('btn-create-first')?.addEventListener('click', () => this.newProj());
    if (S.proj()) this.load(S.proj());
  },
  async load(id) {
    S.setProj(id);
    try {
      const r = await fetch(`/api/files?projectId=${id}`);
      const d = await r.json();
      this.render(d.files || []);
    } catch { this.tree.innerHTML = '<p class="muted center">Error</p>'; }
  },
  render(files) {
    if (!files.length) { this.tree.innerHTML = '<p class="muted center sm">Empty project<br><button class="link-btn" onclick="Files.newFile()">+ New file</button></p>'; return; }
    this.tree.innerHTML = this.html(files, 0);
    this.bind();
  },
  html(items, d) {
    return items.map(i => {
      if (i.type === 'directory') return `<div data-p="${i.path}" data-t="d"><div class="fi" style="padding-left:${d*12+4}px"><span class="arrow">▶</span>📁 ${i.name}</div><div class="fi-children hidden">${i.children?this.html(i.children,d+1):''}</div></div>`;
      return `<div data-p="${i.path}" data-t="f"><div class="fi" style="padding-left:${d*12+16}px">${this.icon(i.ext)} ${i.name}</div></div>`;
    }).join('');
  },
  icon(ext) { const m={'.js':'📄','.jsx':'⚛️','.ts':'📘','.html':'🌐','.css':'🎨','.json':'📋','.py':'🐍','.md':'📝'}; return m[ext]||'📄'; },
  bind() {
    this.tree.querySelectorAll('[data-t]').forEach(n => {
      n.querySelector('.fi').addEventListener('click', () => {
        if (n.dataset.t === 'd') { const ch = n.querySelector('.fi-children'); ch.classList.toggle('hidden'); n.querySelector('.fi').classList.toggle('open'); }
        else this.openFile(n.dataset.p);
      });
    });
  },
  async openFile(path) {
    try {
      const r = await fetch('/api/files/read', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId: S.proj(), filePath: path })});
      const d = await r.json();
      if (d.content !== undefined) Ed.open(path, d.content);
      this.tree.querySelectorAll('.fi').forEach(f => f.classList.remove('active'));
      const el = this.tree.querySelector(`[data-p="${path}"] .fi`);
      if (el) el.classList.add('active');
    } catch {}
  },
  async newFile() {
    const n = prompt('File path (e.g. src/app.js):');
    if (!n || !S.proj()) return;
    await fetch('/api/files/write', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId: S.proj(), filePath: n.trim(), content: '' })});
    this.load(S.proj()); this.openFile(n.trim());
  },
  async newProj() {
    const n = prompt('Project name:');
    if (!n) return;
    const r = await fetch('/api/projects/create', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name: n })});
    const d = await r.json();
    if (d.project) this.load(d.project.id);
  }
};
