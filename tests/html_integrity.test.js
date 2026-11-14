'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..');
const HTML_PATH = path.join(ROOT_DIR, 'index.html');
const CSS_PATH = path.join(ROOT_DIR, 'styles.css');
const CSS_DIR = path.join(ROOT_DIR, 'css');
const JS_DIR = path.join(ROOT_DIR, 'js');

test('index.html structure has valid doctype, meta tags, and script tags', () => {
  assert.ok(fs.existsSync(HTML_PATH), 'index.html must exist');
  const html = fs.readFileSync(HTML_PATH, 'utf8');

  assert.ok(html.includes('<!DOCTYPE html>'), 'Must declare html5 doctype');
  assert.ok(html.includes('<meta charset="UTF-8">'), 'Must declare UTF-8 charset');
  assert.ok(html.includes('<title>CardMon'), 'Must declare title');
  assert.ok(html.includes('styles.css'), 'Must link stylesheet');
  assert.ok(html.includes('src="i18n.js"'), 'Must load i18n.js');
  assert.ok(html.includes('src="js/constants.js"'), 'Must load js/constants.js');
  assert.ok(html.includes('src="js/file-system.js"'), 'Must load js/file-system.js');
  assert.ok(html.includes('src="js/main.js"'), 'Must load js/main.js');

  const i18nPos = html.indexOf('src="i18n.js"');
  const constPos = html.indexOf('src="js/constants.js"');
  const fsPos = html.indexOf('src="js/file-system.js"');
  const mainPos = html.indexOf('src="js/main.js"');
  assert.ok(i18nPos < constPos, 'i18n.js must be loaded before js/constants.js');
  assert.ok(fsPos < mainPos, 'js/file-system.js must be loaded before js/main.js');
});

test('index.html includes required layout sections and navigation tabs', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');

  assert.ok(html.includes('id="appSidebar"'), 'Sidebar layout container must exist');
  assert.ok(html.includes('id="fileStatusBadge"'), 'File status badge element must exist');
  assert.ok(html.includes('data-tab="dashboard"'), 'Dashboard tab must exist');
  assert.ok(html.includes('data-tab="banks"'), 'Banks tab must exist');
  assert.ok(html.includes('data-tab="cards"'), 'Cards tab must exist');
  assert.ok(html.includes('data-tab="loans"'), 'Loans tab must exist');
  assert.ok(html.includes('data-tab="subscriptions"'), 'Subscriptions tab must exist');
});

test('styles.css and modular css files exist and are populated', () => {
  assert.ok(fs.existsSync(CSS_PATH), 'styles.css must exist');
  const css = fs.readFileSync(CSS_PATH, 'utf8');
  assert.ok(css.includes('@import'), 'styles.css should use modular @import');

  const modules = ['base.css', 'layout.css', 'components.css', 'views.css', 'modals.css'];
  for (const mod of modules) {
    const modPath = path.join(CSS_DIR, mod);
    assert.ok(fs.existsSync(modPath), `${mod} must exist in css/`);
    const content = fs.readFileSync(modPath, 'utf8');
    assert.ok(content.length > 500, `${mod} must not be empty`);
  }
});

test('modular javascript files exist and are populated in js/', () => {
  const modules = [
    'constants.js', 'utils.js', 'file-system.js', 'state.js', 'smart-advisor.js',
    'backup-vault.js', 'views.js', 'modals.js', 'reports.js', 'main.js'
  ];
  for (const mod of modules) {
    const modPath = path.join(JS_DIR, mod);
    assert.ok(fs.existsSync(modPath), `${mod} must exist in js/`);
    const content = fs.readFileSync(modPath, 'utf8');
    assert.ok(content.length > 200, `${mod} must not be empty`);
  }
});
