/**
 * KiroClone IDE - Main App Controller
 */
class App {
  constructor() {
    this.activePanel = 'explorer';
    this.bindActivityBar();
    this.bindChat();
    this.bindAuto();
    this.bindWelcome();
  }

  bindActivityBar() {
    document.querySelectorAll('.activity-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = btn.dataset.panel;
        this.switchPanel(panel);
      });
    });
  }

  switchPanel(panel) {
    this.activePanel = panel;
    document.querySelectorAll('.activity-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.panel === panel)
    );
    document.querySelectorAll('.panel-content').forEach(p =>
      p.classList.toggle('hidden', p.id !== `panel-${panel}`)
    );
  }


  bindChat() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const messagesEl = document.getElementById('chat-messages');
    const clearBtn = document.getElementById('clear-chat-btn');

    // Mode toggle
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        AI.currentMode = btn.dataset.mode;
      });
    });

    // Send
    const send = async () => {
      const content = input.value.trim();
      if (!content || AI.isLoading) return;
      input.value = ''; input.style.height = 'auto';
      this.addMsg('user', content);
      AI.isLoading = true; sendBtn.disabled = true;
      const loadEl = this.addLoading();
      try {
        const reply = await AI.sendMessage(content);
        loadEl.remove();
        this.addMsg('assistant', reply);
        // If autonomous mode, try to save files
        if (AI.currentMode === 'autonomous' && Files.projectId) {
          this.autoSaveFiles(reply);
        }
      } catch (e) {
        loadEl.remove();
        this.addMsg('assistant', `❌ Error: ${e.message}\n\nMake sure you've set your API key in Settings and selected a model.`);
      }
      AI.isLoading = false; sendBtn.disabled = false;
    };

    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; });
    clearBtn?.addEventListener('click', () => { messagesEl.innerHTML = ''; AI.clearMessages(); });
  }

  addMsg(role, content) {
    const el = document.createElement('div');
    el.className = `msg ${role}`;
    const avatar = role === 'user' ? '👤' : '⚡';
    el.innerHTML = `<div class="msg-avatar">${avatar}</div><div class="msg-body">${this.renderMd(content)}</div>`;
    document.getElementById('chat-messages').appendChild(el);
    document.getElementById('chat-messages').scrollTop = 99999;
    return el;
  }

  addLoading() {
    const el = document.createElement('div');
    el.className = 'msg assistant';
    el.innerHTML = `<div class="msg-avatar">⚡</div><div class="msg-body"><div class="typing"><span></span><span></span><span></span></div></div>`;
    document.getElementById('chat-messages').appendChild(el);
    document.getElementById('chat-messages').scrollTop = 99999;
    return el;
  }


  renderMd(text) {
    let h = text;
    h = h.replace(/```(\w*?):([\w./\-]+)\n([\s\S]*?)```/g, (m,lang,file,code) => {
      const e = this.esc(code.trim());
      return `<div class="codeblock"><div class="codeblock-header"><span>📄 ${file} (${lang})</span><button onclick="navigator.clipboard.writeText(this.closest('.codeblock').querySelector('.codeblock-code').textContent)">Copy</button></div><div class="codeblock-code">${e}</div></div>`;
    });
    h = h.replace(/```(\w*)\n([\s\S]*?)```/g, (m,lang,code) => {
      const e = this.esc(code.trim());
      return `<div class="codeblock"><div class="codeblock-header"><span>${lang||'code'}</span><button onclick="navigator.clipboard.writeText(this.closest('.codeblock').querySelector('.codeblock-code').textContent)">Copy</button></div><div class="codeblock-code">${e}</div></div>`;
    });
    h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
    h = h.replace(/^## (.+)$/gm, '<h3 style="margin:8px 0 4px;font-size:13px;">$1</h3>');
    h = h.replace(/^- (.+)$/gm, '<li>$1</li>');
    h = h.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    h = h.replace(/\n\n/g, '</p><p>');
    h = '<p>' + h + '</p>';
    h = h.replace(/<p><\/p>/g, '');
    h = h.replace(/\n/g, '<br>');
    h = h.replace(/<br><ul>/g,'<ul>').replace(/<\/ul><br>/g,'</ul>');
    h = h.replace(/<br><div/g,'<div').replace(/<\/div><br>/g,'</div>');
    return h;
  }

  esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

  async autoSaveFiles(response) {
    try {
      const res = await fetch('/api/autonomous/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: 'auto', response, projectId: Files.projectId })
      });
      const data = await res.json();
      if (data.files?.length > 0) {
        this.addMsg('assistant', `✅ Created ${data.files.length} files automatically!\n${data.files.map(f=>'• '+f.path).join('\n')}`);
        Files.load(Files.projectId);
      }
    } catch {}
  }


  bindAuto() {
    document.getElementById('auto-execute-btn')?.addEventListener('click', async () => {
      const prompt = document.getElementById('auto-prompt')?.value?.trim();
      if (!prompt) return;
      const statusEl = document.getElementById('auto-status');
      statusEl.innerHTML = '<div class="auto-step running">🔄 Starting...</div>';

      try {
        const { provider, model, apiKey } = AI.getConfig();
        if (!provider || !model) {
          statusEl.innerHTML = '<p style="color:var(--error)">❌ Pehle AI Chat panel me jaake Provider aur Model select karo!</p>';
          return;
        }
        if (!apiKey && provider !== 'ollama') {
          statusEl.innerHTML = '<p style="color:var(--error)">❌ Settings (gear icon) me jaake API key daalo!</p>';
          return;
        }

        // Ensure project exists
        if (!Files.projectId) {
          const name = prompt.split(' ').slice(0, 3).join('-').toLowerCase().replace(/[^a-z0-9-]/g,'') || 'auto-project';
          const r = await fetch('/api/projects/create', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name }) });
          const d = await r.json();
          if (d.project) Files.load(d.project.id);
        }

        statusEl.innerHTML = '<div class="auto-step running">🤖 AI is generating code... (may take 10-30 sec)</div>';

        // Call server-side autonomous endpoint (handles AI call + file saving)
        const res = await fetch('/api/autonomous/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            provider,
            apiKey,
            model,
            projectId: Files.projectId,
            taskId: Date.now().toString()
          })
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Server error: ${res.status}`);
        }

        const data = await res.json();

        if (data.files?.length > 0) {
          statusEl.innerHTML = `<div class="auto-step done">✅ Created ${data.files.length} files:</div>` +
            data.files.map(f => `<div class="auto-step done">📄 ${f.path}</div>`).join('');
          Files.load(Files.projectId);
        } else {
          statusEl.innerHTML = '<div class="auto-step done">✅ Done - response below in chat</div>';
        }

        // Show AI response in chat too
        if (data.response) {
          this.switchPanel('chat');
          this.addMsg('assistant', data.response);
        }
      } catch (e) {
        statusEl.innerHTML = `<p style="color:var(--error)">❌ ${e.message}</p>`;
      }
    });
  }

  bindWelcome() {
    document.getElementById('welcome-start')?.addEventListener('click', () => {
      this.switchPanel('settings');
    });
  }
}

window.app = new App();
