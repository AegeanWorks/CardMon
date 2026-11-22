// ==========================================================================
// CARDMON - LOCAL SYNC STORE
// Atomic, revisioned JSON persistence for the Android/local sync server.
// Zero third-party dependencies. Runs on Node >= 20.
// ==========================================================================

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const STORE_VERSION = 1;
const STORE_FILE = 'portfolio.json';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function storePath(dataDir) {
  return path.join(dataDir, STORE_FILE);
}

function emptyStore() {
  return { version: STORE_VERSION, revision: 0, updatedAt: null, portfolio: null };
}

function readStore(dataDir) {
  ensureDir(dataDir);
  const file = storePath(dataDir);
  if (!fs.existsSync(file)) return emptyStore();
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!raw || raw.version !== STORE_VERSION || typeof raw.revision !== 'number') {
      return emptyStore();
    }
    return {
      version: STORE_VERSION,
      revision: raw.revision,
      updatedAt: raw.updatedAt || null,
      portfolio: raw.portfolio || null
    };
  } catch (err) {
    // A corrupt store never crashes the server; quarantine it for recovery.
    const bad = path.join(dataDir, `${STORE_FILE}.corrupt-${Date.now()}`);
    try { fs.renameSync(file, bad); } catch { /* best effort */ }
    return emptyStore();
  }
}

function writeStore(dataDir, store) {
  ensureDir(dataDir);
  const file = storePath(dataDir);
  const tmp = path.join(dataDir, `.${STORE_FILE}.tmp`);
  const payload = {
    version: STORE_VERSION,
    revision: store.revision,
    updatedAt: new Date().toISOString(),
    portfolio: store.portfolio
  };
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
  fs.renameSync(tmp, file);
  return payload;
}

function validatePortfolio(portfolio) {
  if (!portfolio || typeof portfolio !== 'object' || Array.isArray(portfolio)) {
    return { valid: false, error: 'Portfolio must be an object' };
  }
  for (const key of ['banks', 'cards', 'loans', 'cashSubscriptions']) {
    if (portfolio[key] !== undefined && !Array.isArray(portfolio[key])) {
      return { valid: false, error: `${key} must be an array` };
    }
  }
  if (portfolio.profile !== undefined &&
      (portfolio.profile === null || typeof portfolio.profile !== 'object' || Array.isArray(portfolio.profile))) {
    return { valid: false, error: 'profile must be an object' };
  }
  return { valid: true };
}

function getPortfolio(dataDir) {
  return readStore(dataDir);
}

function putPortfolio(dataDir, portfolio, options = {}) {
  const validation = validatePortfolio(portfolio);
  if (!validation.valid) {
    return { ok: false, status: 400, error: validation.error };
  }
  const current = readStore(dataDir);
  if (typeof options.baseRevision === 'number' && options.baseRevision !== current.revision) {
    return {
      ok: false,
      status: 409,
      error: 'Conflict: server has a newer revision',
      current
    };
  }
  const next = writeStore(dataDir, { revision: current.revision + 1, portfolio });
  return { ok: true, status: 200, revision: next.revision, updatedAt: next.updatedAt };
}

function resetStore(dataDir) {
  ensureDir(dataDir);
  const file = storePath(dataDir);
  if (fs.existsSync(file)) fs.rmSync(file, { force: true });
  return emptyStore();
}

module.exports = {
  STORE_VERSION,
  STORE_FILE,
  ensureDir,
  readStore,
  writeStore,
  validatePortfolio,
  getPortfolio,
  putPortfolio,
  resetStore
};
