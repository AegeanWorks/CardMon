// ==========================================================================
// CARDMON - CAMPAIGN SEARCH
// Optional internet search through a keyed search API (Brave or SerpAPI).
// Without a configured key, search runs over the open campaign dataset that
// is already cached locally. We deliberately do not scrape search engines:
// their RSS/HTML terms prohibit product reuse.
// ==========================================================================

'use strict';

const DEFAULT_PROVIDER = 'brave';

function searchConfig(options = {}) {
  const env = options.env || (typeof process !== 'undefined' ? process.env : {});
  return {
    provider: options.provider || env.CARDMON_SEARCH_PROVIDER || DEFAULT_PROVIDER,
    apiKey: options.apiKey !== undefined ? options.apiKey : (env.CARDMON_SEARCH_API_KEY || '')
  };
}

function buildSearchUrl(provider, query, apiKey) {
  const q = encodeURIComponent(String(query || '').trim());
  if (provider === 'serpapi') {
    // hygiene: allow optional keyed search API endpoint (no key by default)
    return `https://serpapi.com/search.json?engine=google&q=${q}&api_key=${encodeURIComponent(apiKey)}`;
  }
  // hygiene: allow optional keyed search API endpoint (no key by default)
  return `https://api.search.brave.com/res/v1/web/search?q=${q}&count=10`;
}

function parseSearchResults(provider, payload) {
  if (provider === 'serpapi') {
    return (payload.organic_results || []).map((item) => ({
      title: item.title || '',
      url: item.link || '',
      snippet: item.snippet || '',
      source: (() => { try { return new URL(item.link || '').hostname; } catch (err) { return ''; } })()
    }));
  }
  const web = (payload && payload.web && payload.web.results) || [];
  return web.map((item) => ({
    title: item.title || '',
    url: item.url || '',
    snippet: item.description || '',
    source: (() => { try { return new URL(item.url || '').hostname; } catch (err) { return ''; } })()
  }));
}

function parseBankScope(raw) {
  return String(raw || '').split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((part) => {
      const pieces = part.split('|');
      return { name: (pieces[0] || '').trim(), id: (pieces[1] || '').trim() };
    })
    .filter((bank) => bank.name);
}

function localCampaignSearch(query, campaignData, limit = 12, bankIds = null, bankNames = null) {
  const needle = String(query || '').trim().toLocaleLowerCase('tr-TR');
  if (!needle || !campaignData) return [];
  const matches = [];
  for (const offer of campaignData.offers || []) {
    if (bankIds && bankIds.length && !bankIds.includes(offer.bankId)) continue;
    const haystack = [offer.bankName, offer.appName, offer.note, offer.product, offer.benefitLabel].join(' ').toLocaleLowerCase('tr-TR');
    if (haystack.includes(needle)) {
      matches.push({
        title: `${offer.bankName} · ${offer.appName} · ${offer.benefitLabel || `${offer.rate}%`}`,
        url: offer.sourceUrl || '',
        snippet: offer.note || offer.product || '',
        source: offer.bankName
      });
    }
  }
  for (const deal of campaignData.deals || []) {
    if (bankNames && bankNames.length && !bankNames.some((name) => String(deal.store || '').toLocaleLowerCase('tr-TR').includes(name.toLocaleLowerCase('tr-TR')))) continue;
    const haystack = [deal.title, deal.store, deal.price, deal.badge].join(' ').toLocaleLowerCase('tr-TR');
    if (haystack.includes(needle)) {
      matches.push({
        title: `${deal.title} · ${deal.price}`,
        url: deal.sourceUrl || '',
        snippet: `${deal.store} · ${deal.expires}`,
        source: deal.store
      });
    }
  }
  return matches.slice(0, limit);
}

async function searchWeb(query, options = {}) {
  const config = searchConfig(options);
  if (!config.apiKey) {
    return { mode: 'local', results: [], reason: 'No search API key configured (CARDMON_SEARCH_API_KEY).' };
  }
  const request = options.fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!request) throw new Error('fetch is not available');

  const headers = { Accept: 'application/json' };
  if (config.provider !== 'serpapi') headers['X-Subscription-Token'] = config.apiKey;
  const response = await request(buildSearchUrl(config.provider, query, config.apiKey), { headers });
  if (!response.ok) throw new Error(`Search API returned ${response.status}`);
  const payload = typeof response.json === 'function' ? await response.json() : response;
  return { mode: 'web', results: parseSearchResults(config.provider, payload) };
}

async function searchCampaigns(query, options = {}) {
  const banks = options.banks || [];
  if (banks.length) {
    const bankIds = banks.map((bank) => bank.id).filter(Boolean);
    const bankNames = banks.map((bank) => bank.name).filter(Boolean);
    const local = banks.flatMap((bank) => localCampaignSearch(
      query, options.campaignData, options.limit,
      bank.id ? [bank.id] : [], bank.id ? [] : [bank.name]
    ).map((result) => ({ ...result, bank: bank.name })));

    const webResults = [];
    let mode = 'local';
    let reason = '';
    try {
      for (const bank of banks.slice(0, 8)) {
        const bankQuery = `${bank.name} ${query || 'kredi kartı kampanya bonus indirim'}`.trim();
        const web = await searchWeb(bankQuery, options);
        mode = web.mode === 'web' ? 'web' : mode;
        reason = web.reason || reason;
        for (const result of web.results) webResults.push({ ...result, bank: bank.name });
      }
    } catch (err) {
      reason = err.message || String(err);
    }
    return {
      mode,
      banks: bankNames,
      results: [...webResults, ...local].slice(0, options.limit || 12),
      localCount: local.length,
      reason
    };
  }

  const local = localCampaignSearch(query, options.campaignData, options.limit);
  try {
    const web = await searchWeb(query, options);
    return {
      mode: web.mode,
      results: [...web.results, ...local].slice(0, options.limit || 12),
      localCount: local.length,
      reason: web.reason || ''
    };
  } catch (err) {
    return {
      mode: 'local',
      results: local.slice(0, options.limit || 12),
      localCount: local.length,
      reason: err.message || String(err)
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEFAULT_PROVIDER,
    searchConfig,
    buildSearchUrl,
    parseSearchResults,
    localCampaignSearch,
    parseBankScope,
    searchWeb,
    searchCampaigns
  };
}
