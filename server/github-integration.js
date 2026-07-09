/**
 * GitHub Integration - Connect to user's GitHub repos
 * Create/edit files, push commits, manage repos directly from IDE
 */

export class GitHubIntegration {
  constructor() {
    this.baseUrl = 'https://api.github.com';
  }

  getHeaders(token) {
    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    };
  }

  // Get authenticated user info
  async getUser(token) {
    const url = `${this.baseUrl}/user`;
    return { url, headers: this.getHeaders(token), method: 'GET' };
  }

  // List user's repos
  async listRepos(token, page = 1) {
    const url = `${this.baseUrl}/user/repos?sort=updated&per_page=30&page=${page}`;
    return { url, headers: this.getHeaders(token), method: 'GET' };
  }

  // Get repo contents (file tree)
  async getRepoContents(token, owner, repo, path = '') {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`;
    return { url, headers: this.getHeaders(token), method: 'GET' };
  }

  // Get file content
  async getFileContent(token, owner, repo, path) {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`;
    return { url, headers: this.getHeaders(token), method: 'GET' };
  }

  // Create or update file
  async createOrUpdateFile(token, owner, repo, path, content, message, sha = null) {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`;
    const body = {
      message: message || `Update ${path} via KiroClone`,
      content: Buffer.from(content).toString('base64'),
    };
    if (sha) body.sha = sha;
    return { url, headers: this.getHeaders(token), method: 'PUT', body };
  }

  // Delete file
  async deleteFile(token, owner, repo, path, sha, message) {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`;
    const body = {
      message: message || `Delete ${path} via KiroClone`,
      sha,
    };
    return { url, headers: this.getHeaders(token), method: 'DELETE', body };
  }

  // Create new repo
  async createRepo(token, name, description, isPrivate = false) {
    const url = `${this.baseUrl}/user/repos`;
    const body = { name, description, private: isPrivate, auto_init: true };
    return { url, headers: this.getHeaders(token), method: 'POST', body };
  }

  // Get repo branches
  async getBranches(token, owner, repo) {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/branches`;
    return { url, headers: this.getHeaders(token), method: 'GET' };
  }

  // Get commit history
  async getCommits(token, owner, repo, page = 1) {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/commits?per_page=20&page=${page}`;
    return { url, headers: this.getHeaders(token), method: 'GET' };
  }

  // Create a new branch
  async createBranch(token, owner, repo, branchName, fromSha) {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/git/refs`;
    const body = { ref: `refs/heads/${branchName}`, sha: fromSha };
    return { url, headers: this.getHeaders(token), method: 'POST', body };
  }
}
