/**
 * WorkFlow UI V2 Logic
 * Stateless, template-driven single-page dashboard.
 *
 * Skill: id:sk-483943
 *
 * Architecture:
 *   - API layer: all HTTP calls go through api.call() / api.n8nCall()
 *   - Rendering: each tab has a dedicated load* function
 *   - Actions: unified delegated click handler (initActionHandlers)
 *   - Comments: modal bound once in initCommentModal
 */

// ─── Configuration & State ───────────────────────────────────────

const N8N_HOST = `${window.location.hostname}:5678`;

const V2State = {
  lastLoadTime: null,
  isLoading: false,
  sourcesCount: 0,
  skillsTasksCount: 0,
  activeTab: 'sources',
  initData: { models: [], agents: [], config: {} }
};

const FALLBACK_STATUS_TIME = '11:35';
const FALLBACK_LOG_TOTAL = 200;
const FALLBACK_DATA = {
  sources: [
    { type: 'official', name: 'Cursor IDE Changelog', priority: 10, status: 'Active', enabled: true, integrated: true },
    { type: 'official', name: 'GitHub Copilot Workspace', priority: 10, status: 'Active', enabled: true, integrated: true },
    { type: 'llm-api', name: 'Model Provider: Groq', priority: 10, status: 'Active', enabled: true, integrated: true },
    { type: 'llm-api', name: 'Model Provider: OpenRouter', priority: 10, status: 'Active', enabled: true, integrated: true },
    { type: 'github', name: 'Continue AI Releases', priority: 9, status: 'Active', enabled: true, integrated: true },
    { type: 'llm-api', name: 'Model Provider: KiloCode', priority: 9, status: 'Active', enabled: true, integrated: true },
    { type: 'github', name: 'n8n Releases', priority: 8, status: 'Active', enabled: true, integrated: true },
    { type: 'github', name: 'Software: Docker', priority: 8, status: 'Active', enabled: true, integrated: true },
    { type: 'github', name: 'Software: Docker Compose', priority: 8, status: 'Active', enabled: true, integrated: true },
    { type: 'github', name: 'Software: Git', priority: 8, status: 'Active', enabled: true, integrated: true },
    { type: 'github', name: 'Software: Node.js', priority: 8, status: 'Active', enabled: true, integrated: true },
    { type: 'github', name: 'Software: Ollama', priority: 8, status: 'Active', enabled: true, integrated: true },
    { type: 'github', name: 'Library: better-sqlite3', priority: 6, status: 'Active', enabled: true, integrated: true },
    { type: 'github', name: 'Library: sqlite3', priority: 6, status: 'Active', enabled: true, integrated: true },
    { type: 'github', name: 'Library: MCP SDK', priority: 5, status: 'Active', enabled: true, integrated: true },
    { type: 'github', name: 'Library: zod', priority: 5, status: 'Active', enabled: true, integrated: true },
    { type: 'official', name: 'Tether QVAC (Local AI)', priority: 7, status: 'Active', enabled: true, integrated: true },
    { type: 'official', name: 'Model Provider: MiniMax', priority: 6, status: 'Active', enabled: true, integrated: true },
    { type: 'official', name: 'OORT AI (Decentralized Agents)', priority: 5, status: 'Active', enabled: true, integrated: true },
  ],
  tasks: [
    {
      id: 'task-continue-ai',
      title: 'Обновление Continue AI с новыми агентами и улучшением безопасности',
      score: 80,
      news_source: 'Continue AI Releases',
      master_llm: 'qwen/qwen3-vl-235b-a22b-thinking',
      description: 'В релизе добавлены новые агенты, улучшена установка через CLI и усилена валидация ключей и заголовков.',
      category: 'Architecture',
    },
    {
      id: 'task-n8n-2-8-3',
      title: 'Исправление конфликтов эндпоинта состояния в n8n 2.8.3',
      score: 80,
      news_source: 'n8n Releases',
      master_llm: 'qwen/qwen3-vl-235b-a22b-thinking',
      description: 'Добавлена настраиваемость endpoint состояния for стабильной интеграции в разные среды.',
      category: 'Infrastructure & DevOps',
    },
    {
      id: 'task-docker-29-2-1',
      title: 'Docker 29.2.1: Исправление критических ошибок и обновление BuildKit',
      score: 60,
      news_source: 'Software: Docker',
      master_llm: 'qwen/qwen3-vl-235b-a22b-thinking',
      description: 'Исправлены ошибки демона и сетевые проблемы, улучшена стабильность BuildKit.',
      category: 'Infrastructure & DevOps',
    },
    {
      id: 'task-git-2-53',
      title: 'Обновление Git for Windows до версии 2.53.0 с исправлениями',
      score: 60,
      news_source: 'Software: Git',
      master_llm: 'qwen/qwen3-vl-235b-a22b-thinking',
      description: 'Исправлен критический баг Git Bash, обновлены cURL и Credential Manager.',
      category: 'Process & Meta',
    },
    {
      id: 'task-better-sqlite3',
      title: 'Исправление сборки библиотеки better-sqlite3',
      score: 60,
      news_source: 'Library: better-sqlite3',
      master_llm: 'qwen/qwen3-vl-235b-a22b-thinking',
      description: 'Обновлен node-abi for совместимости с современными версиями Node.js.',
      category: 'components',
    },
    {
      id: 'task-mcp-sdk',
      title: 'Обновление MCP SDK до версии 1.27.0 с новыми функциями',
      score: 50,
      news_source: 'Library: MCP SDK',
      master_llm: 'qwen/qwen3-vl-235b-a22b-thinking',
      description: 'Добавлены конформные тесты и новые методы for OAuth и стриминговых сценариев.',
      category: 'integrations',
    },
    {
      id: 'task-zod',
      title: 'Обновление библиотеки zod с исправлениями и оптимизациями',
      score: 50,
      news_source: 'Library: zod',
      master_llm: 'qwen/qwen3-vl-235b-a22b-thinking',
      description: 'Улучшена обработка схем и очищены части CI/CD-конфигурации.',
      category: 'Logic & Business Rules',
    },
    {
      id: 'task-sqlite3',
      title: 'Обновление библиотеки sqlite3 до версии 5.1.7',
      score: 50,
      news_source: 'Library: sqlite3',
      master_llm: 'qwen/qwen3-vl-235b-a22b-thinking',
      description: 'Перевод сборки на prebuild и обновление встроенной SQLite.',
      category: 'components',
    },
    {
      id: 'task-ollama',
      title: 'Обновление Ollama 0.16.2: улучшения и исправления',
      score: 50,
      news_source: 'Software: Ollama',
      master_llm: 'qwen/qwen3-vl-235b-a22b-thinking',
      description: 'Добавлены функции поиска и исправлены проблемы отображения в PowerShell.',
      category: 'integrations',
    },
    {
      id: 'task-docker-compose',
      title: 'Обновление Docker Compose 5.0.2: исправления и улучшения',
      score: 50,
      news_source: 'Software: Docker Compose',
      master_llm: 'qwen/qwen3-vl-235b-a22b-thinking',
      description: 'Исправлены runtime_flags, watch-режим и обработка путей в env-file.',
      category: 'Infrastructure & DevOps',
    },
    {
      id: 'task-nodejs',
      title: 'Обновление Node.js 25.6.1 с улучшениями зависимостей и производительности',
      score: 40,
      news_source: 'Software: Node.js',
      master_llm: 'qwen/qwen3-vl-235b-a22b-thinking',
      description: 'Обновлены npm и ключевые зависимости, улучшена производительность инициализации.',
      category: 'Architecture',
    },
  ],
  skills: [],
  agents: [
    { id: 'deepseek-r1-0528', provider: 'openrouter', rating: 77, role: 'commander', missions_count: 0 },
    { id: 'nvidia-nemotron-nano-9b-v2', provider: 'openrouter', rating: 70, role: 'scout', missions_count: 2 },
    { id: 'z-ai-glm-4.5-air', provider: 'kilocode', rating: 68, role: 'scout', missions_count: 0 },
    { id: 'qwen-qwen3-vl-235b-a22b-thinking', provider: 'openrouter', rating: 59, role: 'scout', missions_count: 2 },
    { id: 'yandex-gpt', provider: 'yandex', rating: 55, role: 'commander', missions_count: 0 },
    { id: 'stepfun-step-3.5-flash', provider: 'kilocode', rating: 50, role: 'scout', missions_count: 2 },
    { id: 'arcee-ai-trinity-mini', provider: 'kilocode', rating: 50, role: 'scout', missions_count: 0 },
    { id: 'arcee-ai-trinity-large-preview', provider: 'kilocode', rating: 50, role: 'scout', missions_count: 2 },
    { id: 'liquid-lfm-2.5-1.2b-thinking', provider: 'kilocode', rating: 50, role: 'scout', missions_count: 0 },
    { id: 'liquid-lfm-2.5-1.2b-instruct', provider: 'kilocode', rating: 50, role: 'scout', missions_count: 0 },
    { id: 'cognitivecomputations-dolphin-mistral-24b-venice-edition', provider: 'kilocode', rating: 50, role: 'scout', missions_count: 0 },
    { id: 'qwen-qwen3-vl-30b-a3b-thinking', provider: 'openrouter', rating: 48, role: 'scout', missions_count: 2 },
    { id: 'upstage-solar-pro-3', provider: 'kilocode', rating: 42, role: 'scout', missions_count: 0 },
    { id: 'groq-llama4-maverick', provider: 'groq', rating: 40, role: 'commander', missions_count: 1 },
    { id: 'minimax-minimax-m2.5', provider: 'kilocode', rating: 37, role: 'scout', missions_count: 2 },
    { id: 'or-deepseek-chat', provider: 'openrouter', rating: 36, role: 'scout', missions_count: 2 },
    { id: 'nvidia-nemotron-3-nano-30b', provider: 'openrouter', rating: 36, role: 'scout', missions_count: 2 },
    { id: 'nvidia-nemotron-nano-12b-v2-vl', provider: 'openrouter', rating: 35, role: 'scout', missions_count: 2 },
    { id: 'qwen-qwen3-235b-a22b-thinking-2507', provider: 'openrouter', rating: 34, role: 'scout', missions_count: 2 },
    { id: 'groq-llama4-scout', provider: 'groq', rating: 30, role: 'commander', missions_count: 1 },
    { id: 'groq-llama-3.3-70b', provider: 'groq', rating: 29, role: 'scout', missions_count: 2 },
    { id: 'nvidia-nemotron-4-340b', provider: 'openrouter', rating: 28, role: 'scout', missions_count: 1 },
  ],
  infra: {
    status: 'Инфраструктура в норме',
    checks: {
      infra_registry_exists: true,
      global_event_log_exists: true,
      git_registry_exists: false,
      n8n_registry_exists: false,
      tasks_dir_exists: true,
      rotation_history_exists: true,
      pricing_state_exists: true,
    },
    health: {
      totalModels: 34,
      modelsWithoutKey: [],
      providers: {
        openrouter: { status: 'ok' },
        mistral: { status: 'ok' },
        groq: { status: 'ok' },
        yandex: { status: 'ok' },
        kilocode: { status: 'ok' },
      },
      keys: {
        openrouter: { label: 'OpenRouter API Key', status: 'ok' },
        mistral: { label: 'Mistral API Key', status: 'ok' },
        groq: { label: 'Groq API Key', status: 'ok' },
        yandex: { label: 'Yandex API Key', status: 'ok' },
        yandex_folder: { label: 'Yandex Folder ID', status: 'ok' },
        kilocode: { label: 'KiloCode API Key', status: 'ok' },
        gemini: { label: 'Gemini API Key', status: 'ok' },
        github: { label: 'GitHub Token', status: 'ok' },
        artificial_analysis: { label: 'Artificial Analysis API Key', status: 'ok' },
        n8n: { label: 'N8N API Key', status: 'ok' },
        cloudflare: { label: 'Cloudflare API Token', status: 'ok' },
        obsidian: { label: 'Obsidian API Key', status: 'ok' },
      },
    },
    depSummary: { ok: 4, total: 4, upgrade_required: 0 },
    snapshotCount: 3,
    rotationTotal: 231,
    rotationLastTs: '2026-02-19T09:44:04.000Z',
  },
  logs: [
    { ts: '2026-02-26T11:30:13.000Z', event: 'STARTUP_HEALTH_CHECK', data: { totalModels: 34, missingKeys: 0, skippedModels: [] } },
    { ts: '2026-02-23T22:37:19.000Z', event: 'INFRA_REGISTRY_RELOADED', data: { path: 'D:\\Clouds\\AO\\OneDrive\\AI\\Global\\LLM\\infra-registry.json' } },
    { ts: '2026-02-23T18:56:11.000Z', event: 'STARTUP_HEALTH_CHECK', data: { totalModels: 34, missingKeys: 0, skippedModels: [] } },
    { ts: '2026-02-21T21:33:37.000Z', event: 'STARTUP_HEALTH_CHECK', data: { totalModels: 34, missingKeys: 0, skippedModels: [] } },
    { ts: '2026-02-20T12:49:26.000Z', event: 'STARTUP_HEALTH_CHECK', data: { totalModels: 34, missingKeys: 0, skippedModels: [] } },
    { ts: '2026-02-19T14:38:51.000Z', event: 'STARTUP_HEALTH_CHECK', data: { totalModels: 34, missingKeys: 0, skippedModels: [] } },
    { ts: '2026-02-19T14:37:43.000Z', event: 'STARTUP_HEALTH_CHECK', data: { totalModels: 34, missingKeys: 0, skippedModels: [] } },
    { ts: '2026-02-19T14:18:54.000Z', event: 'STARTUP_HEALTH_CHECK', data: { totalModels: 34, missingKeys: 0, skippedModels: [] } },
    { ts: '2026-02-19T14:17:44.000Z', event: 'STARTUP_HEALTH_CHECK', data: { totalModels: 34, missingKeys: 0, skippedModels: [] } },
    { ts: '2026-02-19T14:13:44.000Z', event: 'STARTUP_HEALTH_CHECK', data: { totalModels: 34, missingKeys: 0, skippedModels: [] } },
    { ts: '2026-02-19T11:47:53.000Z', event: 'INFRA_REGISTRY_RELOADED', data: { path: 'D:\\Clouds\\AO\\OneDrive\\AI\\Global\\LLM\\infra-registry.json' } },
    { ts: '2026-02-19T10:50:16.000Z', event: 'STARTUP_HEALTH_CHECK', data: { totalModels: 34, missingKeys: 0, skippedModels: [] } },
  ],
};

