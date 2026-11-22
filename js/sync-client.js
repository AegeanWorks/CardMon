// ==========================================================================
// CARDMON - LOCAL SYNC CLIENT (web app <-> CardMon sync server / Android)
// Uses the same .cardmon-compatible payload as the file system engine.
// ==========================================================================

const SYNC_STORAGE_KEY = 'cardmon_sync_settings_v1'; // aikit:allow-secret -- localStorage key name, not a credential

const syncConfig = {
  baseUrl: '',
  token: '',
  autoSync: false,
  lastSyncedRevision: 0,
  localDirty: false
};

let syncInProgress = false;
let syncDebounceTimer = null;
let apkPollTimer = null;

function loadSyncSettings() {
  try {
    const raw = localStorage.getItem(SYNC_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    syncConfig.baseUrl = typeof parsed.baseUrl === 'string' ? parsed.baseUrl : '';
    syncConfig.token = typeof parsed.token === 'string' ? parsed.token : '';
    syncConfig.autoSync = !!parsed.autoSync;
    syncConfig.lastSyncedRevision = Number(parsed.lastSyncedRevision) || 0;
  } catch (err) {
    console.warn('Sync settings could not be loaded:', err);
  }
}

function saveSyncSettings() {
  try {
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify({
      baseUrl: syncConfig.baseUrl,
      token: syncConfig.token,
      autoSync: syncConfig.autoSync,
      lastSyncedRevision: syncConfig.lastSyncedRevision
    }));
  } catch (err) {
    console.warn('Sync settings could not be saved:', err);
  }
}

function resolveSyncBaseUrl() {
  if (syncConfig.baseUrl) return syncConfig.baseUrl.replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location && /^https?:$/.test(window.location.protocol || '')) {
    return window.location.origin;
  }
  return 'http://localhost:8765';
}

function syncHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (syncConfig.token) headers['X-CardMon-Token'] = syncConfig.token;
  return headers;
}

