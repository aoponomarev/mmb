/**
 * @description Node-side adapter for GitHub releases/tag lookup used by backlog automation.
 * @skill-anchor id:sk-7b4ee5 #for-adapter-mandatory
 * @skill-anchor id:sk-7b4ee5 #for-integration-fallbacks
 *
 * PURPOSE: Isolate GitHub transport and fallback-to-tags logic from cron orchestration scripts.
 */

export class GitHubReleasesProvider {
  constructor(options = {}) {
    this.fetchFn = resolveFetchFn(options.fetchFn);
    this.token = typeof options.token === 'string' ? options.token.trim() : (process.env.GITHUB_TOKEN || '').trim();
  }

  buildHeaders() {
    const headers = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'mmb-github-releases-provider'
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  parseRepoUrl(url) {
    const match = String(url || '').match(/github\.com\/([^/]+)\/([^/]+)(?:\/|$)/);
    return match ? { owner: match[1], repo: match[2].replace(/\.git$/, '') } : null;
  }

  async requestJson(url) {
    const response = await this.fetchFn(url, { headers: this.buildHeaders() });
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`GitHub ${response.status}`);
    }
    return response.json();
  }

  async fetchLatestRelease(owner, repo) {
    const data = await this.requestJson(`https://api.github.com/repos/${owner}/${repo}/releases/latest`);
    if (!data) {
      return null;
    }

    return {
      tag: data.tag_name,
      name: data.name || data.tag_name,
      published: data.published_at,
      body: data.body || '',
      url: data.html_url,
      sourceType: 'release'
    };
  }

  // @causality #for-integration-fallbacks
  async fetchLatestTag(owner, repo) {
    const data = await this.requestJson(`https://api.github.com/repos/${owner}/${repo}/tags?per_page=1`);
    const tag = Array.isArray(data) ? data[0] : null;
    if (!tag) {
      return null;
    }

    return {
      tag: tag.name,
      name: tag.name,
      published: null,
      body: '',
      url: tag.commit?.url || `https://github.com/${owner}/${repo}/tags`,
      sourceType: 'tag'
    };
  }

  async fetchLatestFromUrl(repoUrl) {
    const repo = this.parseRepoUrl(repoUrl);
    if (!repo) {
      return null;
    }

    try {
      return await this.fetchLatestRelease(repo.owner, repo.repo);
    } catch (error) {
      if (String(error.message || '').includes('404')) {
        return this.fetchLatestTag(repo.owner, repo.repo);
      }
      throw error;
    }
  }
}

function resolveFetchFn(fetchFn) {
  const candidate = typeof fetchFn === 'function' ? fetchFn : globalThis.fetch;
  if (typeof candidate !== 'function') {
    throw new Error('fetch is unavailable');
  }
  if (typeof window !== 'undefined' && typeof window.fetch === 'function' && candidate === window.fetch) {
    return window.fetch.bind(window);
  }
  return (...args) => candidate(...args);
}
