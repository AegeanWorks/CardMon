'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHarness } = require('./harness');

const ROOT = path.join(__dirname, '..');
const h = createHarness();

const offers = [
  { id: 'a', bankId: 'garanti-bbva', appName: 'Bonus', category: 'digital', rate: 50, limit: 100, benefitLabel: '%50', status: 'active_on_snapshot', endDate: '2026-12-31' },
  { id: 'b', bankId: 'is-bankasi', appName: 'Maximum', category: 'digital', rate: 10, limit: 0, benefitLabel: '%10', status: 'active_on_snapshot', endDate: '2026-12-31' },
  { id: 'c', bankId: 'garanti-bbva', appName: 'Old', category: 'digital', rate: 90, limit: 500, status: 'ended', endDate: '2025-01-01' }
];

const banks = [
  { id: 'b1', name: 'Garanti BBVA', presetKey: 'garanti' },
  { id: 'b2', name: 'Türkiye İş Bankası', presetKey: 'isbank' }
];

const cards = [
  { id: 'c1', bankId: 'b1', nickname: 'Bonus', limit: 100000, usedBalance: 20000 },
  { id: 'c2', bankId: 'b2', nickname: 'Maximum', limit: 60000, usedBalance: 10000 }
];

test('user banks map to campaign-feed bank ids', () => {
  assert.equal(h.campaignBankIdForBank(banks[0]), 'garanti-bbva');
  assert.equal(h.campaignBankIdForBank(banks[1]), 'is-bankasi');
  assert.equal(h.campaignBankIdForBank({ name: 'Akbank' }), 'akbank');
  assert.equal(h.campaignBankIdForBank(null), '');
});

test('estimateEarn respects the campaign cap', () => {
  assert.equal(h.estimateEarn(50, 100, 1000), 100);
  assert.equal(h.estimateEarn(10, 0, 1000), 100);
});

test('ended campaigns are excluded', () => {
  assert.equal(h.offerIsActive(offers[0], new Date(2026, 10, 22)), true);
  assert.equal(h.offerIsActive(offers[2], new Date(2026, 10, 22)), false);
});

test('benefit labels with TL amounts or percentages are parsed', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(h.benefitValue('800 TL'))), { kind: 'amount', value: 800 });
  assert.deepEqual(JSON.parse(JSON.stringify(h.benefitValue('%50'))), { kind: 'percent', value: 50 });
  assert.deepEqual(JSON.parse(JSON.stringify(h.benefitValue('1.000 TL'))), { kind: 'amount', value: 1000 });
});

test('campaignValueTry prefers fixed bonus amounts over percentage estimates', () => {
  const fixed = { rate: 10, limit: 100, benefitLabel: '800 TL' };
  assert.equal(h.campaignValueTry(fixed, 2000), 800);
  assert.equal(h.campaignValueTry({ rate: 50, limit: 100, benefitLabel: '%50' }, 2000), 100);
});

test('activeCampaigns and featuredDeals filter by category and recency', () => {
  // hygiene: allow synthetic fixture URLs, no network request is made
  const deals = [
    { id: 'd1', category: 'digital', title: 'Spotify %50', price: '%50', expires: '31 Aralık 2026', sourceUrl: 'https://example.com/d' }, // hygiene: allow synthetic fixture URL
    { id: 'd2', category: 'education', title: 'Course', price: '100 TL', sourceUrl: 'https://example.com/e' } // hygiene: allow synthetic fixture URL
  ];
  const active = h.activeCampaigns(offers, 'digital', 2000, 10, new Date(2026, 10, 22));
  assert.deepEqual(active.map((o) => o.id), ['b', 'a']);
  const featured = h.featuredDeals(deals, 'digital');
  assert.equal(featured.length, 1);
  assert.equal(featured[0].id, 'd1');
});

test('rankCardsForCategory picks the highest estimated earn', () => {
  const ranked = h.rankCardsForCategory({ cards, banks, offers, category: 'digital', spend: 2000 });
  assert.equal(ranked[0].card.nickname, 'Maximum');
  assert.equal(ranked[0].earn, 200);
  assert.equal(ranked[0].offer.id, 'b');
  assert.equal(ranked[1].card.nickname, 'Bonus');
  assert.equal(ranked[1].earn, 100);
});

test('categories with no campaigns return zero earn', () => {
  const ranked = h.rankCardsForCategory({ cards, banks, offers, category: 'education', spend: 1000 });
  assert.equal(ranked.length, 2);
  assert.ok(ranked.every((entry) => entry.earn === 0 && entry.offer === null));
});

test('fetchCampaigns reads the same-origin endpoint and caches it', async () => {
  let calls = 0;
  h.sandbox.fetch = async (url) => {
    calls += 1;
    assert.equal(url, '/api/campaigns');
    return { ok: true, status: 200, json: async () => ({ offers, snapshotDate: '2026-11-19' }) };
  };
  const first = await h.fetchCampaigns(true);
  const second = await h.fetchCampaigns();
  assert.equal(first.offers.length, 3);
  assert.equal(second.offers.length, 3);
  assert.equal(calls, 1);
});

test('campaign search uses the banks from the portfolio', async () => {
  assert.deepEqual(JSON.parse(JSON.stringify(h.userBankScope(banks))), [
    { name: 'Garanti BBVA', id: 'garanti-bbva' },
    { name: 'Türkiye İş Bankası', id: 'is-bankasi' }
  ]);
  h.sandbox.fetch = async (url) => {
    assert.match(url, /\/api\/campaign-search\?q=spotify/);
    assert.match(url, /banks=Garanti/);
    // hygiene: allow synthetic fixture URL
    return { ok: true, status: 200, json: async () => ({ mode: 'web', results: [{ title: 'Web result', url: 'https://bank.com/a', snippet: 'Bonus' }] }) };
  };
  const result = await h.searchCampaignsWeb('spotify', banks);
  assert.equal(result.mode, 'web');
  assert.equal(result.banks.length, 2);
  assert.equal(result.results.length, 1);
  assert.equal(h.getCampaignSearchResults().results[0].title, 'Web result');
});

test('campaign router is wired into the insights tab and dictionaries', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /src="js\/campaign-router.js"/);
  for (const key of ['campaignTitle', 'campaignCategory', 'campaignBest', 'catGroceries', 'catFuel']) {
    assert.ok(h.I18N.tr[key] && h.I18N.en[key], `missing key ${key}`);
  }
  const insights = fs.readFileSync(path.join(ROOT, 'js', 'money-insights.js'), 'utf8');
  assert.match(insights, /campaignResult/);
  assert.match(insights, /rankCardsForCategory/);
  const main = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');
  assert.match(main, /fetchCampaigns\(\)/);
  const serverIndex = fs.readFileSync(path.join(ROOT, 'server', 'index.js'), 'utf8');
  assert.match(serverIndex, /startCampaignPoller/);
});