async function syncRequest(endpoint, options = {}) {
  const url = `${resolveSyncBaseUrl()}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: { ...syncHeaders(), ...(options.headers || {}) }
  });
  let body = {};
  try { body = await response.json(); } catch { /* empty response */ }
  if (!response.ok) {
    const err = new Error(body.error || `Request failed (${response.status})`);
    err.status = response.status;
    err.body = body;
    throw err;
  }
  return body;
}

function currentPortfolioData() {
  const envelope = JSON.parse(serializePortfolio(state));
  return envelope.data;
}

async function checkSyncConnection() {
  const health = await syncRequest('/api/health');
  const info = await syncRequest('/api/sync/info');
  return { health, info };
}

async function pullFromServer() {
  syncInProgress = true;
  try {
    const remote = await syncRequest('/api/portfolio');
    const validation = validatePortfolioData(remote.portfolio);
    if (!validation.valid) throw new Error(validation.error || 'Invalid remote portfolio');
    applyPortfolioData(validation.data);
    syncConfig.lastSyncedRevision = remote.revision;
    syncConfig.localDirty = false;
    saveSyncSettings();
    return { ok: true, revision: remote.revision };
  } finally {
    syncInProgress = false;
  }
}

async function pushToServer(force = false) {
  syncInProgress = true;
  try {
    const body = { portfolio: currentPortfolioData() };
    if (!force) body.baseRevision = syncConfig.lastSyncedRevision;
    const result = await syncRequest('/api/portfolio', { method: 'PUT', body: JSON.stringify(body) });
    syncConfig.lastSyncedRevision = result.revision;
    syncConfig.localDirty = false;
    saveSyncSettings();
    return { ok: true, revision: result.revision };
  } finally {
    syncInProgress = false;
  }
}

async function smartSync() {
  if (syncInProgress) return { ok: false, reason: 'sync-in-progress' };
  syncInProgress = true;
  try {
    const health = await syncRequest('/api/health');
    if (!health.hasData) {
      syncInProgress = false;
      const pushed = await pushToServer(true);
      return { ...pushed, action: 'pushed-initial' };
    }
    const remote = await syncRequest('/api/portfolio');
    if (remote.revision > syncConfig.lastSyncedRevision) {
      if (syncConfig.localDirty) {
        return { ok: false, action: 'conflict', remoteRevision: remote.revision };
      }
      const validation = validatePortfolioData(remote.portfolio);
      if (!validation.valid) throw new Error(validation.error || 'Invalid remote portfolio');
      applyPortfolioData(validation.data);
      syncConfig.lastSyncedRevision = remote.revision;
      syncConfig.localDirty = false;
      saveSyncSettings();
      return { ok: true, action: 'pulled', revision: remote.revision };
    }
    if (syncConfig.localDirty) {
      syncInProgress = false;
      const pushed = await pushToServer();
      return { ...pushed, action: 'pushed' };
    }
    return { ok: true, action: 'up-to-date', revision: remote.revision };
  } finally {
    syncInProgress = false;
  }
}

function onLocalDataChanged() {
  syncConfig.localDirty = true;
  if (!syncConfig.autoSync || syncInProgress) return;
  clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    smartSync().catch((err) => updateSyncStatus(err.message, 'error'));
  }, 1500);
}

function updateSyncStatus(message, kind = 'info') {
  const text = document.getElementById('syncStatusText');
  if (text) text.textContent = message;
  const dot = document.getElementById('syncStatusDot');
  if (dot) dot.className = `sync-status-dot ${kind}`;
}

function renderSyncModal() {
  const urlInput = document.getElementById('syncServerUrl');
  const tokenInput = document.getElementById('syncToken');
  const autoInput = document.getElementById('syncAuto');
  if (urlInput) urlInput.value = syncConfig.baseUrl || resolveSyncBaseUrl();
  if (tokenInput) tokenInput.value = syncConfig.token;
  if (autoInput) autoInput.checked = syncConfig.autoSync;
  const revision = document.getElementById('syncRevision');
  if (revision) revision.textContent = String(syncConfig.lastSyncedRevision || 0);
}

function openSyncModal() {
  renderSyncModal();
  const modal = document.getElementById('syncModalOverlay');
  if (modal) modal.classList.add('active');
}

function closeSyncModal() {
  const modal = document.getElementById('syncModalOverlay');
  if (modal) modal.classList.remove('active');
}

function saveSyncSettingsFromForm() {
  const urlInput = document.getElementById('syncServerUrl');
  const tokenInput = document.getElementById('syncToken');
  const autoInput = document.getElementById('syncAuto');
  if (urlInput) syncConfig.baseUrl = urlInput.value.trim().replace(/\/+$/, '');
  if (tokenInput) syncConfig.token = tokenInput.value.trim();
  if (autoInput) syncConfig.autoSync = !!autoInput.checked;
  saveSyncSettings();
  updateSyncStatus(t('syncSettingsSaved'), 'ok');
}

async function testSyncConnection() {
  saveSyncSettingsFromForm();
  try {
    const { health, info } = await checkSyncConnection();
    const addresses = (info.addresses || []).map((a) => `${a.address}`).join(', ');
    updateSyncStatus(`${t('syncConnected')} · rev ${health.revision} · ${addresses || resolveSyncBaseUrl()}`, 'ok');
    showToast(`✅ ${t('syncConnected')}`);
    return true;
  } catch (err) {
    updateSyncStatus(`${t('syncFailed')}: ${err.message}`, 'error');
    return false;
  }
}

async function pullFromServerUi() {
  saveSyncSettingsFromForm();
  try {
    const result = await pullFromServer();
    updateSyncStatus(`${t('syncPulled')} · rev ${result.revision}`, 'ok');
    showToast(`📂 ${t('syncPulled')}`);
  } catch (err) {
    updateSyncStatus(`${t('syncFailed')}: ${err.message}`, 'error');
  }
}

async function pushToServerUi(force = false) {
  saveSyncSettingsFromForm();
  try {
    const result = await pushToServer(force);
    updateSyncStatus(`${t('syncPushed')} · rev ${result.revision}`, 'ok');
    showToast(`☁️ ${t('syncPushed')}`);
  } catch (err) {
    if (err.status === 409) updateSyncStatus(`${t('syncConflict')} — ${t('syncForcePushHint')}`, 'error');
    else updateSyncStatus(`${t('syncFailed')}: ${err.message}`, 'error');
  }
}

async function forcePushToServerUi() {
  await pushToServerUi(true);
}

function apkBuildStatusText(job) {
  if (!job) return '';
  if (job.state === 'running') return t('buildApkRunning');
  if (job.state === 'succeeded') return `${t('buildApkDone')} (${job.size || 0} bytes)`;
  if (job.state === 'failed') return `${t('buildApkFailed')}: ${job.log || ''}`.slice(0, 240);
  return job.state;
}

async function pollApkBuild() {
  clearTimeout(apkPollTimer);
  try {
    const job = await syncRequest('/api/build-apk/status');
    const el = document.getElementById('apkBuildStatus');
    if (el) el.textContent = apkBuildStatusText(job);
    const link = document.getElementById('apkDownloadLink');
    if (link) link.style.display = job.state === 'succeeded' ? 'inline-flex' : 'none';
    if (job.state === 'running') {
      apkPollTimer = setTimeout(pollApkBuild, 2000);
    }
  } catch (err) {
    const el = document.getElementById('apkBuildStatus');
    if (el) el.textContent = `${t('buildApkFailed')}: ${err.message}`;
  }
}

async function requestApkBuild() {
  saveSyncSettingsFromForm();
  try {
    const res = await syncRequest('/api/build-apk', { method: 'POST', body: JSON.stringify({ offline: true }) });
    const el = document.getElementById('apkBuildStatus');
    if (el) el.textContent = res.accepted ? `${t('buildApkRunning')} #${res.job.jobId}` : (res.reason || t('buildApkFailed'));
    if (res.accepted) pollApkBuild();
  } catch (err) {
    const el = document.getElementById('apkBuildStatus');
    if (el) el.textContent = `${t('buildApkFailed')}: ${err.message}`;
  }
}

function downloadBuiltApk() {
  const link = document.createElement('a');
  link.href = `${resolveSyncBaseUrl()}/api/build-apk/download`;
  link.download = 'cardmon-debug.apk';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function initSyncClient() {
  loadSyncSettings();
  updateSyncStatus(syncConfig.baseUrl ? t('syncReady') : t('syncIdle'), 'info');
}

if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSyncClient);
  } else {
    initSyncClient();
  }
}