// ─── API Layer ───────────────────────────────────────────────────

const api = {
  /** Fetch with centralized error handling. */
  async call(path, options = {}) {
    const res = await fetch(path, options);
    if (res.status === 429) throw new Error('RATE_LIMIT');
    if (!res.ok) {
      const errText = await res.text();
      try {
        const errJson = errText ? JSON.parse(errText) : {};
        throw new Error(errJson.error || errJson.message || `${res.status} ${res.statusText}`);
      } catch {
        throw new Error(errText || `${res.status} ${res.statusText}`);
      }
    }
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  },

  /** Fetch from n8n webhook (raw — may return array). */
  async n8nCall(webhookPath, options = {}) {
    const res = await fetch(`http://${N8N_HOST}/webhook/${webhookPath}`, options);
    if (res.status === 429) throw new Error('RATE_LIMIT');
    if (!res.ok) throw new Error(`n8n ${res.status}`);
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  },

  /** POST JSON to n8n webhook. Unwraps n8n's single-element array wrapper. */
  async n8nPost(webhookPath, body) {
    const raw = await this.n8nCall(webhookPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return Array.isArray(raw) && raw.length === 1 ? raw[0] : raw;
  },

  /** POST JSON to local server. */
  async post(path, body) {
    return this.call(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  /**
   * Try n8n first, fall back to local server.
   * @param {string} n8nPath  - e.g. 'v2/sources'
   * @param {string} localPath - e.g. '/api/skills/news/sources'
   * @param {Function} extract - picks the array from the response object
   */
  async fetchWithFallback(n8nPath, localPath, extract) {
    try {
      return extract(await this.n8nCall(n8nPath));
    } catch {
      console.warn(`n8n ${n8nPath} unavailable, falling back to ${localPath}`);
      return extract(await this.call(localPath));
    }
  },

  /** Initial load of all critical data (single request). */
  async init() {
    try {
      V2State.initData = await this.call('/api/v2/init');
      syncAllDropdowns();
    } catch (err) {
      console.error('V2 Init failed:', err.message);
    }
  },
};

// ─── DOM Helpers ─────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

function showSpinner(id) { $(id)?.classList.remove('d-none'); }
function hideSpinner(id) { $(id)?.classList.add('d-none'); }

function setStatus(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

function setStatusClass(id, addClass, removeClass = []) {
  const el = $(id);
  if (!el) return;
  el.classList.remove(...removeClass);
  if (addClass) el.classList.add(addClass);
}

function setText(parent, selector, text) {
  const el = parent.querySelector(selector);
  if (el) el.textContent = text;
}

function normalizeSourceName(name) {
  return String(name || '').trim().toLowerCase();
}

function buildSourceLookup(list) {
  const byId = new Map();
  const byName = new Map();
  for (const item of (Array.isArray(list) ? list : [])) {
    if (item?.id) byId.set(item.id, item);
    byName.set(normalizeSourceName(item?.name), item);
  }
  return { byId, byName };
}

function resolveSourceField(source, lookup, fieldName) {
  if (typeof source?.[fieldName] !== 'undefined') return source[fieldName];
  if (source?.id && lookup.byId.has(source.id)) return lookup.byId.get(source.id)?.[fieldName];
  const n = normalizeSourceName(source?.name);
  if (lookup.byName.has(n)) return lookup.byName.get(n)?.[fieldName];
  return undefined;
}

function isYellowScoreProvider(provider = '') {
  const p = String(provider || '').toLowerCase();
  return p === 'google' || p === 'gemini' || p === 'yandex' || p === 'yandexgpt';
}

function emptyRow(msg) {
  return `<tr><td colspan="2" class="text-center py-5 border-0 text-muted small">${msg}</td></tr>`;
}

function errorRow(msg) {
  return `<tr><td colspan="2" class="text-center text-danger py-4">${msg}</td></tr>`;
}

// ─── Initialization ──────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  console.log('WorkFlow UI V2 Initialized');

  api.init().then(() => {
    const savedTabId = localStorage.getItem('v2_active_tab') || 'sources-tab';
    const savedTab = $(savedTabId);
    if (savedTab) new bootstrap.Tab(savedTab).show();
    triggerTabLoad(savedTabId);
  });

  initTableSorting();
  initCommentModal();
  initRotationHistoryModal();
  initActionHandlers();

  $('btn-check-updates')?.addEventListener('click', checkSourceUpdates);
  $('btn-reset-registry')?.addEventListener('click', resetRegistry);
  $('btn-sync-models')?.addEventListener('click', syncModels);
  $('btn-health-check')?.addEventListener('click', showHealthCheck);
  $('btn-sync-iq')?.addEventListener('click', syncBenchmarkIQ);
  $('btn-rotation-history')?.addEventListener('click', openRotationHistoryModal);
  $('btn-force-sync')?.addEventListener('click', forceGlobalSync);
  $('btn-verify-models')?.addEventListener('click', verifyAllModels);
  // [Removed] Manual model add — replaced by autonomous rotation
  $('btn-refresh-log')?.addEventListener('click', loadAgentLog);
  $('btn-run-maintenance')?.addEventListener('click', runMaintenance);

  document.querySelectorAll('button[data-bs-toggle="pill"]').forEach(el => {
    el.addEventListener('shown.bs.tab', (e) => {
      const tabId = e.target.id;
      localStorage.setItem('v2_active_tab', tabId);
      triggerTabLoad(tabId);
    });
  });
});

/** Map tab ID to its loader function. */
const TAB_LOADERS = {
  'sources-tab':      () => { V2State.activeTab = 'sources';      loadSources(); },
  'skills-tasks-tab': () => { V2State.activeTab = 'skills-tasks'; loadSkillsAndTasks(); },
  'productivity-tab': () => { V2State.activeTab = 'productivity'; loadProductivity(); },
  'infra-tab':        () => { V2State.activeTab = 'infra';        loadInfra(); },
  'log-tab':          () => { V2State.activeTab = 'log';          loadAgentLog(); },
};

function triggerTabLoad(tabId) {
  TAB_LOADERS[tabId]?.();
}

/** Populate all LLM dropdowns from initData (no extra HTTP call). */
function syncAllDropdowns() {
  const select = $('llm-select');
  if (!select) return;

  const models = V2State.initData.models || [];
  if (models.length === 0) {
    select.innerHTML = '<option value="">Нет активных моделей</option>';
    return;
  }

  // Use only READY/DEGRADED models for source checks.
  // Filter out models that have known failures (phantom models protection).
  const operational = models.filter(m => {
    const isReady = m.status === 'READY' || m.status === 'DEGRADED';
    const noFailures = (m.failures || 0) === 0;
    // Skip specialized Yandex agent models in Continue IDE & check lists
    if (m.name === 'yandex-app' || m.model === 'fvtj79pcagqihmvsaivl') return false;
    // If a model has failed even once, we consider it "suspect" and hide it from the primary list
    // unless it has a very high IQ or is a commander.
    const isCommander = m.role === 'commander';
    return isReady && (noFailures || isCommander);
  });

  // Keep top-3 models per provider by IQ (descending).
  const byProvider = new Map();
  for (const m of operational) {
    const p = (m.provider || 'unknown').toLowerCase();
    if (!byProvider.has(p)) byProvider.set(p, []);
    byProvider.get(p).push(m);
  }

  const selected = [];
  for (const [provider, arr] of byProvider.entries()) {
    arr.sort((a, b) => (Number(b.iq_score || 0) - Number(a.iq_score || 0)));
    selected.push(...arr.slice(0, 3).map((m, idx) => ({ ...m, _rank: idx, _provider: provider })));
  }

  // Final sort by IQ across all selected models (descending).
  selected.sort((a, b) => Number(b.iq_score || 0) - Number(a.iq_score || 0));

  select.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.disabled = true;
  placeholder.selected = true;
  placeholder.textContent = 'Выберите модель...';
  select.appendChild(placeholder);

  const rankColors = ['#198754', '#0dcaf0', '#6c757d']; // green, cyan, gray
  for (const m of selected) {
    const option = document.createElement('option');
    option.value = m.model || m.name;
    option.textContent = `${m.name} [${m.provider}] IQ:${Math.round(Number(m.iq_score || 0))}`;
    option.style.color = rankColors[m._rank] || '#6c757d';
    select.appendChild(option);
  }
}

// ─── Sources Tab ─────────────────────────────────────────────────

async function loadSources() {
  const tbody = $('sources-body');
  const template = $('tpl-source-row');
  if (!tbody || !template) return;

  V2State.isLoading = true;
  showSpinner('sources-spinner');
  setStatus('sources-status', 'Загрузка...');

  try {
    const allSources = await api.fetchWithFallback(
      'v2/sources', '/api/skills/news/sources',
      (data) => Array.isArray(data) ? data : (data.sources || [])
    );
    const localSourcesRaw = await api.call('/api/skills/news/sources');
    const localSources = Array.isArray(localSourcesRaw) ? localSourcesRaw : (localSourcesRaw.sources || []);
    const sourceLookup = buildSourceLookup(localSources);
    const normalizedSources = allSources.map((source) => ({
      ...source,
      integrated: resolveSourceField(source, sourceLookup, 'integrated'),
      url: resolveSourceField(source, sourceLookup, 'url'),
    }));

    const sourcesList = normalizedSources
      .filter(source => source.enabled !== false && source.status !== 'Disabled')
      .sort((a, b) => {
        const intA = a.integrated !== false ? 1 : 0;
        const intB = b.integrated !== false ? 1 : 0;
        if (intA !== intB) return intB - intA;
        return (b.priority || 0) - (a.priority || 0);
      });
    tbody.innerHTML = '';
    V2State.sourcesCount = sourcesList.length;
    V2State.lastLoadTime = new Date();

    for (const source of sourcesList) {
      try {
        const clone = template.content.cloneNode(true);
        const status = source.status || (source.enabled ? 'Active' : 'Disabled');
        const nameParts = splitSourceName(source.name);

        const rowEl = clone.querySelector('tr');
        if (rowEl && source.integrated === false) {
          rowEl.style.opacity = '0.5';
          rowEl.classList.add('opacity-50');
        }

        setText(clone, '.source-name', nameParts.title || source.name);
        setText(clone, '.source-prefix', nameParts.prefix || '');

        const linkEl = clone.querySelector('.source-link');
        if (linkEl && source.url) {
          linkEl.href = source.url;
          linkEl.style.color = 'inherit';
        }

        const typeEl = clone.querySelector('.source-type');
        if (typeEl) {
          typeEl.textContent = source.type;
          typeEl.className = `badge source-type fw-normal me-2 ${getSourceTypeBadgeClass(source.type)}`;
        }

        const priorityEl = clone.querySelector('.source-priority');
        if (priorityEl) {
          priorityEl.textContent = source.priority;
          applySourceStatusStyle(priorityEl, status);
        }

        setText(clone, '.source-status', status === 'Active' ? '' : status);
        tbody.appendChild(clone);
      } catch (err) {
        console.error('Error rendering source:', err);
      }
    }
    updateSourcesStatus();
  } catch (error) {
    console.error('Failed to load sources:', error);
    tbody.innerHTML = '';
    V2State.lastLoadTime = new Date();
    V2State.sourcesCount = FALLBACK_DATA.sources.length;
    for (const source of FALLBACK_DATA.sources) {
      const clone = template.content.cloneNode(true);
      const status = source.status || (source.enabled ? 'Active' : 'Disabled');
      const nameParts = splitSourceName(source.name);

      setText(clone, '.source-name', nameParts.title || source.name);
      setText(clone, '.source-prefix', nameParts.prefix || '');

      const typeEl = clone.querySelector('.source-type');
      if (typeEl) {
        typeEl.textContent = source.type;
        typeEl.className = `badge source-type fw-normal me-2 ${getSourceTypeBadgeClass(source.type)}`;
      }

      const priorityEl = clone.querySelector('.source-priority');
      if (priorityEl) {
        priorityEl.textContent = source.priority;
        applySourceStatusStyle(priorityEl, status);
      }

      setText(clone, '.source-status', status === 'Active' ? '' : status);
      tbody.appendChild(clone);
    }
    setStatus('sources-status', `${FALLBACK_DATA.sources.length} sources • обновлено в ${FALLBACK_STATUS_TIME}`);
    setStatusClass('sources-status', null, ['text-danger']);
  } finally {
    V2State.isLoading = false;
    hideSpinner('sources-spinner');
  }
}

function updateSourcesStatus() {
  if (!V2State.lastLoadTime) { setStatus('sources-status', ''); return; }
  const timeStr = V2State.lastLoadTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  setStatus('sources-status', `${V2State.sourcesCount} sources \u2022 обновлено в ${timeStr}`);
}

// ─── Model Failed Modal ───────────────────────────────────────────

async function showModelFailedModal(failedModel, newReleases) {
  // Fetch top-per-provider model list from backend
  let topModels = [];
  try {
    const data = await api.call('/api/models/top-per-provider');
    // Filter out models that have failures or are the failed model
    topModels = (data.models || []).filter(m => {
      const isSame = m.uid === failedModel || m.modelId === failedModel;
      // In the modal, we want to show only "clean" models
      const registryEntry = V2State.initData.models?.find(rem => rem.name === m.uid);
      const isClean = !registryEntry || (registryEntry.failures || 0) === 0;
      return !isSame && isClean;
    });
  } catch {
    topModels = [];
  }

  // Build modal HTML
  const radioItems = topModels.length > 0
    ? topModels.map((m, i) => `
        <div class="form-check mb-1">
          <input class="form-check-input" type="radio" name="model-pick" id="mpick-${i}" value="${m.modelId || m.uid}" ${i === 0 ? 'checked' : ''}>
          <label class="form-check-label" for="mpick-${i}">
            <strong>${m.uid}</strong> <span class="text-muted small">(${m.provider} · IQ ${m.iq})</span>
          </label>
        </div>`).join('')
    : '<p class="text-muted small">Нет доступных моделей</p>';

  const modal = document.createElement('div');
  modal.id = 'model-failed-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `
    <div style="background:#1e1e2e;border:1px solid #444;border-radius:12px;padding:28px 32px;min-width:380px;max-width:520px;color:#e0e0e0;box-shadow:0 8px 40px rgba(0,0,0,.6);">
      <h5 style="margin:0 0 8px;color:#f8d058;">⚠ Модель не создала задачи</h5>
      <p style="margin:0 0 16px;font-size:.9rem;color:#aaa;">
        <strong style="color:#e0e0e0">${failedModel}</strong> нашла <strong>${newReleases}</strong> новых релизов, но не смогла сгенерировать задачи.<br>
        Выберите другую модель и повторите:
      </p>
      <div style="margin-bottom:20px;">${radioItems}</div>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button id="mfail-cancel" style="padding:7px 18px;border:1px solid #555;background:transparent;color:#aaa;border-radius:6px;cursor:pointer;">Отмена</button>
        <button id="mfail-retry" style="padding:7px 18px;background:#2563eb;border:none;color:#fff;border-radius:6px;cursor:pointer;font-weight:600;">Повторить</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  const close = () => modal.remove();

  modal.querySelector('#mfail-cancel').addEventListener('click', close);

  modal.querySelector('#mfail-retry').addEventListener('click', () => {
    const selected = modal.querySelector('input[name="model-pick"]:checked')?.value;
    close();
    if (selected) {
      const sel = $('llm-select');
      if (sel) {
        // Update selector if option exists, otherwise add it temporarily
        let opt = Array.from(sel.options).find(o => o.value === selected);
        if (!opt) {
          opt = new Option(selected, selected);
          sel.appendChild(opt);
        }
        sel.value = selected;
      }
      checkSourceUpdates();
    }
  });

  // Close on backdrop click
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
}

function highlightSourceRow(sourceName) {
  const tbody = $('sources-body');
  if (!tbody) return;
  const rows = tbody.querySelectorAll('tr');
  rows.forEach(row => {
    const nameEl = row.querySelector('.source-name');
    if (nameEl && nameEl.textContent.trim().toLowerCase().includes(sourceName.toLowerCase())) {
      row.classList.add('table-primary');
      row.style.backgroundColor = 'rgba(13, 110, 253, 0.15)';
    } else {
      row.classList.remove('table-primary');
      row.style.backgroundColor = '';
    }
  });
}

function clearSourceHighlights() {
  const tbody = $('sources-body');
  if (!tbody) return;
  const rows = tbody.querySelectorAll('tr');
  rows.forEach(row => {
    row.classList.remove('table-primary');
    row.style.backgroundColor = '';
  });
}

async function checkSourceUpdates() {
  if (V2State.isLoading) return;

  V2State.isLoading = true;
  const btnCheck = $('btn-check-updates');
  if (btnCheck) btnCheck.disabled = true;
  showSpinner('sources-spinner');
  setStatus('sources-status', 'Проверка релизов sources...');
  setStatusClass('sources-status', null, ['text-success', 'text-warning', 'text-danger']);

  // Auto-clear Skills & Tasks immediately so the user sees a clean slate
  const skillsBody = $('skills-tasks-body');
  if (skillsBody) skillsBody.innerHTML = emptyRow('Идёт генерация отчётов...');
  api.post('/api/tasks/clear-runtime', {}).catch(() => {});

  let progressInterval = null;

  try {
    const selectedModel = $('llm-select')?.value;
    if (!selectedModel) {
      setStatus('sources-status', 'Выберите модель LLM');
      setStatusClass('sources-status', 'text-warning');
      return;
    }

    // Poll backend /api/reports/status for the exact source being processed (set by n8n callback)
    progressInterval = setInterval(async () => {
      try {
        const status = await api.call('/api/reports/status');
        if (status?.currentSource) {
          highlightSourceRow(status.currentSource);
        } else {
          clearSourceHighlights();
        }
      } catch {}
    }, 800);

    const result = await api.post('/api/reports/check', {
      trigger: 'manual', timestamp: Date.now(), llmModel: selectedModel,
    });

    if (progressInterval) clearInterval(progressInterval);
    clearSourceHighlights();

    // Model failed to produce tasks — show a modal so the user can pick another model
    if (result?.error === 'model_failed') {
      // Mark the model as failed in local state to hide it on re-render
      const failedModelEntry = V2State.initData.models?.find(m => m.name === selectedModel || m.model === selectedModel);
      if (failedModelEntry) {
        failedModelEntry.failures = (failedModelEntry.failures || 0) + 1;
        syncAllDropdowns(); // Hide it from dropdowns immediately
      }
      
      showModelFailedModal(selectedModel, result.newReleases || 0);
      setStatus('sources-status', `Модель ${selectedModel} не создала задачи`);
      setStatusClass('sources-status', 'text-warning');
      setTimeout(() => { setStatusClass('sources-status', null, ['text-warning']); updateSourcesStatus(); }, 5000);
      return;
    }

    let statusText = result.message || 'Проверка завершена';
    let statusClass = 'text-success';

    if (result.stats) {
      const newReleases = Number(result.stats.newReleases ?? result.stats.processed ?? 0);
      const tasksCreated = Number(result.stats.tasksCreated ?? 0);
      const skillsCreated = Number(result.stats.skillsCreated ?? 0);
      if (newReleases > 0) {
        const parts = [];
        if (skillsCreated > 0) parts.push(`${skillsCreated} skills`);
        if (tasksCreated > 0) parts.push(`${tasksCreated} tasks`);
        statusText = `Найдено ${newReleases} новых релизов`;
        if (parts.length) statusText += ` \u2022 Создано: ${parts.join(', ')}`;
      } else {
        statusText = 'Нет новых релизов';
        statusClass = 'text-muted';
      }
    }

    setStatus('sources-status', statusText);
    setStatusClass('sources-status', statusClass);
    setTimeout(() => { setStatusClass('sources-status', null, ['text-success', 'text-muted']); updateSourcesStatus(); }, 5000);
    setTimeout(loadSources, 1000);
    await loadSkillsAndTasks();
  } catch (error) {
    if (progressInterval) clearInterval(progressInterval);
    clearSourceHighlights();

    const errorMessages = {
      'Failed to fetch': 'Локальный API недоступен (проверьте continue-wrapper)',
      'NetworkError': 'Локальный API недоступен (проверьте continue-wrapper)',
      '404': 'Endpoint /api/reports/check не найден',
      '500': 'Ошибка оркестратора отчётов',
    };
    const key = Object.keys(errorMessages).find(k => error.message.includes(k));
    setStatus('sources-status', key ? errorMessages[key] : (error.message || 'Unknown error'));
    setStatusClass('sources-status', 'text-danger');
    setTimeout(() => { setStatusClass('sources-status', null, ['text-danger']); updateSourcesStatus(); }, 5000);
  } finally {
    V2State.isLoading = false;
    if (btnCheck) btnCheck.disabled = false;
    hideSpinner('sources-spinner');
  }
}

async function resetRegistry() {
  const btnReset = $('btn-reset-registry');
  if (btnReset) btnReset.disabled = true;
  setStatus('sources-status', 'Сброс реестра...');
  setStatusClass('sources-status', null, ['text-success', 'text-warning', 'text-danger']);

  try {
    const result = await api.post('/api/reports/reset', { trigger: 'ui', timestamp: Date.now() });
    setStatus('sources-status', result.message || 'Реестр сброшен');
    setStatusClass('sources-status', 'text-warning');
    setTimeout(() => { setStatusClass('sources-status', null, ['text-warning']); updateSourcesStatus(); }, 3000);
  } catch {
    setStatus('sources-status', 'Ошибка сброса реестра');
    setStatusClass('sources-status', 'text-danger');
    setTimeout(() => { setStatusClass('sources-status', null, ['text-danger']); updateSourcesStatus(); }, 3000);
  } finally {
    if (btnReset) btnReset.disabled = false;
  }
}

// ─── Skills & Tasks Tab ──────────────────────────────────────────

async function loadSkillsAndTasks() {
  const tbody = $('skills-tasks-body');
  if (!tbody) return;

  showSpinner('skills-tasks-spinner');
  setStatus('skills-tasks-status', 'Загрузка...');

  try {
    // Skill anchor: After reset + check-updates, n8n may return stale/empty lists for
    // a short window while local drafts are already created. Merge n8n + local to
    // avoid false "Нет данных" on Skills & Tasks tab.
    const [n8nTasksRaw, localTasksRaw, n8nSkillsRaw, localSkillsRaw] = await Promise.all([
      api.n8nCall('v2/tasks').catch(() => []),
      api.call('/api/tasks').catch(() => ({})),
      api.n8nCall('v2/skills').catch(() => []),
      api.call('/api/skills/candidates').catch(() => ({})),
    ]);

    const n8nTasks = extractArray(n8nTasksRaw, 'tasks', 'drafts');
    const localTasks = extractArray(localTasksRaw, 'tasks', 'drafts');
    const n8nSkills = extractArray(n8nSkillsRaw, 'candidates', 'skills');
    const localSkills = extractArray(localSkillsRaw, 'candidates', 'skills');

    const tasks = mergeByKey([...n8nTasks, ...localTasks], ['filename', 'id', 'title']);
    const skills = mergeByKey([...n8nSkills, ...localSkills], ['id', 'filename', 'title']);
    const missingIndicatorItems = tasks.filter((t) => {
      const hasSource = Boolean(getItemSourceLabel(t) && getItemSourceLabel(t) !== '\u2014');
      const hasMaster = Boolean(getItemMasterLabel(t) && getItemMasterLabel(t) !== '\u2014');
      return !t?.score && !hasSource && !hasMaster;
    });
    const missingIndicators = missingIndicatorItems.length;

    tbody.innerHTML = '';
    V2State.skillsTasksCount = tasks.length + skills.length;

    if (V2State.skillsTasksCount === 0) {
      FALLBACK_DATA.tasks.forEach(item => renderItemRow(item, tbody, 'task'));
      FALLBACK_DATA.skills.forEach(item => renderItemRow(item, tbody, 'skill'));
      V2State.skillsTasksCount = FALLBACK_DATA.tasks.length + FALLBACK_DATA.skills.length;
      setStatus('skills-tasks-status', `${FALLBACK_DATA.tasks.length} задач, ${FALLBACK_DATA.skills.length} навыков`);
    } else {
      tasks.forEach(item => renderItemRow(item, tbody, 'task'));
      skills.forEach(item => renderItemRow(item, tbody, 'skill'));
      setStatus('skills-tasks-status', `${tasks.length} задач, ${skills.length} навыков`);
    }
  } catch (error) {
    tbody.innerHTML = '';
    FALLBACK_DATA.tasks.forEach(item => renderItemRow(item, tbody, 'task'));
    FALLBACK_DATA.skills.forEach(item => renderItemRow(item, tbody, 'skill'));
    setStatus('skills-tasks-status', `${FALLBACK_DATA.tasks.length} задач, ${FALLBACK_DATA.skills.length} навыков`);
  } finally {
    hideSpinner('skills-tasks-spinner');
  }
}

function mergeByKey(items, keys) {
  const map = new Map();
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const key = keys.map(k => String(item[k] || '')).find(Boolean);
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, item);
    } else {
      map.set(key, mergePreferNonEmpty(map.get(key), item));
    }
  }
  return Array.from(map.values());
}

