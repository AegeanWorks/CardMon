// ==========================================================================
// CARDMON - FX & INFLATION VIEW
// Shows the real (inflation-adjusted) value of debt and recurring FX exposure.
// All figures are local estimates driven by user-supplied assumptions.
// ==========================================================================

'use strict';

const FX_SETTINGS_KEY = 'cardmon_fx_settings_v1'; // aikit:allow-secret -- localStorage key name, not a credential

const DEFAULT_FX_SETTINGS = {
  monthlyInflationPct: 3,
  months: 12,
  shockPct: 10,
  autoInflation: true,
  annualInflationPct: 0,
  inflationPeriod: '',
  inflationUpdatedAt: ''
};

function loadFxSettings() {
  try {
    const raw = localStorage.getItem(FX_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_FX_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      monthlyInflationPct: Number(parsed.monthlyInflationPct) || DEFAULT_FX_SETTINGS.monthlyInflationPct,
      months: Number(parsed.months) || DEFAULT_FX_SETTINGS.months,
      shockPct: Number(parsed.shockPct) || DEFAULT_FX_SETTINGS.shockPct,
      autoInflation: parsed.autoInflation !== false,
      annualInflationPct: Number(parsed.annualInflationPct) || 0,
      inflationPeriod: String(parsed.inflationPeriod || ''),
      inflationUpdatedAt: String(parsed.inflationUpdatedAt || '')
    };
  } catch (err) {
    return { ...DEFAULT_FX_SETTINGS };
  }
}

function saveFxSettings(settings) {
  try {
    localStorage.setItem(FX_SETTINGS_KEY, JSON.stringify({
      monthlyInflationPct: Number(settings.monthlyInflationPct) || 0,
      months: Number(settings.months) || 0,
      shockPct: Number(settings.shockPct) || 0,
      autoInflation: settings.autoInflation !== false,
      annualInflationPct: Number(settings.annualInflationPct) || 0,
      inflationPeriod: String(settings.inflationPeriod || ''),
      inflationUpdatedAt: String(settings.inflationUpdatedAt || '')
    }));
  } catch (err) {
    /* optional persistence */
  }
}

function totalPortfolioDebt(stateObj) {
  const cards = (stateObj && stateObj.cards) || [];
  const loans = (stateObj && stateObj.loans) || [];
  const cardDebt = cards.reduce((sum, card) => sum + (Number(card.usedBalance) || 0), 0);
  const loanDebt = loans.reduce((sum, loan) => {
    const remaining = Math.max(0, (Number(loan.totalInstallments) || 0) - (Number(loan.paidInstallments) || 0));
    return sum + remaining * (Number(loan.monthlyPayment) || 0);
  }, 0);
  return cardDebt + loanDebt;
}

function inflationAdjusted(nominal, monthlyPct, months) {
  const amount = Number(nominal) || 0;
  const rate = (Number(monthlyPct) || 0) / 100;
  const count = Math.max(0, Math.round(Number(months) || 0));
  const real = amount / Math.pow(1 + rate, count);
  const erosion = amount - real;
  return {
    nominal: amount,
    real,
    erosion,
    erosionPct: amount > 0 ? (erosion / amount) * 100 : 0,
    monthlyPct: rate * 100,
    months: count
  };
}

function monthlyAmount(subscription) {
  const amount = Number(subscription.amount) || 0;
  return subscription.cycle === 'yearly' ? amount / 12 : amount;
}

function fxExposure(subscriptions, rates) {
  const groups = {};
  for (const subscription of subscriptions || []) {
    const currency = subscription.currency || 'TRY';
    groups[currency] = (groups[currency] || 0) + monthlyAmount(subscription);
  }
  const entries = Object.keys(groups).map((currency) => {
    const original = groups[currency];
    const rate = currency === 'TRY' ? 1 : ((rates && Number(rates[currency])) || 1);
    return { currency, original, rate, tryAmount: original * rate };
  });
  const totalTry = entries.reduce((sum, entry) => sum + entry.tryAmount, 0);
  const fxTry = entries
    .filter((entry) => entry.currency !== 'TRY')
    .reduce((sum, entry) => sum + entry.tryAmount, 0);
  return { entries, totalTry, fxTry, fxSharePct: totalTry > 0 ? (fxTry / totalTry) * 100 : 0 };
}

function fxScenario(totalTry, shockPct) {
  const base = Number(totalTry) || 0;
  const shock = (Number(shockPct) || 0) / 100;
  const shocked = base * (1 + shock);
  return { base, shocked, delta: shocked - base, shockPct: shock * 100 };
}

function fxAlerts(exposure, monthlyIncome) {
  const alerts = [];
  const income = Number(monthlyIncome) || 0;
  if (exposure.fxTry > 0) {
    alerts.push({ kind: 'info', code: 'fxShare', value: exposure.fxSharePct });
  }
  if (income > 0 && exposure.fxTry / income > 0.15) {
    alerts.push({ kind: 'warning', code: 'fxIncome', value: (exposure.fxTry / income) * 100 });
  }
  return alerts;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FX_SETTINGS_KEY,
    DEFAULT_FX_SETTINGS,
    loadFxSettings,
    saveFxSettings,
    totalPortfolioDebt,
    inflationAdjusted,
    monthlyAmount,
    fxExposure,
    fxScenario,
    fxAlerts
  };
}
