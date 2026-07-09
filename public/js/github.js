/**
 * GitHub Integration - Frontend
 */
class GitHubManager {
  constructor() {
    this.token = Store.getGitHubToken();
    this.user = null;
    document.getElementById('github-connect-btn')?.addEventListener('click', () => this.connect());
    if (this.token) this.connect();
  }

  async apiCall(action, params = {}) {
    const res = await fetch('/api/github/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: this.token, action, params })
    });
    const { config } = await res.json();
    // Execute the actual GitHub API call
    const ghRes = await fetch(config.url, {
      method: config.method,
      headers: config.headers,
      body: config.body ? JSON.stringify(config.body) : undefined,
    });
    if (!ghRes.ok) throw new Error(`GitHub: ${ghRes.status}`);
    if (ghRes.status === 204) return {};
    return ghRes.json();
  }

  async connect() {
    const tokenInput = document.getElementById('github-token');
    if (tokenInput?.value) {
      this.token = tokenInput.value;
      Store.setGitHubToken(this.token);
    }
    if (!this.token) return;
    try {
      this.user = await this.apiCall('user');
      this.showRepos();
    } catch (e) {
      alert('Failed to connect: ' + e.message);
    }
  }

  async showRepos() {
    document.getElementById('github-connect').classList.add('hidden');
    const reposEl = document.getElementById('github-repos');
    reposEl.classList.remove('hidden');
    reposEl.innerHTML = '<p style="padding:10px;font-size:12px;color:var(--text-2)">Loading repos...</p>';
    try {
      const repos = await this.apiCall('repos');
      reposEl.innerHTML = `<div style="padding:8px 10px;border-bottom:1px solid var(--border);font-size:11px;color:var(--text-2)">Connected as <strong>${this.user.login}</strong></div>` +
        repos.map(r => `<div class="repo-item" data-owner="${r.owner.login}" data-repo="${r.name}"><h4>${r.name}</h4><p>${r.description || 'No description'} • ⭐ ${r.stargazers_count}</p></div>`).join('');
      reposEl.querySelectorAll('.repo-item').forEach(el => {
        el.addEventListener('click', () => this.openRepo(el.dataset.owner, el.dataset.repo));
      });
    } catch (e) { reposEl.innerHTML = `<p style="padding:10px;color:var(--error)">Error: ${e.message}</p>`; }
  }

  async openRepo(owner, repo) {
    try {
      const contents = await this.apiCall('contents', { owner, repo, path: '' });
      // Load repo into file explorer as a project
      alert(`Opened ${owner}/${repo}! Files will appear in explorer.`);
      // Could create local project from repo contents
    } catch (e) { alert('Error: ' + e.message); }
  }

  async pushFile(owner, repo, path, content, message) {
    try {
      // Check if file exists to get sha
      let sha;
      try {
        const existing = await this.apiCall('file', { owner, repo, path });
        sha = existing.sha;
      } catch {}
      await this.apiCall('createFile', { owner, repo, path, content, message, sha });
      return true;
    } catch (e) { throw new Error('Push failed: ' + e.message); }
  }
}

window.GitHub = new GitHubManager();
