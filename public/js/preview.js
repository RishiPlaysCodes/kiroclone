/**
 * Live Preview - Shows project output in iframe
 */
const Preview = {
  panel: null,
  frame: null,

  init() {
    this.panel = document.getElementById('preview-panel');
    this.frame = document.getElementById('preview-frame');
    document.getElementById('btn-run')?.addEventListener('click', () => this.run());
    document.getElementById('btn-close-preview')?.addEventListener('click', () => this.close());
    document.getElementById('btn-refresh-preview')?.addEventListener('click', () => this.run());
  },

  async run() {
    const proj = S.proj();
    if (!proj) { alert('Create a project first!'); return; }

    this.panel.classList.remove('hidden');
    document.getElementById('status-left').textContent = '▶ Running preview...';

    try {
      // Get all project files
      const res = await fetch(`/api/files?projectId=${proj}`);
      const data = await res.json();
      const fileList = this.flattenFiles(data.files || []);

      // Read all file contents
      const contents = {};
      for (const f of fileList) {
        try {
          const r = await fetch('/api/files/read', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ projectId: proj, filePath: f.path })
          });
          const d = await r.json();
          contents[f.path] = d.content || '';
        } catch {}
      }

      // Build preview HTML
      const html = this.buildPreview(contents, fileList);
      this.frame.srcdoc = html;
      document.getElementById('status-left').textContent = '▶ Preview running';
    } catch (e) {
      document.getElementById('status-left').textContent = 'Preview error: ' + e.message;
    }
  },

  close() {
    this.panel.classList.add('hidden');
    this.frame.srcdoc = '';
    document.getElementById('status-left').textContent = 'Ready';
  },

  flattenFiles(files, result = []) {
    for (const f of files) {
      if (f.type === 'file') result.push(f);
      else if (f.children) this.flattenFiles(f.children, result);
    }
    return result;
  },

  buildPreview(contents, fileList) {
    // Find main HTML file
    let htmlFile = Object.keys(contents).find(f => f === 'index.html')
      || Object.keys(contents).find(f => f.endsWith('.html'));

    if (htmlFile) {
      let html = contents[htmlFile];
      // Inline CSS files
      for (const [path, content] of Object.entries(contents)) {
        if (path.endsWith('.css')) {
          html = html.replace(
            new RegExp(`<link[^>]*href=["'](?:\\.?\\/?)${path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}["'][^>]*>`, 'gi'),
            `<style>/* ${path} */\n${content}\n</style>`
          );
          // Also try relative paths
          const name = path.split('/').pop();
          html = html.replace(
            new RegExp(`<link[^>]*href=["'][^"']*${name}["'][^>]*>`, 'gi'),
            `<style>/* ${path} */\n${content}\n</style>`
          );
        }
      }
      // Inline JS files
      for (const [path, content] of Object.entries(contents)) {
        if (path.endsWith('.js')) {
          html = html.replace(
            new RegExp(`<script[^>]*src=["'](?:\\.?\\/?)${path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}["'][^>]*>\\s*</script>`, 'gi'),
            `<script>/* ${path} */\n${content}\n</script>`
          );
          const name = path.split('/').pop();
          html = html.replace(
            new RegExp(`<script[^>]*src=["'][^"']*${name}["'][^>]*>\\s*</script>`, 'gi'),
            `<script>/* ${path} */\n${content}\n</script>`
          );
        }
      }
      return html;
    }

    // No HTML file - create one that loads everything
    let css = '', js = '';
    for (const [path, content] of Object.entries(contents)) {
      if (path.endsWith('.css')) css += `/* ${path} */\n${content}\n`;
      if (path.endsWith('.js')) js += `/* ${path} */\n${content}\n`;
    }
    return `<!DOCTYPE html><html><head><style>${css}</style></head><body><script>${js}</script></body></html>`;
  }
};
