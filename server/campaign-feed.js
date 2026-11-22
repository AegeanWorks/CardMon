// ==========================================================================
// CARDMON - CAMPAIGN FEED (server-side proxy + cache)
// Source: cashbackverenler.com open dataset (TÜİK/bank-sourced campaign rows
// with official links). The origin sends no CORS header, so the local server
// fetches it and exposes a same-origin endpoint to the web app.
// ==========================================================================

'use strict';

// hygiene: allow public open campaign dataset with graceful offline fallback
const CAMPAIGN_FEED_URL = 'https://www.cashbackverenler.com/api/veri.json';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

let cache = null;

function normalizeCampaignData(payload) {
  if (!payload || !Array.isArray(payload.offers)) throw new Error('Campaign feed has no offers');
  const apps = new Map((payload.apps || []).map((app) => [app.id, app]));
  const banks = new Map((payload.banks || []).map((bank) => [bank.id, bank]));
  const categories = (payload.categories || []).map((category) => ({ id: category.id, name: category.name }));

  const offers = payload.offers.map((offer) => {
    const app = apps.get(offer.appId) || {};
    const bank = banks.get(offer.bankId) || {};
    return {
      id: offer.id,
      bankId: offer.bankId,
      bankName: bank.name || offer.bankId,
      appId: offer.appId,
      appName: app.name || offer.appId,
      category: app.category || 'general',
      rate: Number(offer.rate) || 0,
      limit: Number(offer.limit) || 0,
      benefitType: offer.benefitType || '',
      benefitLabel: offer.benefitLabel || '',
      note: offer.note || '',
      product: offer.product || '',
      sourceUrl: offer.sourceUrl || '',
      endDate: offer.endDate || '',
      status: offer.status || '',
      verifiedAt: offer.verifiedAt || '',
      cardIds: Array.isArray(offer.cardIds) ? offer.cardIds : []
    };
  });

  const deals = (payload.deals || []).map((deal) => ({
    id: deal.id,
    title: deal.title || '',
    category: deal.category || 'general',
    store: deal.store || '',
    price: deal.price || '',
    oldPrice: deal.oldPrice || '',
    badge: deal.badge || '',
    expires: deal.expires || '',
    sourceUrl: deal.sourceUrl || ''
  }));

  return {
    snapshotDate: (payload.meta && payload.meta.snapshotDate) || '',
    generatedAt: (payload.meta && payload.meta.generatedAt) || '',
    sourceUrl: (payload.meta && payload.meta.methodologyUrl) || CAMPAIGN_FEED_URL,
    categories,
    offerCount: offers.length,
    offers,
    deals,
    dealCount: deals.length
  };
}

async function fetchCampaignData(fetchImpl, now = new Date()) {
  if (cache && (now.getTime() - cache.fetchedAt) < CACHE_TTL_MS) {
    return { ...cache.data, cached: true };
  }
  const request = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!request) throw new Error('fetch is not available');
  const options = { headers: { Accept: 'application/json' } };
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    options.signal = AbortSignal.timeout(10000);
  }
  const response = await request(CAMPAIGN_FEED_URL, options);
  if (!response.ok) throw new Error(`Campaign feed returned ${response.status}`);
  const payload = typeof response.json === 'function' ? await response.json() : response;
  const data = normalizeCampaignData(payload);
  cache = { data, fetchedAt: now.getTime() };
  return { ...data, cached: false };
}

function cachedCampaignData() {
  return cache ? { ...cache.data, cached: true } : null;
}

function resetCampaignCache() {
  cache = null;
}

function startCampaignPoller(options = {}) {
  const intervalMs = options.intervalMs || CACHE_TTL_MS;
  const fetchImpl = options.fetchImpl || null;
  const timer = options.timer || {
    setInterval: (fn, ms) => setInterval(fn, ms),
    clearInterval: (id) => clearInterval(id)
  };

  const refresh = () => fetchCampaignData(fetchImpl).catch((err) => {
    if (typeof options.onError === 'function') options.onError(err);
  });

  refresh();
  const handle = timer.setInterval(refresh, intervalMs);
  return function stopCampaignPoller() { timer.clearInterval(handle); };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CAMPAIGN_FEED_URL,
    CACHE_TTL_MS,
    normalizeCampaignData,
    fetchCampaignData,
    cachedCampaignData,
    resetCampaignCache,
    startCampaignPoller
  };
}