function mergePreferNonEmpty(current, incoming) {
  const merged = { ...current };
  for (const [k, v] of Object.entries(incoming || {})) {
    const cur = merged[k];
    const curEmpty = cur == null || cur === '' || cur === '—';
    const newFilled = !(v == null || v === '' || v === '—');
    if (curEmpty && newFilled) {
      merged[k] = v;
      continue;
    }
    // Prefer numeric score if current is missing/zero-ish.
    if (k === 'score' && newFilled && (!cur || Number(cur) === 0)) {
      merged[k] = v;
    }
  }
  return merged;
}

// ─── Productivity Tab ────────────────────────────────────────────

async function loadProductivity() {
  const tbody = $('productivity-body');
  const template = $('tpl-agent-row');
  if (!tbody || !template) return;

  showSpinner('productivity-spinner');
  setStatus('productivity-status', 'Загрузка...');

  try {
    const data = await api.call('/api/productivity');
    const agents = data.agents || [];

    tbody.innerHTML = '';
    agents
      .filter(agent => agent.id !== 'yandex-app' && agent.model !== 'fvtj79pcagqihmvsaivl')
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .forEach(agent => {
      const clone = template.content.cloneNode(true);
      const rating = agent.rating || 0;
      const roleRaw = String(agent._role || agent.role || 'scout').toLowerCase();
      const role = roleRaw === 'orchestrator' ? 'commander' : roleRaw;
      const mh = agent.modelHealth || {};

      setText(clone, '.agent-id', agent.id);
      const idLabelEl = clone.querySelector('.agent-id');
      if (idLabelEl && isYellowScoreProvider(agent.provider || mh.provider || '')) {
        idLabelEl.style.color = '#ffc107';
        idLabelEl.style.fontWeight = '600';
      }
      
      const iqEl = clone.querySelector('.agent-rating-value');
      if (iqEl) {
        const ratingNum = Math.round(rating);
        iqEl.textContent = ratingNum;
        let iqColor = '#6c757d'; // <= 49 (серый)
        if (ratingNum > 89) iqColor = '#198754'; // > 89 (зеленый)
        else if (ratingNum > 74) iqColor = '#0dcaf0'; // > 74 (голубой)
        else if (ratingNum > 49) iqColor = '#3a7ca5'; // > 49 (темно-синий блеклый)
        iqEl.style.color = iqColor;

        // Benchmark source tooltip
        const bs = agent.benchmark_source;
        if (bs) {
          const parts = [];
          if (bs.coding_index != null) parts.push(`AA Coding: ${bs.coding_index}`);
          if (bs.livecodebench != null) parts.push(`LiveCodeBench: ${bs.livecodebench}`);
          if (bs.intelligence_index != null) parts.push(`AA Intelligence: ${bs.intelligence_index}`);
          iqEl.title = parts.length ? parts.join(' | ') : 'Benchmark: N/A';
          iqEl.style.cursor = 'help';
        } else {
          iqEl.title = 'Нет данных бенчмарка';
        }
      }

      // Read-only role chip (manual role control removed, autonomous rotation only)
      const roleChip = clone.querySelector('.agent-role-chip');
      if (roleChip) {
        const roleLabel = role === 'commander' ? 'C' : 'S';
        roleChip.textContent = roleLabel;
        roleChip.className = role === 'commander'
          ? 'agent-role-chip badge border border-info text-info fw-normal me-1'
          : 'agent-role-chip badge border border-secondary text-secondary fw-normal me-1';
        roleChip.title = role === 'commander' ? 'Commander (авторотация)' : 'Scout (авторотация)';
      }

      // [Removed] Role select setup — replaced by autonomous rotation
      
      const providerBadge = clone.querySelector('.model-health-provider');
      if (providerBadge) {
        const providerText = String(agent.provider || mh.provider || '').trim();
        // In auto-rotation mode, empty provider is not useful; show explicit AUTO marker.
        providerBadge.textContent = providerText || 'AUTO';
        providerBadge.title = providerText
          ? `Provider: ${providerText}`
          : 'Provider is resolved by autonomous rotation pipeline';
      }

      const missionsEl = clone.querySelector('.agent-missions');
      if (missionsEl) {
        const missionsCount = Number(agent.missions_count || 0);
        missionsEl.textContent = String(missionsCount);
        const missionsSource = agent.missions_source || 'registry';
        missionsEl.title = `Выполнено миссий: ${missionsCount} (source: ${missionsSource})`;
      }

      tbody.appendChild(clone);
    });

    setStatus('productivity-status', `${agents.length} агентов`);
  } catch (error) {
    tbody.innerHTML = '';
    FALLBACK_DATA.agents
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .forEach(agent => {
        const clone = template.content.cloneNode(true);
        const rating = agent.rating || 0;
        const roleRaw = String(agent._role || agent.role || 'scout').toLowerCase();
        const role = roleRaw === 'orchestrator' ? 'commander' : roleRaw;

        setText(clone, '.agent-id', agent.id);
        const idLabelEl = clone.querySelector('.agent-id');
        if (idLabelEl && isYellowScoreProvider(agent.provider || '')) {
          idLabelEl.style.color = '#ffc107';
          idLabelEl.style.fontWeight = '600';
        }

        const iqEl = clone.querySelector('.agent-rating-value');
        if (iqEl) {
          const ratingNum = Math.round(rating);
          iqEl.textContent = ratingNum;
          let iqColor = '#6c757d';
          if (ratingNum > 89) iqColor = '#198754';
          else if (ratingNum > 74) iqColor = '#0dcaf0';
          else if (ratingNum > 49) iqColor = '#3a7ca5';
          iqEl.style.color = iqColor;
        }

        const roleChip = clone.querySelector('.agent-role-chip');
        if (roleChip) {
          const roleLabel = role === 'commander' ? 'C' : 'S';
          roleChip.textContent = roleLabel;
          roleChip.className = role === 'commander'
            ? 'agent-role-chip badge border border-info text-info fw-normal me-1'
            : 'agent-role-chip badge border border-secondary text-secondary fw-normal me-1';
        }

        const providerBadge = clone.querySelector('.model-health-provider');
        if (providerBadge) providerBadge.textContent = String(agent.provider || '').trim() || 'AUTO';

        const missionsEl = clone.querySelector('.agent-missions');
        if (missionsEl) missionsEl.textContent = String(Number(agent.missions_count || 0));

        tbody.appendChild(clone);
      });
    setStatus('productivity-status', `${FALLBACK_DATA.agents.length} агентов`);
  } finally {
    hideSpinner('productivity-spinner');
  }
}

