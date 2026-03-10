#!/usr/bin/env node
/**
 * @description Cron script: detects new releases from integration sources.
 * Outputs JSON for GitHub Issue creation. Copilot does analytical work and writes backlog.
 * Filter excludes: n8n, Docker, Ollama.
 *
 * Usage: node is/scripts/infrastructure/copilot-backlog-cron.js
 * Output: writes to docs/backlog/copilot-gh/.cron-output.json (new releases + all sources)
 * Trigger: .github/workflows/copilot-backlog-cron.yml (02:00 MSK)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../../../');
const SOURCES_PATH = join(ROOT, 'docs/backlog/copilot-gh/sources.json');
const STATE_PATH = join(ROOT, 'docs/backlog/copilot-gh/.state.json');
const OUTPUT_PATH = join(ROOT, 'docs/backlog/copilot-gh/.cron-output.json');

const EXCLUDE_IDS = ['n8n-releases', 'dep-sqlite3', 'infra-docker', 'infra-docker-compose', 'infra-ollama'];

function loadSources() {
  const raw = readFileSync(SOURCES_PATH, 'utf-8');
  const data = JSON.parse(raw);
  const exclude = data.filter?.excludeIds ?? EXCLUDE_IDS;
  const active = data.sources.filter(
    (s) => s.enabled !== false && !exclude.includes(s.id)
  );
  return active;
}

function loadState() {
  if (!existsSync(STATE_PATH)) return {};
  return JSON.parse(readFileSync(STATE_PATH, 'utf-8'));
}

function saveState(state) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

function parseGitHubRepo(url) {
  const m = url.match(/github\.com\/([^/]+)\/([^/]+)(?:\/|$)/);
  return m ? { owner: m[1], repo: m[2].replace(/\.git$/, '') } : null;
}

async function fetchGitHubLatest(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.github.v3+json' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    tag: data.tag_name,
    name: data.name || data.tag_name,
    published: data.published_at,
    body: data.body || '',
    url: data.html_url,
  };
}

async function main() {
  const sources = loadSources();
  const state = loadState();
  const githubSources = sources.filter((s) => s.type === 'github');
  const items = [];

  for (const src of githubSources) {
    const repo = parseGitHubRepo(src.url);
    if (!repo) continue;

    const release = await fetchGitHubLatest(repo.owner, repo.repo);
    if (!release) continue;

    const isNew = state[src.id] !== release.tag;
    if (isNew) state[src.id] = release.tag;

    items.push({
      id: src.id,
      name: src.name,
      url: release.url,
      tag: release.tag,
      body: release.body?.slice(0, 2000) || '',
      isNew,
    });
  }

  for (const s of sources.filter((s) => s.type !== 'github')) {
    items.push({
      id: s.id,
      name: s.name,
      url: s.url,
      tag: null,
      body: null,
      isNew: true,
    });
  }

  saveState(state);

  const output = {
    items,
    date: new Date().toISOString().slice(0, 10),
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`copilot-backlog-cron: ${items.length} sources prepared for Issue`);
}

main().catch((err) => {
  console.error('copilot-backlog-cron:', err.message);
  process.exit(1);
});
