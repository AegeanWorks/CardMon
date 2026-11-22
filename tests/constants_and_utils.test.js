'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

test('fetchExchangeRates updates exchange rates on successful API response', async () => {
  const h = createHarness();
  let renderCalled = false;
  h.sandbox.renderAll = () => { renderCalled = true; };

  h.sandbox.fetch = async (url) => {
    assert.match(url, /open\.er-api\.com/);
    return {
      ok: true,
      json: async () => ({
        rates: {
          TRY: 35.5,
          EUR: 0.95,
          GBP: 0.80
        }
      })
    };
  };

  await h.fetchExchangeRates();

  assert.equal(h.exchangeRates.USD, 35.5);
  assert.equal(h.exchangeRates.EUR, parseFloat((35.5 / 0.95).toFixed(2)));
  assert.equal(h.exchangeRates.GBP, parseFloat((35.5 / 0.80).toFixed(2)));
  assert.equal(renderCalled, true);
});

test('fetchExchangeRates gracefully handles network errors without crashing', async () => {
  const h = createHarness();
  const originalRates = { ...h.exchangeRates };

  h.sandbox.fetch = async () => {
    throw new Error('Network offline');
  };

  await h.fetchExchangeRates();

  // Exchange rates should remain untouched
  assert.equal(h.exchangeRates.USD, originalRates.USD);
  assert.equal(h.exchangeRates.EUR, originalRates.EUR);
  assert.equal(h.exchangeRates.GBP, originalRates.GBP);
});

test('getDaysInCurrentMonth returns days count in 28-31 range', () => {
  const h = createHarness();
  const days = h.getDaysInCurrentMonth();
  assert.ok(typeof days === 'number');
  assert.ok(days >= 28 && days <= 31, `Days count ${days} is outside 28..31`);
});

test('getApproxDay maps approximate week keys to representative calendar days', () => {
  const h = createHarness();
  assert.equal(h.getApproxDay('week1'), 4);
  assert.equal(h.getApproxDay('week2'), 11);
  assert.equal(h.getApproxDay('week3'), 18);
  assert.equal(h.getApproxDay('week4'), 25);
  assert.equal(h.getApproxDay('weekMonthEnd'), 29);
  assert.equal(h.getApproxDay('unknownKey'), 15);
  assert.equal(h.getApproxDay(''), 15);
});

test('getUtilizationColor returns correct css variable according to utilization tier', () => {
  const h = createHarness();
  assert.equal(h.getUtilizationColor(0), 'var(--accent-emerald)');
  assert.equal(h.getUtilizationColor(30), 'var(--accent-emerald)');
  assert.equal(h.getUtilizationColor(30.1), 'var(--accent-amber)');
  assert.equal(h.getUtilizationColor(70), 'var(--accent-amber)');
  assert.equal(h.getUtilizationColor(70.1), 'var(--accent-rose)');
  assert.equal(h.getUtilizationColor(100), 'var(--accent-rose)');
});

test('getNetworkLogoSvg returns appropriate markup for credit card networks', () => {
  const h = createHarness();
  assert.match(h.getNetworkLogoSvg('Mastercard'), /svg/i);
  assert.match(h.getNetworkLogoSvg('Mastercard'), /#EB001B/);
  assert.match(h.getNetworkLogoSvg('Visa'), /VISA/);
  assert.match(h.getNetworkLogoSvg('Troy'), /TROY/);
  assert.match(h.getNetworkLogoSvg('Amex'), /AMEX/);
  assert.match(h.getNetworkLogoSvg('OtherNetwork'), /CARD/);
});

test('escapeHtml sanitizes html special characters and handles falsy input', () => {
  const h = createHarness();
  assert.equal(h.escapeHtml(null), '');
  assert.equal(h.escapeHtml(undefined), '');
  assert.equal(h.escapeHtml(''), '');
  assert.equal(h.escapeHtml('<script>alert("xss")&"test"</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&amp;&quot;test&quot;&lt;/script&gt;');
  assert.equal(h.escapeHtml(12345), '12345');
});

test('showToast creates toast notification in container', () => {
  const h = createHarness();
  const toastContainer = h.sandbox.document.getElementById('toastContainer');
  let appended = false;
  toastContainer.appendChild = (child) => {
    appended = true;
    assert.match(child.innerHTML, /Test Toast Message/);
    return child;
  };

  h.showToast('Test Toast Message');
  assert.equal(appended, true);
});

test('downloadText browser fallback encodes reserved characters in the data URL', () => {
  const h = createHarness();
  let href = '';
  const origCreate = h.sandbox.document.createElement;
  h.sandbox.document.createElement = (tag) => {
    const el = origCreate(tag);
    if (tag === 'a') {
      const origSetAttr = el.setAttribute;
      el.setAttribute = (key, value) => {
        if (key === 'href') href = value;
        origSetAttr(key, value);
      };
      el.click = () => {};
    }
    return el;
  };
  const payload = 'bank#1,card&2=3?4';

  h.downloadText('test.txt', payload, 'text/plain');

  assert.ok(href.startsWith('data:text/plain;charset=utf-8,'));
  assert.equal(decodeURIComponent(href.slice(href.indexOf(',') + 1)), payload);
  assert.ok(!href.includes('#1'), 'a literal # must not truncate the data URL payload');
});

test('turkishDaySuffix follows Turkish number suffix rules', () => {
  const h = createHarness();
  assert.equal(h.turkishDaySuffix(1), "'i");
  assert.equal(h.turkishDaySuffix(12), "'si");
  assert.equal(h.turkishDaySuffix(14), "'ü");
  assert.equal(h.turkishDaySuffix(20), "'si");
  assert.equal(h.turkishDaySuffix(28), "'i");
  assert.equal(h.turkishDaySuffix(30), "'u");
});
