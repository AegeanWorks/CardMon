'use strict';

// Failing-first regressions: health-score captions must not call a high
// utilization "safe" just because the cash-flow burden is high.

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

function caption(harness, util, burden) {
  harness.evalInContext(`renderHealthScoreWidget(${util}, ${util * 100}, 10000, 0, ${burden})`);
  return harness.sandbox.document.getElementById('healthScoreCaption').textContent;
}

test('critical burden with high utilization does not claim utilization is safe', () => {
  const harness = createHarness();
  const text = caption(harness, 80, 70);
  assert.ok(!text.includes('güvenli olsa da'), `caption must not call 80% utilization safe: ${text}`);
  assert.ok(text.includes('yüksek seviyede'), `caption should describe high utilization: ${text}`);
});

test('warning burden with high utilization does not claim utilization is safe', () => {
  const harness = createHarness();
  const text = caption(harness, 80, 50);
  assert.ok(!text.includes('güvenli olsa da'), `caption must not call 80% utilization safe: ${text}`);
  assert.ok(text.includes('yüksek seviyede'), `caption should describe high utilization: ${text}`);
});

test('card-face minimum payment uses the same high-limit ratio as the banner', () => {
  const harness = createHarness();
  const state = harness.getState();
  state.banks = [{ id: 'b1', name: 'Bank' }];
  state.cards = [{ id: 'c1', bankId: 'b1', nickname: 'HighLimit', limit: 50000, usedBalance: 10000, dateMethod: 'exact', cutoffDay: 20, dueDay: 25 }];
  harness.evalInContext('renderCardsView()');
  const html = harness.sandbox.document.getElementById('cardsContainer').innerHTML;
  assert.ok(html.includes('%40'), 'card face must use the 40% high-limit fallback');
  assert.ok(html.includes('Asgari Yükü'), 'portfolio banner must be present');
  assert.ok(!html.includes('%20'), 'card face must not use the 20% low-limit fallback');
});

test('burden captions still call genuinely low utilization safe', () => {
  const harness = createHarness();
  const critical = caption(harness, 20, 70);
  const warning = caption(harness, 20, 50);
  assert.ok(critical.includes('güvenli olsa da'), `low utilization should be called safe: ${critical}`);
  assert.ok(warning.includes('güvenli olsa da'), `low utilization should be called safe: ${warning}`);
});
