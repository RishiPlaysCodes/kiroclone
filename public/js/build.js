const Build = {
  init() {
    document.getElementById('btn-build')?.addEventListener('click', () => this.start());
  },
  log(msg, cls='') {
    const el = document.getElementById('build-log');
    el.innerHTML += `<div class="blog ${cls}">${msg}</div>`;
    el.scrollTop = el.scrollHeight;
  },
  clearLog() { document.getElementById('build-log').innerHTML = ''; },

  async start() {
    const prompt = document.getElementById('build-prompt')?.value?.trim();
    if (!prompt) return;

    const { provider, model, apiKey } = AI.conf();
    if (!provider || !model) { this.log('❌ Select provider & model first!','err'); return; }
    if (!apiKey && !AI.serverHasKey && provider !== 'ollama') { this.log('❌ Set API key in Settings ⚙️ OR create .env file with OPENROUTER_KEY=your-key','err'); return; }

    this.clearLog();

    // Ensure project exists
    if (!S.proj()) {
      const name = prompt.split(' ').slice(0,3).join('-').toLowerCase().replace(/[^a-z0-9-]/g,'') || 'project';
      const r = await fetch('/api/projects/create', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name })});
      const d = await r.json();
      if (d.project) { S.setProj(d.project.id); Files.load(d.project.id); }
      await new Promise(r => setTimeout(r, 300));
    }

    this.log('📋 Creating project plan...','run');

    try {
      // Step 1: Get plan
      const planRes = await fetch('/api/autonomous/plan', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ prompt, provider, apiKey, model, projectId: S.proj() })
      });
      if (!planRes.ok) { const e = await planRes.json().catch(()=>({})); throw new Error(e.error||'Plan failed'); }
      const { task } = await planRes.json();
      const plan = task.plan;

      this.log(`✅ Plan: ${plan.length} files to generate`,'ok');
      plan.forEach(f => this.log(`  ⏳ ${f.path}`));

      // Step 2: Generate each file
      for (let i = 0; i < plan.length; i++) {
        this.log(`🔄 [${i+1}/${plan.length}] ${plan[i].path}...`,'run');
        document.getElementById('status-left').textContent = `Building: ${plan[i].path} (${i+1}/${plan.length})`;

        try {
          const r = await fetch('/api/autonomous/generate-file', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ taskId: task.id, fileIndex: i, provider, apiKey, model })
          });
          const d = await r.json();
          if (d.success) this.log(`✅ ${plan[i].path}`,'ok');
          else this.log(`⚠️ ${plan[i].path} - failed`,'err');
        } catch (e) {
          this.log(`❌ ${plan[i].path}: ${e.message}`,'err');
        }

        // Rate limit delay
        if (i < plan.length - 1) await new Promise(r => setTimeout(r, 2000));
      }

      this.log(`\n🎉 PROJECT COMPLETE! ${plan.length} files created.`,'ok');
      this.log(`▶ Click "Run" button to preview!`,'ok');
      document.getElementById('status-left').textContent = `✅ Built ${plan.length} files`;
      Files.load(S.proj());

    } catch (e) {
      this.log(`❌ Error: ${e.message}`,'err');
      document.getElementById('status-left').textContent = 'Build failed';
    }
  }
};
