// ==========================================================================
// CARDMON - STANDALONE APK PAGE LOGIC
// Powers apk.html so a phone browser can build and download the APK directly
// from the local server link, without opening the full portfolio interface.
// ==========================================================================

const APK_TOKEN_KEY = 'cardmon_apk_token';

const apkUi = {
  job: null,
  polling: null,
  busy: false
};

function apkElement(id) {
  return typeof document !== 'undefined' ? document.getElementById(id) : null;
}

function apkLoadToken() {
  try {
    return localStorage.getItem(APK_TOKEN_KEY) || '';
  } catch (err) {
    return '';
  }
}

function apkSaveToken(token) {
  try {
    localStorage.setItem(APK_TOKEN_KEY, token);
  } catch (err) {
    /* storage is optional */
  }
}

function apkHeaders() {
  const token = apkLoadToken();
  return token ? { 'X-CardMon-Token': token } : {};
}

async function apkApi(endpoint, options = {}) {
  const response = await fetch(endpoint, {
    ...options,
    headers: { ...apkHeaders(), ...(options.headers || {}) }
  });
  let body = {};
  try { body = await response.json(); } catch (err) { /* empty response */ }
  if (!response.ok) {
    const error = new Error(body.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return body;
}

function apkStatusMessage(job) {
  if (!job) return 'Ready — tap Build APK';
  if (job.state === 'running') return 'Building APK...';
  if (job.state === 'succeeded') return `APK ready · ${job.size || 0} bytes`;
  if (job.state === 'failed') return 'Build failed';
  return job.state;
}

function apkRender() {
  const job = apkUi.job;
  const status = apkElement('apkStatus');
  if (status) status.textContent = apkStatusMessage(job);

  const progress = apkElement('apkProgress');
  if (progress) progress.style.display = job && job.state === 'running' ? 'block' : 'none';

  const result = apkElement('apkResult');
  if (result) result.style.display = job && job.state === 'succeeded' ? 'block' : 'none';

  const errorBox = apkElement('apkError');
  if (errorBox) {
    errorBox.style.display = job && job.state === 'failed' ? 'block' : 'none';
    if (job && job.state === 'failed' && job.log) {
      errorBox.textContent = `Why: APK build failed. Fix: ${job.log}`.slice(0, 800);
    }
  }

  const buildBtn = apkElement('apkBuildBtn');
  if (buildBtn) buildBtn.disabled = apkUi.busy || !!(job && job.state === 'running');
}

function apkStopPolling() {
  if (apkUi.polling) {
    clearTimeout(apkUi.polling);
    apkUi.polling = null;
  }
}

function apkSchedulePoll() {
  apkStopPolling();
  apkUi.polling = setTimeout(() => {
    apkRefreshStatus();
  }, 1500);
}

async function apkRefreshStatus() {
  try {
    apkUi.job = await apkApi('/api/build-apk/status');
    if (apkUi.job.state === 'running') {
      apkSchedulePoll();
    } else {
      apkStopPolling();
      apkUi.busy = false;
    }
  } catch (err) {
    apkUi.busy = false;
    apkUi.job = { state: 'failed', log: err.message };
    apkStopPolling();
  }
  apkRender();
}

async function apkStartBuild() {
  const tokenInput = apkElement('apkToken');
  if (tokenInput) {
    apkSaveToken(tokenInput.value.trim());
  }
  apkUi.busy = true;
  apkUi.job = { state: 'running', jobId: null };
  apkRender();
  try {
    const result = await apkApi('/api/build-apk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offline: true })
    });
    if (result.accepted) {
      apkUi.job = result.job;
      apkSchedulePoll();
    } else {
      apkUi.busy = false;
      apkUi.job = { state: 'failed', log: result.reason || 'Build was not started' };
    }
  } catch (err) {
    apkUi.busy = false;
    apkUi.job = { state: 'failed', log: err.message };
  }
  apkRender();
}

async function apkDownload() {
  try {
    const response = await fetch('/api/build-apk/download', { headers: apkHeaders() });
    if (!response.ok) throw new Error(`Download failed (${response.status})`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cardmon-debug.apk';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    apkUi.job = { state: 'failed', log: err.message };
    apkRender();
  }
}

function apkInit() {
  const origin = apkElement('apkServer');
  if (origin && typeof location !== 'undefined') origin.textContent = location.origin;
  const tokenInput = apkElement('apkToken');
  if (tokenInput) tokenInput.value = apkLoadToken();
  apkRender();
  apkRefreshStatus();
}

if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apkInit);
  } else {
    apkInit();
  }
}
