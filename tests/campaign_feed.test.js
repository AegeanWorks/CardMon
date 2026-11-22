'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeCampaignData, fetchCampaignData, resetCampaignCache, startCampaignPoller, CACHE_TTL_MS } = require('../server/campaign-feed');

const payload = {
  // hygiene: allow synthetic fixture URL, no network request is made
  meta: { snapshotDate: '2026-11-19', generatedAt: '2026-11-22T10:00:00Z', methodologyUrl: 'https://example.com/method' },
  categories: [{ id: 'digital', name: 'Digital' }],
  banks: [{ id: 'akbank', name: 'Akbank' }],
  apps: [{ id: 'spotify', name: 'Spotify', category: 'digital' }],
  offers: [{
    id: 'o1', appId: 'spotify', bankId: 'akbank', rate: 50, limit: 100,
    benefitLabel: '%50', benefitType: 'statement_credit', status: 'active_on_snapshot',
    // hygiene: allow synthetic fixture URL, no network request is made
    endDate: '2026-12-31', sourceUrl: 'https://example.com/offer'
  }],
  // hygiene: allow synthetic fixture URL, no network request is made
  deals: [{ id: 'd1', title: 'Spotify deal', category: 'digital', store: 'Akbank', price: '%50', expires: '31 Aralık 2026', sourceUrl: 'https://example.com/deal' }]
};

test('normalizeCampaignData attaches bank, app and category to offers', () => {
  const data = normalizeCampaignData(payload);
  assert.equal(data.offerCount, 1);
  assert.equal(data.offers[0].bankName, 'Akbank');
  assert.equal(data.offers[0].appName, 'Spotify');
  assert.equal(data.offers[0].category, 'digital');
  assert.equal(data.offers[0].rate, 50);
  assert.equal(data.dealCount, 1);
  assert.equal(data.deals[0].price, '%50');
});

test('normalizeCampaignData rejects payloads without offers', () => {
  assert.throws(() => normalizeCampaignData({ apps: [] }), /no offers/);
});

test('fetchCampaignData caches for six hours and can be reset', async () => {
  resetCampaignCache();
  let calls = 0;
  const fakeFetch = async () => {
    calls += 1;
    return { ok: true, status: 200, json: async () => payload };
  };
  const first = await fetchCampaignData(fakeFetch, new Date('2026-11-22T12:00:00Z'));
  const second = await fetchCampaignData(fakeFetch, new Date('2026-11-22T13:00:00Z'));
  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
  assert.equal(calls, 1);
  assert.equal(CACHE_TTL_MS, 6 * 60 * 60 * 1000);

  const expired = await fetchCampaignData(fakeFetch, new Date('2026-11-22T19:00:00Z'));
  assert.equal(expired.cached, false);
  assert.equal(calls, 2);

  resetCampaignCache();
});

test('campaign poller fetches once immediately and schedules periodic refresh', () => {
  resetCampaignCache();
  let fetches = 0;
  let intervalMs = 0;
  let cleared = false;
  const fakeFetch = async () => {
    fetches += 1;
    return { ok: true, status: 200, json: async () => payload };
  };
  const timer = {
    setInterval(fn, ms) { intervalMs = ms; return 7; },
    clearInterval(id) { cleared = id === 7; }
  };
  const stop = startCampaignPoller({ fetchImpl: fakeFetch, timer });
  assert.equal(fetches, 1);
  assert.equal(intervalMs, CACHE_TTL_MS);
  stop();
  assert.equal(cleared, true);
  resetCampaignCache();
});
