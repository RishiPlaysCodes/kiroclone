const Ed = {
  files: new Map(), active: null, modified: new Set(),
  init() {
    this.el = document.getElementById('code-area');
    this.nums = document.getElementById('line-nums');
    this.wrap = document.getElementById('editor-wrap');
    this.welcome = document.getElementById('welcome');
    this.el.addEventListener('input', () => { this.upNums(); this.upCursor(); this.markMod(); });
    this.el.addEventListener('scroll', () => { this.nums.scrollTop = this.el.scrollTop; });
    this.el.addEventListener('click', () => this.upCursor());
    this.el.addEventListener('keydown', e => {
      if (e.key === 'Tab') { e.preventDefault(); const s = this.el.selectionStart; this.el.value = this.el.value.slice(0,s)+'  '+this.el.value.slice(this.el.selectionEnd); this.el.selectionStart=this.el.selectionEnd=s+2; this.upNums(); }
    });
    document.addEventListener('keydown', e => { if ((e.ctrlKey||e.metaKey)&&e.key==='s') { e.preventDefault(); this.save(); }});
  },
  open(path, content) {
    this.files.set(path, content); this.active = path;
    this.welcome.classList.add('hidden'); this.wrap.classList.remove('hidden');
    this.el.value = content; this.upNums(); this.upCursor();
    document.getElementById('ed-file').textContent = path;
    document.getElementById('ed-lang').textContent = this.lang(path);
    this.renderTabs();
  },
  close(path) {
    this.files.delete(path); this.modified.delete(path);
    if (this.active === path) { const k=[...this.files.keys()]; k.length ? this.switchTo(k[k.length-1]) : this.showWelcome(); }
    this.renderTabs();
  },
  switchTo(path) {
    if (this.active && this.files.has(this.active)) this.files.set(this.active, this.el.value);
    const c = this.files.get(path); if (c===undefined) return;
    this.active = path; this.el.value = c; this.upNums();
    document.getElementById('ed-file').textContent = path;
    document.getElementById('ed-lang').textContent = this.lang(path);
    this.renderTabs();
  },
  showWelcome() { this.wrap.classList.add('hidden'); this.welcome.classList.remove('hidden'); this.active = null; this.renderTabs(); },
  renderTabs() {
    const t = document.getElementById('ed-tabs'); t.innerHTML = '';
    this.files.forEach((_, p) => {
      const b = document.createElement('button'); b.className = `etab${p===this.active?' active':''}`;
      const n = p.split('/').pop(); const mod = this.modified.has(p)?'● ':'';
      b.innerHTML = `${mod}${n}<span class="x" data-p="${p}">×</span>`;
      b.onclick = e => e.target.dataset.p ? this.close(e.target.dataset.p) : this.switchTo(p);
      t.appendChild(b);
    });
  },
  async save() {
    if (!this.active || !S.proj()) return;
    this.files.set(this.active, this.el.value);
    document.getElementById('status-left').textContent = 'Saving...';
    try {
      await fetch('/api/files/write', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId: S.proj(), filePath: this.active, content: this.el.value })});
      this.modified.delete(this.active); this.renderTabs();
      document.getElementById('status-left').textContent = 'Saved ✓';
      setTimeout(() => document.getElementById('status-left').textContent = 'Ready', 1500);
    } catch { document.getElementById('status-left').textContent = 'Save error'; }
  },
  markMod() { if (this.active) { this.modified.add(this.active); this.renderTabs(); }},
  upNums() { const n = this.el.value.split('\n').length; this.nums.innerHTML = Array.from({length:n},(_,i)=>`<div>${i+1}</div>`).join(''); },
  upCursor() { const t=this.el.value.slice(0,this.el.selectionStart).split('\n'); document.getElementById('status-left').textContent=`Ln ${t.length}, Col ${t.pop().length+1}`; },
  lang(p) { const m={js:'JS',jsx:'JSX',ts:'TS',py:'Python',html:'HTML',css:'CSS',json:'JSON',md:'MD'}; return m[p.split('.').pop()]||'Text'; }
};