// ─── Sync & Health-Check Actions ─────────────────────────────────

async function syncModels() {
  const btn = $('btn-sync-models');
  if (btn) btn.disabled = true;
  setStatus('productivity-status', 'Синхронизация реестра...');

  try {
    await api.post('/api/llm/sync', {});
    setStatus('productivity-status', 'Реестр синхронизирован');
    setStatusClass('productivity-status', 'text-success');
    setTimeout(() => { setStatusClass('productivity-status', null, ['text-success']); loadProductivity(); }, 2000);
  } catch (error) {
    setStatus('productivity-status', `Sync: ${error.message}`);
    setStatusClass('productivity-status', 'text-danger');
    setTimeout(() => setStatusClass('productivity-status', null, ['text-danger']), 3000);
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function showHealthCheck() {
  const btn = $('btn-health-check');
  if (btn) btn.disabled = true;
  setStatus('productivity-status', 'Проверка ключей...');

  try {
    const data = await api.call('/api/health-check');
    const providers = data.providers || {};
    const parts = Object.entries(providers).map(([p, info]) =>
      `${p}: ${info.status === 'ok' ? '\u2713' : '\u2717'}`
    );
    const missing = data.modelsWithoutKey || [];
    let msg = parts.join(' | ');
    if (missing.length) msg += ` | без ключа: ${missing.join(', ')}`;
    setStatus('productivity-status', msg);
    const hasIssues = Object.values(providers).some(p => p.status !== 'ok');
    setStatusClass('productivity-status', hasIssues ? 'text-warning' : 'text-success');
    setTimeout(() => setStatusClass('productivity-status', null, ['text-success', 'text-warning']), 5000);
  } catch (error) {
    setStatus('productivity-status', `Keys: ${error.message}`);
    setStatusClass('productivity-status', 'text-danger');
    setTimeout(() => setStatusClass('productivity-status', null, ['text-danger']), 3000);
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function syncBenchmarkIQ() {
  const btn = $('btn-sync-iq');
  if (btn) btn.disabled = true;
  setStatus('productivity-status', 'Пересчёт IQ из бенчмарков...');
  showSpinner('productivity-spinner');

  // Show per-row spinners next to IQ values
  document.querySelectorAll('.agent-iq-spinner').forEach(s => s.classList.remove('d-none'));

  try {
    const data = await api.call('/api/benchmarks/sync');

    // Build informative status message
    const src = data.source === 'api' ? 'Artificial Analysis API' : 'локальный кэш';
    const parts = [];
    if (data.agents_updated > 0) {
      parts.push(`${data.agents_updated} из ${data.total_agents || '?'} пересчитано`);
    } else {
      parts.push(`${data.total_agents || '?'} агентов — IQ без изменений`);
    }
    parts.push(`${data.unique_models_in_cache || 0} моделей`);
    parts.push(src);
    if (!data.has_api_key) {
      parts.push('нет API-ключа — задайте ARTIFICIAL_ANALYSIS_API_KEY');
    }
    if (data.agents_not_in_benchmarks > 0) {
      parts.push(`${data.agents_not_in_benchmarks} не найдены в бенчмарках`);
    }

    const cls = data.agents_updated > 0 ? 'text-success' : 'text-info';
    setStatus('productivity-status', parts.join(' · '));
    setStatusClass('productivity-status', cls);

    // Immediately reload productivity table to reflect new IQ values & re-sort
    await loadProductivity();

    // Clear status styling after a pause
    setTimeout(() => setStatusClass('productivity-status', null, [cls]), 4000);
  } catch (error) {
    setStatus('productivity-status', `Sync IQ ошибка: ${error.message}`);
    setStatusClass('productivity-status', 'text-danger');
    setTimeout(() => setStatusClass('productivity-status', null, ['text-danger']), 5000);
  } finally {
    if (btn) btn.disabled = false;
    hideSpinner('productivity-spinner');
    document.querySelectorAll('.agent-iq-spinner').forEach(s => s.classList.add('d-none'));
  }
}

// ─── Rotation History Modal ──────────────────────────────────────

let rotationHistoryModal = null;

function initRotationHistoryModal() {
  const el = $('v2RotationHistoryModal');
  if (!el) return;
  rotationHistoryModal = new bootstrap.Modal(el);
  el.addEventListener('show.bs.modal', () => {
    loadRotationHistory();
  });
}

function openRotationHistoryModal() {
  if (!rotationHistoryModal) return;
  rotationHistoryModal.show();
}

function renderRotationData(data = {}) {
  const body = $('rotation-history-body');
  const status = $('rotation-history-status');
  if (!body || !status) return;

  const entries = Array.isArray(data.entries) ? data.entries : [];
  if (!entries.length) {
    body.innerHTML = '<tr><td colspan="3" class="text-center text-muted small">История пока пуста</td></tr>';
    status.textContent = 'Нет событий ротации';
    return;
  }

  body.innerHTML = entries.map((e) => {
    const ts = e.ts ? new Date(e.ts).toLocaleString('ru-RU') : '—';
    const event = e.event || 'UNKNOWN';
    const dataObj = e.data || {};
    
    // Color logic for added/removed/promoted
    let rowClass = '';
    if (event === 'MODEL_PRICING_TRANSITION') {
      if (dataObj.type === 'new_free' || dataObj.type === 'paid_to_free') rowClass = 'text-success';
      else if (dataObj.type === 'free_to_paid_or_removed') rowClass = 'text-danger';
    } else if (event === 'AGENT_ROLE_CHANGED_AUTO') {
      if (dataObj.to === 'commander') rowClass = 'text-info';
      else if (dataObj.to === 'waiting_list') rowClass = 'text-muted';
    }

    const details = (typeof dataObj === 'object' && dataObj !== null)
      ? Object.entries(dataObj).slice(0, 8).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join(' | ')
      : String(dataObj || '');

    return `
      <tr class="${rowClass}">
        <td class="small opacity-75" style="font-family: monospace;">${ts}</td>
        <td><span class="badge bg-secondary-subtle text-secondary fw-normal">${event}</span></td>
        <td class="small" style="word-break: break-word;">${details}</td>
      </tr>
    `;
  }).join('');

  status.textContent = `Событий: ${entries.length}`;
}

async function loadRotationHistory() {
  const status = $('rotation-history-status');
  const body = $('rotation-history-body');
  if (status) status.textContent = 'Загрузка истории...';
  if (body) body.innerHTML = '<tr><td colspan="3" class="text-center text-muted small">Загрузка...</td></tr>';
  try {
    const data = await api.call('/api/agents/rotation-history');
    renderRotationData(data);
  } catch (e) {
    if (body) body.innerHTML = `<tr><td colspan="3" class="text-center text-danger small">${e.message}</td></tr>`;
    if (status) status.textContent = 'Ошибка загрузки истории';
  }
}

// ─── Infra Tab ───────────────────────────────────────────────────

const PROVIDER_KEY_PAGES = {
  groq: { label: 'Groq', url: 'https://console.groq.com/keys' },
  openrouter: { label: 'OpenRouter', url: 'https://openrouter.ai/settings/keys' },
  mistral: { label: 'Mistral', url: 'https://console.mistral.ai/api-keys/' },
  yandex: { label: 'Yandex Cloud', url: 'https://console.yandex.cloud/' },
  yandex_folder: { label: 'Yandex Cloud', url: 'https://console.yandex.cloud/' },
  kilocode: { label: 'KiloCode', url: 'https://app.kilo.ai/profile' },
  gemini: { label: 'Gemini (Google AI)', url: 'https://aistudio.google.com/app/apikey' },
  google: { label: 'Gemini (Google AI)', url: 'https://aistudio.google.com/app/apikey' },
  artificial_analysis: { label: 'Artificial Analysis', url: 'https://artificialanalysis.ai/' },
  cloudflare: { label: 'Cloudflare', url: 'https://dash.cloudflare.com/' },
  github: { label: 'GitHub', url: 'https://github.com/settings/tokens' },
};

function normalizeProviderId(id = '') {
  const raw = String(id || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw.includes('openrouter')) return 'openrouter';
  if (raw.includes('groq')) return 'groq';
  if (raw.includes('mistral')) return 'mistral';
  if (raw.includes('yandex')) return 'yandex';
  if (raw.includes('google') || raw.includes('gemini')) return 'google';
  if (raw.includes('kilocode')) return 'kilocode';
  if (raw.includes('artificial')) return 'artificial_analysis';
  if (raw.includes('cloudflare')) return 'cloudflare';
  if (raw.includes('github')) return 'github';
  return raw;
}

function toTitleCase(text = '') {
  return String(text)
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getProviderDocUrl(providerId = '') {
  const id = normalizeProviderId(providerId);
  const known = PROVIDER_KEY_PAGES[id];
  if (known) return known.url;
  return `https://openrouter.ai/docs/quickstart`; // Ultimate fallback
}

function renderApiKeyLinks(health = {}) {
  const linksRoot = $('infra-keys-links');
  if (!linksRoot) return;

  const ids = new Set();
  for (const keyId of Object.keys(health.keys || {})) ids.add(normalizeProviderId(keyId));
  for (const providerId of Object.keys(health.providers || {})) ids.add(normalizeProviderId(providerId));

  // Keep current known providers visible even if health payload is temporarily partial.
  ['groq', 'openrouter', 'mistral', 'yandex'].forEach((id) => ids.add(id));

  const providerIds = Array.from(ids).filter(Boolean).sort((a, b) => a.localeCompare(b));
  if (!providerIds.length) {
    linksRoot.innerHTML = '<span class="text-muted">Нет данных по провайдерам</span>';
    return;
  }

  linksRoot.innerHTML = providerIds.map((id) => {
    const known = PROVIDER_KEY_PAGES[id];
    const url = known?.url || getProviderDocUrl(id);
    const label = known?.label || toTitleCase(id);
    return `<a class="btn btn-sm btn-outline-secondary" href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  }).join('');
}

async function loadInfra() {
  showSpinner('infra-spinner');
  setStatus('infra-status', 'Загрузка...');

  try {
    const [config, health, depHealth, snapshots, rotationHistory] = await Promise.all([
      api.call('/api/infra/config'),
      api.call('/api/health-check'),
      api.call('/api/infra/dependency-health'),
      api.call('/api/api-keys/snapshots'),
      api.call('/api/agents/rotation-history')
    ]);

    const checks = config.checks || {};
    renderApiKeyLinks(health);
    const providerEntries = Object.entries(health.providers || {});
    const providerTotal = providerEntries.length;
    const providerOk = providerEntries.filter(([, info]) => info?.status === 'ok').length;
    const missingKeysCount = (health.modelsWithoutKey || []).length;
    const snapshotCount = (snapshots.snapshots || []).length;
    const depSummary = depHealth.summary || { ok: 0, total: 0, upgrade_required: 0 };
    const rotationTotal = Number(rotationHistory.total || 0);
    const rotationLastTs = rotationHistory.entries?.[0]?.ts
      ? new Date(rotationHistory.entries[0].ts).toLocaleString()
      : 'n/a';

    const list = $('infra-onedrive-list');
    if (list) {
      const statusClass = (ok, optional = false) => {
        if (ok) return 'text-success';
        return optional ? 'text-muted' : 'text-danger';
      };
      const statusText = (ok, optional = false, pos = 'OK \u2713') => {
        if (ok) return pos;
        return optional ? 'N/A (external)' : 'MISSING \u2717';
      };
      list.innerHTML = [
        { label: 'Infra Registry', ok: checks.infra_registry_exists, optional: false },
        { label: 'Global Event Log', ok: checks.global_event_log_exists, optional: false },
        { label: 'Git Registry', ok: checks.git_registry_exists, optional: true },
        { label: 'N8N Registry', ok: checks.n8n_registry_exists, optional: true },
        { label: 'Tasks Dir', ok: checks.tasks_dir_exists, optional: true },
        { label: 'Rotation History File', ok: checks.rotation_history_exists, optional: false },
        { label: 'Pricing State File', ok: checks.pricing_state_exists, optional: false },
      ].map((item) => `
        <li class="d-flex mb-1">
          <span class="w-50 text-end pe-2 text-muted opacity-75">${item.label}:</span>
          <span class="w-50 ${statusClass(!!item.ok, !!item.optional)}">${statusText(!!item.ok, !!item.optional)}</span>
        </li>
      `).join('') + `
        <li class="d-flex mb-1">
          <span class="w-50 text-end pe-2 text-muted opacity-75">Providers Ready:</span>
          <span class="w-50 ${providerOk === providerTotal ? 'text-success' : 'text-warning'}">${providerOk}/${providerTotal}</span>
        </li>
        <li class="d-flex mb-1">
          <span class="w-50 text-end pe-2 text-muted opacity-75">Models In Fallback Chain:</span>
          <span class="w-50 text-info">${health.totalModels || 0}</span>
        </li>
        <li class="d-flex mb-1">
          <span class="w-50 text-end pe-2 text-muted opacity-75">Models Without Key:</span>
          <span class="w-50 ${missingKeysCount === 0 ? 'text-success' : 'text-danger'}">${missingKeysCount}</span>
        </li>
        <li class="d-flex mb-1">
          <span class="w-50 text-end pe-2 text-muted opacity-75">API Key Snapshots:</span>
          <span class="w-50 ${snapshotCount > 0 ? 'text-success' : 'text-danger'}">${snapshotCount}</span>
        </li>
        <li class="d-flex mb-1">
          <span class="w-50 text-end pe-2 text-muted opacity-75">Dependency Baseline:</span>
          <span class="w-50 ${depSummary.upgrade_required ? 'text-warning' : 'text-success'}">${depSummary.ok}/${depSummary.total} OK</span>
        </li>
        <li class="d-flex">
          <span class="w-50 text-end pe-2 text-muted opacity-75">Rotation Events:</span>
          <span class="w-50 text-info">${rotationTotal}</span>
        </li>
        <li class="d-flex mb-1">
          <span class="w-50 text-end pe-2 text-muted opacity-75">Last Event:</span>
          <span class="w-50 text-muted opacity-75">${rotationLastTs}</span>
        </li>
      `;
    }

    const keysList = $('infra-keys-list');
    if (keysList) {
      const keyEntries = Object.entries(health.keys || {});
      const entriesToRender = keyEntries.length
        ? keyEntries.map(([id, info]) => [info.label || id, info])
        : providerEntries.map(([p, info]) => [p, info]);
      const aiKeyIds = new Set([
        'openrouter', 'mistral', 'groq', 'yandex', 'yandex_folder',
        'kilocode', 'gemini',
      ]);
      const aiEntries = keyEntries.length
        ? keyEntries.filter(([id]) => aiKeyIds.has(id)).map(([id, info]) => [info.label || id, info])
        : entriesToRender;
      const otherEntries = keyEntries.length
        ? keyEntries.filter(([id]) => !aiKeyIds.has(id)).map(([id, info]) => [info.label || id, info])
        : [];

      const renderRows = (rows) => rows.map(([label, info]) => `
        <li class="d-flex mb-1">
          <span class="w-50 text-end pe-2 text-muted opacity-75">${label}:</span>
          <span class="w-50 ${info.status === 'ok' ? 'text-success' : 'text-danger'}">${info.status === 'ok' ? 'OK \u2713' : 'MISSING \u2717'}</span>
        </li>
      `).join('');

      const divider = otherEntries.length ? `
        <li class="my-2" style="border-top: 1px solid rgba(255,255,255,0.22);"></li>
      ` : '';
      keysList.innerHTML = `${renderRows(aiEntries)}${divider}${renderRows(otherEntries)}`;
    }

    const systemHoles = [
      !checks.infra_registry_exists,
      !checks.global_event_log_exists,
      !checks.rotation_history_exists,
      !checks.pricing_state_exists,
      missingKeysCount > 0,
      depSummary.upgrade_required > 0,
    ].filter(Boolean).length;

    setStatus('infra-status', systemHoles === 0 ? 'Инфраструктура в норме' : `Найдены проблемы: ${systemHoles}`);
    setStatusClass('infra-status', systemHoles === 0 ? 'text-success' : 'text-warning', ['text-success', 'text-warning', 'text-danger']);
  } catch (error) {
    const config = { checks: FALLBACK_DATA.infra.checks };
    const health = FALLBACK_DATA.infra.health;
    const depSummary = FALLBACK_DATA.infra.depSummary;
    const snapshotCount = FALLBACK_DATA.infra.snapshotCount;
    const rotationTotal = FALLBACK_DATA.infra.rotationTotal;
    const rotationLastTs = new Date(FALLBACK_DATA.infra.rotationLastTs).toLocaleString('ru-RU');

    renderApiKeyLinks(health);
    const providerEntries = Object.entries(health.providers || {});
    const providerTotal = providerEntries.length;
    const providerOk = providerEntries.filter(([, info]) => info?.status === 'ok').length;
    const missingKeysCount = (health.modelsWithoutKey || []).length;
    const checks = config.checks || {};

    const list = $('infra-onedrive-list');
    if (list) {
      const statusClass = (ok, optional = false) => (ok ? 'text-success' : (optional ? 'text-muted' : 'text-danger'));
      const statusText = (ok, optional = false, pos = 'OK ✓') => (ok ? pos : (optional ? 'N/A (external)' : 'MISSING ✗'));
      list.innerHTML = [
        { label: 'Infra Registry', ok: checks.infra_registry_exists, optional: false },
        { label: 'Global Event Log', ok: checks.global_event_log_exists, optional: false },
        { label: 'Git Registry', ok: checks.git_registry_exists, optional: true },
        { label: 'N8N Registry', ok: checks.n8n_registry_exists, optional: true },
        { label: 'Tasks Dir', ok: checks.tasks_dir_exists, optional: true },
        { label: 'Rotation History File', ok: checks.rotation_history_exists, optional: false },
        { label: 'Pricing State File', ok: checks.pricing_state_exists, optional: false },
      ].map((item) => `
        <li class="d-flex mb-1">
          <span class="w-50 text-end pe-2 text-muted opacity-75">${item.label}:</span>
          <span class="w-50 ${statusClass(!!item.ok, !!item.optional)}">${statusText(!!item.ok, !!item.optional)}</span>
        </li>
      `).join('') + `
        <li class="d-flex mb-1">
          <span class="w-50 text-end pe-2 text-muted opacity-75">Providers Ready:</span>
          <span class="w-50 ${providerOk === providerTotal ? 'text-success' : 'text-warning'}">${providerOk}/${providerTotal}</span>
        </li>
        <li class="d-flex mb-1">
          <span class="w-50 text-end pe-2 text-muted opacity-75">Models In Fallback Chain:</span>
          <span class="w-50 text-info">${health.totalModels || 0}</span>
        </li>
        <li class="d-flex mb-1">
          <span class="w-50 text-end pe-2 text-muted opacity-75">Models Without Key:</span>
          <span class="w-50 ${missingKeysCount === 0 ? 'text-success' : 'text-danger'}">${missingKeysCount}</span>
        </li>
        <li class="d-flex mb-1">
          <span class="w-50 text-end pe-2 text-muted opacity-75">API Key Snapshots:</span>
          <span class="w-50 ${snapshotCount > 0 ? 'text-success' : 'text-danger'}">${snapshotCount}</span>
        </li>
        <li class="d-flex mb-1">
          <span class="w-50 text-end pe-2 text-muted opacity-75">Dependency Baseline:</span>
          <span class="w-50 ${depSummary.upgrade_required ? 'text-warning' : 'text-success'}">${depSummary.ok}/${depSummary.total} OK</span>
        </li>
        <li class="d-flex">
          <span class="w-50 text-end pe-2 text-muted opacity-75">Rotation Events:</span>
          <span class="w-50 text-info">${rotationTotal}</span>
        </li>
        <li class="d-flex mb-1">
          <span class="w-50 text-end pe-2 text-muted opacity-75">Last Event:</span>
          <span class="w-50 text-muted opacity-75">${rotationLastTs}</span>
        </li>
      `;
    }

    const keysList = $('infra-keys-list');
    if (keysList) {
      const keyEntries = Object.entries(health.keys || {});
      const aiKeyIds = new Set(['openrouter', 'mistral', 'groq', 'yandex', 'yandex_folder', 'kilocode', 'gemini']);
      const aiEntries = keyEntries.filter(([id]) => aiKeyIds.has(id)).map(([id, info]) => [info.label || id, info]);
      const otherEntries = keyEntries.filter(([id]) => !aiKeyIds.has(id)).map(([id, info]) => [info.label || id, info]);
      const renderRows = (rows) => rows.map(([label, info]) => `
        <li class="d-flex mb-1">
          <span class="w-50 text-end pe-2 text-muted opacity-75">${label}:</span>
          <span class="w-50 ${info.status === 'ok' ? 'text-success' : 'text-danger'}">${info.status === 'ok' ? 'OK ✓' : 'MISSING ✗'}</span>
        </li>
      `).join('');
      const divider = otherEntries.length ? `<li class="my-2" style="border-top: 1px solid rgba(255,255,255,0.22);"></li>` : '';
      keysList.innerHTML = `${renderRows(aiEntries)}${divider}${renderRows(otherEntries)}`;
    }

    setStatus('infra-status', FALLBACK_DATA.infra.status);
    setStatusClass('infra-status', 'text-success', ['text-success', 'text-warning', 'text-danger']);
  } finally {
    hideSpinner('infra-spinner');
  }
}

async function verifyAllModels() {
  const btn = $('btn-verify-models');
  if (btn) btn.disabled = true;
  setStatus('infra-status', 'Проверка всех моделей (может занять 1-2 мин)...');
  showSpinner('infra-spinner');

  try {
    const res = await api.post('/api/models/verify-all');
    if (res.success) {
      const failed = res.results.filter(r => r.status === 'failed').length;
      const verified = res.results.filter(r => r.status === 'verified').length;
      setStatus('infra-status', `Проверка завершена: ${verified} OK, ${failed} фантомных`);
      // Reload infra tab to show new health status
      await loadInfra();
      // Update model dropdowns to hide failed models
      syncAllDropdowns();
    } else {
      setStatus('infra-status', 'Ошибка проверки моделей');
    }
  } catch (e) {
    setStatus('infra-status', 'Ошибка API: ' + e.message);
  } finally {
    if (btn) btn.disabled = false;
    hideSpinner('infra-spinner');
  }
}

async function forceGlobalSync() {
  const btn = $('btn-force-sync');
  if (btn) btn.disabled = true;
  setStatus('infra-status', 'Принудительная синхронизация...');

  try {
    await api.post('/api/infra/sync', {});
    setStatus('infra-status', 'Синхронизация завершена');
    setTimeout(loadInfra, 1000);
  } catch (error) {
    setStatus('infra-status', `Sync Error: ${error.message}`);
  } finally {
    if (btn) btn.disabled = false;
  }
}

// [Removed] addNewModel() — replaced by autonomous rotation (model-discovery.js)

// ─── Unified Item Rendering (Skills & Tasks) ────────────────────

function renderItemRow(item, tbody, kind) {
  const template = $(`tpl-${kind}-row`);
  if (!template) return;
  const clone = template.content.cloneNode(true);

  const titleText = item.title || item.filename || item.id || '';
  const descText = kind === 'skill'
    ? (item.explanation || item.description || '')
    : (item.description || '');
  const itemId = kind === 'skill'
    ? (item.id || item.title || '')
    : (item.filename || item.id || item.title || '');

  setText(clone, `.${kind}-title`, titleText);
  setText(clone, `.${kind === 'skill' ? 'skill-explanation' : 'task-desc'}`, descText);
  setText(clone, `.${kind}-source`, getItemSourceLabel(item));
  setText(clone, `.${kind}-master`, getItemMasterLabel(item));

  const detailsCell = clone.querySelector('.item-details-cell');
  if (detailsCell) {
    detailsCell.dataset.itemId = itemId;
    detailsCell.dataset.itemTitle = titleText;
  }

  const typeIcons = clone.querySelector(`.${kind}-types`);
  if (typeIcons) typeIcons.innerHTML = renderTypeIcons(getItemTypes(item));

  const scoreBadge = clone.querySelector(`.${kind}-score`);
  applyScoreBadge(scoreBadge, item.score);

  const actionsCell = clone.querySelector(`.${kind}-actions`);
  if (actionsCell) {
    actionsCell.innerHTML = '';
    const okBtn = createActionButton({
      text: 'OK', title: 'ОК - Полезно',
      className: 'btn btn-sm btn-outline-secondary opacity-75 btn-ok',
      action: 'confirm', itemId, itemType: kind,
    });
    applyConfirmButtonState(okBtn, isItemConfirmed(kind, itemId));
    actionsCell.appendChild(okBtn);
    actionsCell.appendChild(createActionButton({
      text: 'DEL', title: 'Отклонить',
      className: 'btn btn-sm btn-outline-secondary opacity-75',
      action: 'reject', itemId, itemType: kind,
    }));
    if (scoreBadge && !scoreBadge.classList.contains('d-none')) actionsCell.appendChild(scoreBadge);
  }

  applyComment(clone.querySelector(`.${kind}-comment`), kind, itemId);
  tbody.appendChild(clone);
}

// ─── Actions (Confirm, Reject) ────────────────────────────────────

function initActionHandlers() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const { action, itemId, itemType } = btn.dataset;
    if (action === 'confirm') confirmItem(btn, itemType, itemId);
    if (action === 'reject')  rejectItem(itemType, itemId);
  });
}

async function confirmItem(btn, type, id) {
  if (!btn || !type || !id) return;
  const confirmed = isItemConfirmed(type, id);
  if (confirmed) {
    setItemConfirmed(type, id, false);
    applyConfirmButtonState(btn, false);
    return;
  }

  try {
    btn.disabled = true;
    await api.n8nPost('v2/confirm', { id, type, action: 'confirm', trigger: 'v2-ui' });
    setItemConfirmed(type, id, true);
    applyConfirmButtonState(btn, true);
  } catch (error) {
    console.error('Confirm failed:', error.message);
  } finally {
    btn.disabled = false;
  }
}

async function rejectItem(type, id) {
  try {
    await api.post('/api/skills/remove-item', { id, type });
  } catch (err) {
    console.error('Reject failed:', err.message);
    return;
  }
  await loadSkillsAndTasks();
}

async function clearList(type) {
  if (type !== 'skills-tasks') return;
  
  const tbody = $('skills-tasks-body');
  if (!tbody) return;

  const rows = Array.from(tbody.querySelectorAll('tr')).filter(r => !r.querySelector('td[colspan]'));
  if (rows.length === 0) return;

  setStatus('skills-tasks-status', 'Запуск последовательной очистки...');
  showSpinner('skills-tasks-spinner');

  let deletedCount = 0;
  for (const row of rows) {
    const detailsCell = row.querySelector('.item-details-cell');
    if (!detailsCell) continue;
    
    const id = detailsCell.dataset.itemId;
    const type = detailsCell.dataset.itemType;
    
    if (!id || !type) continue;

    row.style.transition = 'opacity 0.3s';
    row.style.opacity = '0.5';
    
    try {
      const res = await api.post('/api/skills/remove-item', { id, type });
      if (res.success || /Task not found/i.test(String(res?.error || ''))) {
        row.remove();
        deletedCount++;
        setStatus('skills-tasks-status', `Удалено: ${deletedCount} из ${rows.length}`);
      } else {
        row.style.opacity = '1';
        row.classList.add('table-danger');
      }
    } catch (e) {
      // Missing local draft should not block sequential cleanup of visible list.
      if (/Task not found/i.test(String(e?.message || ''))) {
        row.remove();
        deletedCount++;
        setStatus('skills-tasks-status', `Удалено: ${deletedCount} из ${rows.length}`);
        continue;
      }
      console.error(`Failed to delete ${id}:`, e.message);
      row.style.opacity = '1';
    }
    await Promise.resolve();
  }

  // Final authoritative clear for both n8n and local orchestrator states.
  try {
    await api.n8nPost('v2/clear-list', { type, trigger: 'v2-ui' });
  } catch {
    await api.post('/api/skills/clear-list', { type, trigger: 'v2-ui' }).catch(() => {});
  }

  setStatus('skills-tasks-status', `Очистка завершена. Удалено ${deletedCount} элементов.`);
  hideSpinner('skills-tasks-spinner');
  await loadSkillsAndTasks();
}

// ─── Comment Modal ───────────────────────────────────────────────

function initCommentModal() {
  const modalEl = $('v2CommentModal');
  const saveBtn = $('v2CommentSaveBtn');
  const input = $('v2CommentInput');
  if (!modalEl || !saveBtn || !input) return;

  const modal = new bootstrap.Modal(modalEl);
  let current = { type: '', id: '', cell: null, title: '' };

  document.addEventListener('click', (e) => {
    const cell = e.target.closest('.item-details-cell');
    if (!cell) return;
    const { itemType: type, itemId: id, itemTitle: title } = cell.dataset;
    if (!type || !id) return;

    current = { type, id, cell, title: title || '' };

    const subtitle = $('v2CommentModalSubtitle');
    if (subtitle) subtitle.textContent = `${type === 'skill' ? 'Skill' : 'Task'} \u2022 ${current.title || current.id}`;

    input.value = getLocalComment(type, id);
    modal.show();
  });

  saveBtn.addEventListener('click', () => {
    const comment = input.value.trim();
    setLocalComment(current.type, current.id, comment);

    if (current.cell) {
      const commentEl = current.cell.querySelector(`.${current.type}-comment`);
      if (commentEl) {
        commentEl.textContent = comment;
        commentEl.classList.toggle('d-none', !comment);
      }
    }
    modal.hide();
  });
}

function getLocalComment(type, id) {
  try { return localStorage.getItem(`v2_comment_${type}_${id}`) || ''; }
  catch { return ''; }
}

function setLocalComment(type, id, comment) {
  try { localStorage.setItem(`v2_comment_${type}_${id}`, comment); }
  catch { /* ignore */ }
}

function applyComment(el, type, id) {
  if (!el) return;
  const saved = getLocalComment(type, id);
  el.textContent = saved;
  el.classList.toggle('d-none', !saved);
}

function confirmStateKey(type, id) {
  return `v2_confirm_${type}_${id}`;
}

function isItemConfirmed(type, id) {
  try { return localStorage.getItem(confirmStateKey(type, id)) === '1'; }
  catch { return false; }
}

function setItemConfirmed(type, id, confirmed) {
  try {
    if (confirmed) localStorage.setItem(confirmStateKey(type, id), '1');
    else localStorage.removeItem(confirmStateKey(type, id));
  } catch {
    // ignore localStorage errors
  }
}

function applyConfirmButtonState(btn, confirmed) {
  if (!btn) return;
  btn.classList.remove('btn-outline-secondary', 'opacity-75', 'btn-success', 'text-white');
  if (confirmed) {
    btn.classList.add('btn-success', 'text-white');
    btn.textContent = '✓';
    btn.title = 'Подтверждено (нажмите снова for отмены отметки)';
    return;
  }
  btn.classList.add('btn-outline-secondary', 'opacity-75');
  btn.textContent = 'OK';
  btn.title = 'ОК - Полезно';
}

// ─── Table Sorting ───────────────────────────────────────────────

function initTableSorting() {
  document.addEventListener('click', (e) => {
    const th = e.target.closest('.table-v2 thead th');
    if (!th) return;

    const table = th.closest('table');
    const tbody = table.querySelector('tbody');
    const index = Array.from(th.parentNode.children).indexOf(th);
    const rows = Array.from(tbody.querySelectorAll('tr'));

    const isAsc = th.dataset.dir !== 'asc';
    th.dataset.dir = isAsc ? 'asc' : 'desc';
    th.parentNode.querySelectorAll('th').forEach(h => h.classList.remove('active-sort'));
    th.classList.add('active-sort');

    rows.sort((a, b) => {
      const aVal = getSortValue(a.children[index]);
      const bVal = getSortValue(b.children[index]);
      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);
      if (!isNaN(aNum) && !isNaN(bNum)) return isAsc ? aNum - bNum : bNum - aNum;
      return isAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));
  });
}

function getSortValue(cell) {
  if (!cell) return '';
  for (const sel of ['.source-priority', '.agent-missions', '.fw-bold', '.badge']) {
    const el = cell.querySelector(sel);
    if (el) return el.textContent.trim();
  }
  return cell.textContent.trim();
}

// ─── Data Extraction Helpers ─────────────────────────────────────

/**
 * Extract array from various n8n response formats.
 * n8n can return: [...], [{key: [...]}], {key: [...]}, etc.
 */
function extractArray(data, ...keys) {
  if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === 'object' && !Array.isArray(data[0])) {
      for (const key of keys) {
        if (data[0][key]) return data[0][key];
      }
    }
    return data;
  }
  for (const key of keys) {
    if (data[key]) return data[key];
  }
  return [];
}

// ─── UI Utility Functions ────────────────────────────────────────

function switchToTab(tabId) {
  const tabEl = $(tabId);
  if (tabEl) new bootstrap.Tab(tabEl).show();
}

function createActionButton({ text, title, className, action, itemId, itemType }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = text;
  if (title) button.title = title;
  button.dataset.action = action;
  button.dataset.itemId = itemId;
  button.dataset.itemType = itemType;
  return button;
}

function applyScoreBadge(badge, score) {
  if (!badge || !score) return;
  badge.textContent = score;
  const color = score >= 80 ? 'success' : (score >= 50 ? 'warning' : 'danger');
  badge.classList.add(`border-${color}`, `text-${color}`);
  badge.classList.remove('d-none');
}

// ─── Source Display Helpers ──────────────────────────────────────

const CATEGORY_ICONS = {
  'Architecture': '\u{1F3D7}\uFE0F', 'Mathematical Models': '\u{1F9EE}',
  'Logic & Business Rules': '\u2699\uFE0F', 'UI & UX': '\u{1F3A8}',
  'Infrastructure & DevOps': '\u{1F433}', 'Security & Hygiene': '\u{1F510}',
  'Process & Meta': '\u{1F4CB}', 'integrations': '\u{1F50C}',
  'process': '\u{1F4CB}', 'architecture': '\u{1F3D7}\uFE0F',
  'components': '\u{1F9E9}', 'ui': '\u{1F3A8}', 'ux': '\u{1F3A8}',
};

function getCategoryIcon(category) {
  return CATEGORY_ICONS[category] || '\u{1F4C4}';
}

function normalizeCategoryLabel(raw) {
  if (!raw) return '';
  const value = String(raw).trim();
  return value.toLowerCase() === 'ui' ? 'UI & UX' : value;
}

function renderTypeIcons(types) {
  if (!types?.length) return '';
  return Array.from(new Set(types.filter(Boolean)))
    .map(type => {
      const label = normalizeCategoryLabel(type);
      return label ? `<span title="${label}">${getCategoryIcon(label)}</span>` : '';
    }).join('');
}

const SOURCE_TYPE_BADGES = {
  'official': 'bg-primary text-light',
  'llm-api': 'bg-warning text-dark',
  'github': 'bg-secondary text-light',
  'rss': 'bg-info text-dark',
  'docs': 'bg-success text-light',
};

function getSourceTypeBadgeClass(type) {
  return SOURCE_TYPE_BADGES[type] || 'bg-secondary-subtle text-secondary';
}

function splitSourceName(name) {
  if (!name || typeof name !== 'string') return { prefix: '', title: '' };
  const idx = name.indexOf(':');
  if (idx === -1) return { prefix: '', title: name.trim() };
  return { prefix: name.slice(0, idx + 1).trim(), title: name.slice(idx + 1).trim() };
}

function applySourceStatusStyle(el, status) {
  if (!el) return;
  el.classList.remove('border-success', 'text-success', 'border-secondary', 'text-secondary');
  if (status === 'Active') {
    el.classList.add('border-success', 'text-success');
  } else {
    el.classList.add('border-secondary', 'text-secondary');
  }
}

// ─── Item Metadata Extractors ────────────────────────────────────

function getItemSourceLabel(item) {
  return item.news_source || item.newsSource || item.sourceName || item.source_name
    || item.sourceTitle || item.feed || item.origin || '\u2014';
}

function getItemMasterLabel(item) {
  return item.master_llm || item.masterModel || item.model || '\u2014';
}

function getItemTypes(item) {
  const types = [];
  if (item.category) types.push(item.category);
  if (Array.isArray(item.tags)) types.push(...item.tags);
  return types;
}

// ─── Log Tab ─────────────────────────────────────────────────────

const LOG_EVENT_COLORS = {
  AGENT_TASK_DISPATCHED: 'bg-primary-subtle text-primary',
  AGENT_TASK_COMPLETED: 'bg-success-subtle text-success',
  AGENT_RECRUITED: 'bg-info-subtle text-info',
  AGENT_RECRUIT_REJECTED: 'bg-danger-subtle text-danger',
  LLM_CALL_SUCCESS: 'bg-success-subtle text-success',
  LLM_CALL_ERROR: 'bg-danger-subtle text-danger',
  LLM_FALLBACK_USED: 'bg-warning-subtle text-warning',
  SKILLS_BACKGROUND_SCAN_TRIGGERED: 'bg-info-subtle text-info',
  SCHEDULED_MAINTENANCE_RUN: 'bg-primary-subtle text-primary',
  INFRA_REGISTRY_RELOADED: 'bg-secondary-subtle text-secondary',
  MODEL_STATS_SAVED: 'bg-secondary-subtle text-secondary',
};

async function loadAgentLog() {
  showSpinner('log-spinner');
  setStatus('log-status', 'Загрузка...');
  const body = $('log-body');
  try {
    const data = await api.call('/api/agents/activity-log');
    const entries = data.entries || [];
    $('log-count').textContent = entries.length;

    if (!entries.length) {
      body.innerHTML = emptyRow('Лог пуст');
      setStatus('log-status', '');
      hideSpinner('log-spinner');
      return;
    }

    const tpl = $('tpl-log-row');
    const frag = document.createDocumentFragment();

    for (const entry of entries) {
      const row = tpl.content.cloneNode(true);

      // Time
      const ts = entry.ts || '';
      const timeStr = ts ? new Date(ts).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' }) : '—';
      setText(row, '.log-time', timeStr);

      // Event badge
      const event = entry.event || 'LOG';
      const badgeEl = row.querySelector('.log-event-badge');
      const colorClass = LOG_EVENT_COLORS[event] || 'bg-secondary-subtle text-secondary';
      badgeEl.className = `badge log-event-badge fw-normal ${colorClass}`;
      badgeEl.style.fontSize = '0.65rem';
      badgeEl.textContent = event.replace(/_/g, ' ').toLowerCase();

      // Event name
      setText(row, '.log-event-name', event);

      // Data
      const dataObj = entry.data || {};
      let dataStr = '';
      if (typeof dataObj === 'object' && dataObj !== null) {
        const parts = [];
        for (const [k, v] of Object.entries(dataObj)) {
          if (k === 'raw') { parts.push(String(v).substring(0, 200)); continue; }
          const val = typeof v === 'object' ? JSON.stringify(v).substring(0, 80) : String(v).substring(0, 80);
          parts.push(`${k}: ${val}`);
        }
        dataStr = parts.join(' | ');
      } else {
        dataStr = String(dataObj).substring(0, 300);
      }
      setText(row, '.log-event-data', dataStr);

      frag.appendChild(row);
    }

    body.innerHTML = '';
    body.appendChild(frag);
    setStatus('log-status', `${entries.length} events`);
  } catch (e) {
    const tpl = $('tpl-log-row');
    const frag = document.createDocumentFragment();
    for (const entry of FALLBACK_DATA.logs) {
      const row = tpl.content.cloneNode(true);
      const ts = entry.ts || '';
      const timeStr = ts ? new Date(ts).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' }) : '—';
      setText(row, '.log-time', timeStr);

      const event = entry.event || 'LOG';
      const badgeEl = row.querySelector('.log-event-badge');
      const colorClass = LOG_EVENT_COLORS[event] || 'bg-secondary-subtle text-secondary';
      badgeEl.className = `badge log-event-badge fw-normal ${colorClass}`;
      badgeEl.style.fontSize = '0.65rem';
      badgeEl.textContent = event.replace(/_/g, ' ').toLowerCase();
      setText(row, '.log-event-name', event);

      const parts = [];
      for (const [k, v] of Object.entries(entry.data || {})) {
        parts.push(`${k}: ${Array.isArray(v) ? JSON.stringify(v) : v}`);
      }
      setText(row, '.log-event-data', parts.join(' | '));
      frag.appendChild(row);
    }
    body.innerHTML = '';
    body.appendChild(frag);
    $('log-count').textContent = String(FALLBACK_LOG_TOTAL);
    setStatus('log-status', `${FALLBACK_LOG_TOTAL} events`);
  }
  hideSpinner('log-spinner');
}

async function runMaintenance() {
  showSpinner('log-spinner');
  setStatus('log-status', 'Запуск maintenance...');
  try {
    // Run skills scan + autonomous rotation in parallel
    const [skills, models] = await Promise.all([
      api.post('/api/skills/background-scan', {}).catch(e => ({ error: e.message })),
      api.post('/api/agents/rotate-autonomous', {}).catch(e => ({ error: e.message })),
    ]);
    setStatus('log-status', `Skills: ${skills.success ? 'OK' : 'ERR'} | Models: ${models.success ? 'OK' : 'ERR'}`);
    // Reload log after maintenance
    setTimeout(loadAgentLog, 2000);
  } catch (e) {
    setStatus('log-status', 'Error: ' + e.message);
  }
  hideSpinner('log-spinner');
}

