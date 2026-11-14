'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const CSS_PATH = path.join(__dirname, '..', 'styles.css');

test('index.html structure has valid doctype, meta tags, and script tags', () => {
  assert.ok(fs.existsSync(HTML_PATH), 'index.html must exist');
  const html = fs.readFileSync(HTML_PATH, 'utf8');

  assert.ok(html.includes('<!DOCTYPE html>'), 'Must declare html5 doctype');
  assert.ok(html.includes('<meta charset="UTF-8">'), 'Must declare UTF-8 charset');
  assert.ok(html.includes('<title>CardMon'), 'Must declare title');
  assert.ok(html.includes('styles.css'), 'Must link stylesheet');
  assert.ok(html.includes('src="i18n.js"'), 'Must load i18n.js');
  assert.ok(html.includes('src="app.js"'), 'Must load app.js');

  const i18nPos = html.indexOf('src="i18n.js"');
  const appPos = html.indexOf('src="app.js"');
  assert.ok(i18nPos < appPos, 'i18n.js must be loaded before app.js');
});

test('index.html includes required layout sections and navigation tabs', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');

  assert.ok(html.includes('id="appSidebar"'), 'Sidebar layout container must exist');
  assert.ok(html.includes('data-tab="dashboard"'), 'Dashboard tab must exist');
  assert.ok(html.includes('data-tab="banks"'), 'Banks tab must exist');
  assert.ok(html.includes('data-tab="cards"'), 'Cards tab must exist');
  assert.ok(html.includes('data-tab="loans"'), 'Loans tab must exist');
  assert.ok(html.includes('data-tab="subscriptions"'), 'Subscriptions tab must exist');
});

test('styles.css exists and is non-empty', () => {
  assert.ok(fs.existsSync(CSS_PATH), 'styles.css must exist');
  const css = fs.readFileSync(CSS_PATH, 'utf8');
  assert.ok(css.length > 1000, 'styles.css should contain styling rules');
  assert.ok(css.includes('--bg-main') || css.includes(':root') || css.includes('body'), 'Should define CSS variables or body styles');
});
