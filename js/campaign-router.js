// ==========================================================================
// CARDMON - BEST-CARD ROUTER
// Matches the user's cards against the server's campaign feed and estimates
// cashback/points value for a chosen spending category.
// ==========================================================================

'use strict';

let campaignCache = null;
let campaignSearchResults = null;

const BANK_ID_MAP = {
  garanti: 'garanti-bbva',
  isbank: 'is-bankasi',
  yapikredi: 'yapi-kredi',
  akbank: 'akbank',
  qnb: 'qnb',
  ziraat: 'ziraat-bankasi',
  vakifbank: 'vakifbank',
  halkbank: 'halkbank-paraf',
  denizbank: 'denizbank',
  enpara: 'enpara',
  teb: 'cepteteb',
  odeabank: 'odeabank',
  papara: 'papara',
  paycell: 'paycell',
  kuveytturk: 'kuveyt-turk',
  albaraka: 'albaraka',
  fibabanka: 'getirfinans'
};

const CATEGORY_MAP = {
  digital: ['digital'],
  shopping: ['shopping'],
  groceries: ['market'],
  travel: ['travel'],
  education: ['education'],
  fuel: ['general', 'market'],
  other: ['general']
};

async function fetchCampaigns(force = false) {
  if (campaignCache && !force) return campaignCache;
  try {
    const response = await fetch('/api/campaigns');
    const body = await response.json();
    if (!response.ok && !body.offers) throw new Error(body.error || `Request failed (${response.status})`);
    campaignCache = { offers: body.offers || [], deals: body.deals || [], snapshotDate: body.snapshotDate || '', error: body.error || '' };
  } catch (err) {
    campaignCache = { offers: [], deals: [], snapshotDate: '', error: err.message || String(err) };
  }
  return campaignCache;
}

function campaignBankIdForBank(bank) {
  if (!bank) return '';
  const preset = String(bank.presetKey || bank.preset || '');
  if (BANK_ID_MAP[preset]) return BANK_ID_MAP[preset];
  const name = String(bank.name || '').toLowerCase();
  const clues = [
    ['garanti', 'garanti-bbva'], ['iş bankası', 'is-bankasi'], ['is bankasi', 'is-bankasi'],
    ['yapı kredi', 'yapi-kredi'], ['yapi kredi', 'yapi-kredi'], ['akbank', 'akbank'],
    ['ziraat', 'ziraat-bankasi'], ['vakıf', 'vakifbank'], ['halkbank', 'halkbank-paraf'],
    ['denizbank', 'denizbank'], ['enpara', 'enpara'], ['qnb', 'qnb'], ['teb', 'cepteteb'],
    ['odea', 'odeabank'], ['papara', 'papara'], ['paycell', 'paycell']
  ];
  for (const [needle, id] of clues) {
    if (name.includes(needle)) return id;
  }
  return '';
}

function estimateEarn(rate, limit, spend) {
  const amount = Math.max(0, Number(spend) || 0);
  const gross = amount * (Math.max(0, Number(rate) || 0) / 100);
  const cap = Number(limit) || 0;
  return cap > 0 ? Math.min(gross, cap) : gross;
}

function offerIsActive(offer, now = new Date()) {
  if (offer.status && !String(offer.status).startsWith('active')) return false;
  if (!offer.endDate) return true;
  const end = new Date(offer.endDate);
  return !Number.isNaN(end.getTime()) && end >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function benefitValue(label) {
  const text = String(label || '').replace(/\./g, '').trim();
  const percent = text.match(/(\d+(?:[.,]\d+)?)\s*%|%\s*(\d+(?:[.,]\d+)?)/);
  if (percent) return { kind: 'percent', value: Number((percent[1] || percent[2]).replace(',', '.')) };
  const amount = text.match(/(\d+(?:[.,]\d+)?)\s*(?:TL|₺)/i);
  if (amount) return { kind: 'amount', value: Number(amount[1].replace(',', '.')) };
  return { kind: 'unknown', value: 0 };
}

function campaignValueTry(offer, spend) {
  const benefit = benefitValue(offer.benefitLabel);
  if (benefit.kind === 'amount') return benefit.value;
  return estimateEarn(offer.rate, offer.limit, spend);
}

function activeCampaigns(offers, category, spend, limitCount = 8, now = new Date()) {
  const categories = CATEGORY_MAP[category] || CATEGORY_MAP.other;
  return offers
    .filter((offer) => categories.includes(offer.category) && offerIsActive(offer, now))
    .sort((left, right) => campaignValueTry(right, spend) - campaignValueTry(left, spend))
    .slice(0, limitCount);
}

function featuredDeals(deals, category, limitCount = 8) {
  const categories = CATEGORY_MAP[category] || CATEGORY_MAP.other;
  return (deals || []).filter((deal) => categories.includes(deal.category)).slice(0, limitCount);
}

function userBankScope(banks) {
  return (banks || [])
    .map((bank) => ({ name: bank.name || '', id: campaignBankIdForBank(bank) }))
    .filter((bank) => bank.name);
}

async function searchCampaignsWeb(query, banks = []) {
  const q = String(query || '').trim() || 'kredi kartı kampanya bonus indirim';
  const scope = userBankScope(banks);
  if (!scope.length) return { mode: 'local', results: [], reason: 'no-banks', banks: [] };
  const bankParam = scope.map((bank) => `${bank.name}|${bank.id}`).join(',');
  try {
    const response = await fetch(`/api/campaign-search?q=${encodeURIComponent(q)}&banks=${encodeURIComponent(bankParam)}`);
    const body = await response.json();
    campaignSearchResults = { results: body.results || [], mode: body.mode || 'local', reason: body.reason || '', banks: body.banks || scope.map((bank) => bank.name) };
    return campaignSearchResults;
  } catch (err) {
    campaignSearchResults = { results: [], mode: 'local', reason: err.message || String(err), banks: scope.map((bank) => bank.name) };
    return campaignSearchResults;
  }
}

function getCampaignSearchResults() {
  return campaignSearchResults;
}

function rankCardsForCategory(options = {}) {
  const cards = options.cards || [];
  const banks = options.banks || [];
  const offers = options.offers || [];
  const categories = CATEGORY_MAP[options.category] || CATEGORY_MAP.other;
  const spend = Number(options.spend) || 0;

  const results = [];
  for (const card of cards) {
    const bank = banks.find((entry) => entry.id === card.bankId) || null;
    const feedBankId = campaignBankIdForBank(bank);
    const matching = offers
      .filter((offer) => offer.bankId === feedBankId && categories.includes(offer.category) && offerIsActive(offer))
      .sort((left, right) => estimateEarn(right.rate, right.limit, spend) - estimateEarn(left.rate, left.limit, spend));
    const best = matching[0] || null;
    results.push({
      card,
      bank,
      offer: best,
      rate: best ? best.rate : 0,
      earn: best ? estimateEarn(best.rate, best.limit, spend) : 0,
      offerCount: matching.length
    });
  }
  return results.sort((left, right) => right.earn - left.earn);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BANK_ID_MAP,
    CATEGORY_MAP,
    fetchCampaigns,
    campaignBankIdForBank,
    estimateEarn,
    offerIsActive,
    benefitValue,
    campaignValueTry,
    activeCampaigns,
    featuredDeals,
    userBankScope,
    searchCampaignsWeb,
    getCampaignSearchResults,
    rankCardsForCategory
  };
}
