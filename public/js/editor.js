/**
 * Editor - Code editing with tabs
 */
class EditorManager {
  constructor() {
    this.openFiles = new Map();
    this.activeFile = null;
    this.modified = new Set();
    this.el = document.getElementById('code-textarea');
    this.lineNums = document.getElementById('line-nums');
    this.container = document.getElementById('editor-container');
    this.welcome = document.getElementById('welcome-screen');
    this.bindEvents();
  }

  bindEvents() {
    this.el.addEventListener('input', () => { this.updateLines(); this.updateCursor(); this.markModified(); });
    this.el.addEventListener('scroll', () => { this.lineNums.scrollTop = this.el.scrollTop; });
    this.el.addEventListener('click', () => this.updateCursor());
    this.el.addEventListener('keyup', () => this.updateCursor());
    this.el.addEventListener('keydown', e => {
      if (e.key === 'Tab') { e.preventDefault(); const s = this.el.selectionStart; this.el.value = this.el.value.slice(0, s) + '  ' + this.el.value.slice(this.el.selectionEnd); this.el.selectionStart = this.el.selectionEnd = s + 2; this.updateLines(); }
    });
    document.getElementById('save-btn')?.addEventListener('click', () => this.save());
    document.addEventListener('keydown', e => { if ((e.ctrlKey||e.metaKey) && e.key === 's') { e.preventDefault(); this.save(); } });
  }

  open(path, content) {
    this.openFiles.set(path, content);
    this.activeFile = path;
    this.welcome.classList.add('hidden');
    this.container.classList.remove('hidden');
    this.el.value = content;
    this.updateLines();
    this.updateCursor();
    document.getElementById('ed-filename').textContent = path;
    document.getElementById('ed-lang').textContent = this.getLang(path);
    document.getElementById('file-status').textContent = 'Ready';
    this.renderTabs();
  }

  close(path) {
    this.openFiles.delete(path); this.modified.delete(path);
    if (this.activeFile === path) {
      const keys = [...this.openFiles.keys()];
      if (keys.length) this.switchTo(keys[keys.length - 1]);
      else this.showWelcome();
    }
    this.renderTabs();
  }

  switchTo(path) {
    if (this.activeFile && this.openFiles.has(this.activeFile)) this.openFiles.set(this.activeFile, this.el.value);
    const content = this.openFiles.get(path);
    if (content !== undefined) {
      this.activeFile = path; this.el.value = content; this.updateLines();
      document.getElementById('ed-filename').textContent = path;
      document.getElementById('ed-lang').textContent = this.getLang(path);
      this.renderTabs();
    }
  }

  showWelcome() { this.container.classList.add('hidden'); this.welcome.classList.remove('hidden'); this.activeFile = null; this.renderTabs(); }

  renderTabs() {
    const list = document.getElementById('tabs-list');
    list.innerHTML = '';
    this.openFiles.forEach((_, p) => {
      const btn = document.createElement('button');
      btn.className = `tab-item ${p === this.activeFile ? 'active' : ''}`;
      const name = p.split('/').pop();
      const mod = this.modified.has(p) ? '<span class="modified">●</span> ' : '';
      btn.innerHTML = `${mod}${name} <span class="tab-close" data-path="${p}">×</span>`;
      btn.onclick = e => e.target.classList.contains('tab-close') ? this.close(e.target.dataset.path) : this.switchTo(p);
      list.appendChild(btn);
    });
  }

  async save() {
    if (!this.activeFile) return;
    const project = Store.getProject();
    if (!project) return;
    this.openFiles.set(this.activeFile, this.el.value);
    document.getElementById('file-status').textContent = 'Saving...';
    try {
      await fetch('/api/files/write', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ projectId: project, filePath: this.activeFile, content: this.el.value }) });
      this.modified.delete(this.activeFile); this.renderTabs();
      document.getElementById('file-status').textContent = 'Saved ✓';
      setTimeout(() => document.getElementById('file-status').textContent = 'Ready', 2000);
    } catch { document.getElementById('file-status').textContent = 'Error!'; }
  }

  markModified() { if (this.activeFile) { this.modified.add(this.activeFile); this.renderTabs(); document.getElementById('file-status').textContent = 'Modified'; } }
  updateLines() { const n = this.el.value.split('\n').length; this.lineNums.innerHTML = Array.from({length:n},(_,i)=>`<div>${i+1}</div>`).join(''); }
  updateCursor() { const t = this.el.value.slice(0, this.el.selectionStart).split('\n'); document.getElementById('cursor-pos').textContent = `Ln ${t.length}, Col ${t.pop().length+1}`; }
  getLang(p) { const m = {js:'JavaScript',jsx:'React',ts:'TypeScript',tsx:'React TS',py:'Python',html:'HTML',css:'CSS',json:'JSON',md:'Markdown'}; return m[p.split('.').pop()] || 'Text'; }
}

window.Editor = new EditorManager();
