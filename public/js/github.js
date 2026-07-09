/**
 * GitHub Integration - All calls go through our server proxy
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
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `GitHub Error: ${res.status}`);
    }
    return res.json();
  }

  async connect() {
    const tokenInput = document.getElementById('github-token');
    if (tokenInput?.value) {
      this.token = tokenInput.value.trim();
      Store.setGitHubToken(this.token);
    }
    if (!this.token) return;
    try {
      this.user = await this.apiCall('user');
      this.showRepos();
    } catch (e) {
      document.getElementById('github-repos').classList.add('hidden');
      document.getElementById('github-connect').classList.remove('hidden');
      alert('GitHub connection failed: ' + e.message);
    }
  }

  async showRepos() {
    document.getElementById('github-connect').classList.add('hidden');
    const reposEl = document.getElementById('github-repos');
    reposEl.classList.remove('hidden');
    reposEl.innerHTML = '<p style="padding:10px;font-size:12px;color:var(--text-2)">Loading repos...</p>';
    try {
      const repos = await this.apiCall('repos');
      const repoList = Array.isArray(repos) ? repos : [];
      reposEl.innerHTML = `<div style="padding:8px 10px;border-bottom:1px solid var(--border);font-size:11px;color:var(--text-2)">✓ Connected as <strong>${this.user?.login || 'user'}</strong></div>` +
        repoList.slice(0, 20).map(r => `<div class="repo-item" data-owner="${r.owner?.login}" data-repo="${r.name}"><h4>${r.name}</h4><p>${r.description || 'No description'} • ⭐ ${r.stargazers_count || 0}</p></div>`).join('');
      reposEl.querySelectorAll('.repo-item').forEach(el => {
        el.addEventListener('click', () => alert(`Selected: ${el.dataset.owner}/${el.dataset.repo}\n\nPush files to this repo from the editor.`));
      });
    } catch (e) { reposEl.innerHTML = `<p style="padding:10px;color:var(--error)">Error: ${e.message}</p>`; }
  }

  async pushFile(owner, repo, path, content, message) {
    let sha;
    try {
      const existing = await this.apiCall('file', { owner, repo, path });
      sha = existing.sha;
    } catch {}
    return this.apiCall('createFile', { owner, repo, path, content, message, sha });
  }
}

window.GitHub = new GitHubManager();
