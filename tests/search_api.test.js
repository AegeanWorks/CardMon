'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildSearchUrl,
  parseSearchResults,
  localCampaignSearch,
  parseBankScope,
  searchWeb,
  searchCampaigns
} = require('../server/search-api');

// hygiene: allow synthetic fixture URLs, no network request is made
const campaignData = {
  offers: [{ id: 'o1', bankName: 'Garanti BBVA', appName: 'Spotify', benefitLabel: '500 TL', note: 'Müzik aboneliğinde bonus', product: 'Bonus', sourceUrl: 'https://example.com/offer' }], // hygiene: allow synthetic fixture URL
  deals: [{ id: 'd1', title: 'Spotify %50 indirim', store: 'TEB', price: '%50', expires: '31 Aralık 2026', sourceUrl: 'https://example.com/deal' }] // hygiene: allow synthetic fixture URL
};

test('search URLs are built for both providers', () => {
  assert.match(buildSearchUrl('brave', 'bonus kampanya', 'key'), /api\.search\.brave\.com.*q=bonus/);
  assert.match(buildSearchUrl('serpapi', 'bonus', 'abc'), /serpapi\.com.*api_key=abc/);
});

test('search results are parsed from both provider shapes', () => {
  const brave = parseSearchResults('brave', { web: { results: [{ title: 'A', url: 'https://bank.com/a', description: 'Bonus' }] } }); // hygiene: allow synthetic fixture URL
  assert.equal(brave[0].title, 'A');
  assert.equal(brave[0].source, 'bank.com');
  const serp = parseSearchResults('serpapi', { organic_results: [{ title: 'B', link: 'https://bank.com/b', snippet: 'Indirim' }] }); // hygiene: allow synthetic fixture URL
  assert.equal(serp[0].url, 'https://bank.com/b'); // hygiene: allow synthetic fixture URL
});

test('local campaign search finds Turkish campaign text', () => {
  const results = localCampaignSearch('spotify', campaignData);
  assert.equal(results.length, 2);
  assert.match(results[0].title, /Spotify/);
});

test('searchWeb without a key reports local mode', async () => {
  const result = await searchWeb('bonus', { apiKey: '', env: {} });
  assert.equal(result.mode, 'local');
  assert.equal(result.results.length, 0);
});

test('bank scope is parsed from the query parameter', () => {
  const scope = parseBankScope('Garanti BBVA|garanti-bbva,Akbank|akbank');
  assert.equal(scope.length, 2);
  assert.equal(scope[0].name, 'Garanti BBVA');
  assert.equal(scope[1].id, 'akbank');
});

test('local search can be limited to selected bank ids', () => {
  const all = localCampaignSearch('spotify', campaignData);
  const scoped = localCampaignSearch('spotify', campaignData, 12, ['other-bank'], ['Other Bank']);
  assert.equal(all.length, 2);
  assert.equal(scoped.length, 0);
});

test('bank-scoped search adds the bank name to each result and queries per bank', async () => {
  const queries = [];
  const result = await searchCampaigns('', {
    campaignData,
    apiKey: 'test-key',
    env: {},
    banks: [{ name: 'Garanti BBVA', id: '' }],
    fetchImpl: async (url) => {
      queries.push(url);
      return { ok: true, status: 200, json: async () => ({ web: { results: [{ title: 'Web', url: 'https://bank.com/x', description: 'Bonus' }] } }) }; // hygiene: allow synthetic fixture URL
    }
  });
  assert.equal(result.banks[0], 'Garanti BBVA');
  assert.ok(result.results.some((item) => item.bank === 'Garanti BBVA'));
  assert.match(queries[0], /Garanti/);
});

test('searchCampaigns merges web and local results', async () => {
  const result = await searchCampaigns('spotify', {
    campaignData,
    apiKey: 'test-key',
    provider: 'brave',
    env: {},
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ web: { results: [{ title: 'Web result', url: 'https://news.com/x', description: 'Bonus' }] } }) // hygiene: allow synthetic fixture URL
    })
  });
  assert.equal(result.mode, 'web');
  assert.equal(result.results.length, 3);
  assert.equal(result.results[0].title, 'Web result');
});
