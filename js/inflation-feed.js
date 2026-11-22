// ==========================================================================
// CARDMON - AUTOMATIC TURKISH INFLATION FEED
// Pulls TÜİK-derived CPI figures (monthly and annual change) from a public
// JSON feed and updates the FX/inflation assumptions once per day.
// ==========================================================================

'use strict';

// hygiene: allow public TÜİK-derived CPI JSON feed with graceful fallback
const INFLATION_FEED_URL = 'https://ortakalan.io/veri/api/enflasyon-yillara-gore.json';

let lastInflationError = '';
let lastInflationPayload = null;

function inflationFeedError() {
  return lastInflationError;
}

function getInflationPayload() {
  return lastInflationPayload;
}

const TR_MONTHS = {
  Ocak: 1, Şubat: 2, Mart: 3, Nisan: 4, Mayıs: 5, Haziran: 6,
  Temmuz: 7, Ağustos: 8, Eylül: 9, Ekim: 10, Kasım: 11, Aralık: 12
};

function periodSortKey(period) {
  const parts = String(period || '').trim().split(/\s+/);
  const month = TR_MONTHS[parts[0]] || 0;
  const year = Number(parts[1]) || 0;
  return year * 100 + month;
}

function latestRow(payload, seriesName) {
  const rows = (payload && payload.rows) || [];
  const matches = rows.filter((row) => row.seri === seriesName && Number.isFinite(Number(row.deger)));
  if (!matches.length) return null;
  return matches.reduce((best, row) => (periodSortKey(row.donem) > periodSortKey(best.donem) ? row : best));
}

function parseInflationFeed(payload) {
  const monthly = latestRow(payload, 'Aylık değişim (%)');
  const annual = latestRow(payload, 'Yıllık değişim (%)');
  if (!monthly || !annual) throw new Error('Inflation feed has no monthly or annual series');
  return {
    monthlyPct: Number(monthly.deger),
    annualPct: Number(annual.deger),
    period: monthly.donem,
    source: 'TÜİK',
    updatedAt: (payload && payload.updatedAt) || null
  };
}

async function fetchInflationData(fetchImpl) {
  const request = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!request) throw new Error('fetch is not available');
  const options = { headers: { Accept: 'application/json' } };
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    options.signal = AbortSignal.timeout(10000);
  }
  const response = await request(INFLATION_FEED_URL, options);
  if (!response.ok) throw new Error(`Inflation feed returned ${response.status}`);
  const payload = typeof response.json === 'function' ? await response.json() : response;
  lastInflationPayload = payload;
  return parseInflationFeed(payload);
}

function applyInflationData(data) {
  const settings = loadFxSettings();
  settings.monthlyInflationPct = data.monthlyPct;
  settings.annualInflationPct = data.annualPct;
  settings.inflationPeriod = data.period;
  settings.inflationUpdatedAt = new Date().toISOString();
  saveFxSettings(settings);
  return settings;
}

function shouldRefreshInflation(settings, now = new Date()) {
  if (!settings || settings.autoInflation === false) return false;
  if (!settings.inflationUpdatedAt) return true;
  const ageMs = now.getTime() - new Date(settings.inflationUpdatedAt).getTime();
  return !Number.isFinite(ageMs) || ageMs >= 24 * 60 * 60 * 1000;
}

async function autoRefreshInflation(force = false, fetchImpl) {
  const settings = loadFxSettings();
  if (!force && !shouldRefreshInflation(settings)) return { status: 'skipped' };
  try {
    const data = await fetchInflationData(fetchImpl);
    lastInflationError = '';
    applyInflationData(data);
    if (typeof renderMoneyInsights === 'function') renderMoneyInsights();
    if (typeof showToast === 'function') showToast(t('inflationUpdated'));
    return { status: 'ok', data };
  } catch (err) {
    lastInflationError = err.message || String(err);
    return { status: 'error', error: lastInflationError };
  }
}

function refreshInflationNow() {
  return autoRefreshInflation(true);
}

function setAutoInflationFromUi(checked) {
  const settings = loadFxSettings();
  settings.autoInflation = !!checked;
  saveFxSettings(settings);
  if (typeof renderMoneyInsights === 'function') renderMoneyInsights();
  return settings;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    INFLATION_FEED_URL,
    TR_MONTHS,
    periodSortKey,
    latestRow,
    parseInflationFeed,
    inflationFeedError,
    getInflationPayload,
    fetchInflationData,
    applyInflationData,
    shouldRefreshInflation,
    autoRefreshInflation,
    refreshInflationNow,
    setAutoInflationFromUi
  };
}
