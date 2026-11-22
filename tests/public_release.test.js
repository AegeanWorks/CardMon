'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHarness } = require('./harness');

const ROOT = path.join(__dirname, '..');

const SOURCE_DIRS = ['js', 'tests', 'server', 'android', 'css', 'assets'];
const SOURCE_FILES = ['index.html', 'apk.html', 'i18n.js', 'styles.css', 'README.md', 'start-server.cmd', 'start-server.sh'];

function sourceFiles() {
  const files = SOURCE_FILES.map((name) => path.join(ROOT, name));
  for (const dir of SOURCE_DIRS) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) continue;
    for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
      if (entry.isDirectory()) continue;
      if (/\.(js|html|css|json|java|xml|md|cmd|sh|txt)$/.test(entry.name)) {
        files.push(path.join(full, entry.name));
      }
    }
  }
  return files.filter((file) => fs.existsSync(file));
}

const personalNames = ['Yun' + 'us', 'Em' + 're'];
const privateSubnet = '192.' + '168.';

test('public source tree contains no personal name or private-network address', () => {
  const offenders = [];
  for (const file of sourceFiles()) {
    const text = fs.readFileSync(file, 'utf8');
    for (const name of personalNames) {
      if (text.includes(name)) offenders.push(`${path.relative(ROOT, file)}: ${name}`);
    }
    if (text.includes(privateSubnet)) offenders.push(`${path.relative(ROOT, file)}: private IP`);
  }
  assert.deepEqual(offenders, []);
});

test('discovery payload publishes only generic connection data', () => {
  const { discoveryPayload } = require('../server/discovery');
  const payload = JSON.parse(discoveryPayload(8765));
  assert.equal(payload.type, 'cardmon_server');
  assert.equal(payload.httpPort, 8765);
  assert.equal(payload.hostname, undefined);
  assert.equal(payload.user, undefined);
  assert.deepEqual(Object.keys(payload).sort(), ['addresses', 'httpPort', 'protocol', 'type']);
});

test('English is the default UI language and dictionaries cover new labels', () => {
  const h = createHarness();
  assert.equal(h.getCurrentLang(), 'en');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /<html lang="en">/);
  for (const key of ['managementNav', 'appLanguage', 'availableLimit', 'debtLabel', 'shortcuts']) {
    assert.ok(h.I18N.tr[key] && h.I18N.en[key], `missing translation key ${key}`);
  }
});

function overlayHarness(lang) {
  const textNode = { nodeValue: ' Kaydet ', parentNode: { nodeName: 'SPAN' } };
  const input = {
    nodeName: 'INPUT',
    attrs: { placeholder: 'Kart, banka veya model ara...' },
    getAttribute(name) { return this.attrs[name] || null; },
    setAttribute(name, value) { this.attrs[name] = value; }
  };
  const sandbox = {
    console,
    Map,
    currentLang: lang,
    I18N: {
      tr: { save: 'Kaydet', searchPlaceholder: 'Kart, banka veya model ara...' },
      en: { save: 'Save', searchPlaceholder: 'Search cards...' }
    },
    document: {
      readyState: 'complete',
      body: {},
      addEventListener() {},
      createTreeWalker() {
        let index = -1;
        return { nextNode() { index += 1; return index === 0 ? textNode : null; } };
      },
      querySelectorAll() { return [input]; }
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'en-overlay.js'), 'utf8'), sandbox);
  return { sandbox, textNode, input, run: (expr) => vm.runInContext(expr, sandbox) };
}

test('English mode leaves no Turkish text in the main interface', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const pattern = />([^<>]{2,})</g;
  const strings = new Set();
  let match;
  while ((match = pattern.exec(html))) {
    const value = match[1].trim();
    if (/[şŞğĞıİçÇöÖüÜ]/.test(value) && value.length < 120) strings.add(value);
  }
  const originals = [...strings];
  const nodes = originals.map((value) => ({ nodeValue: ` ${value} `, parentNode: { nodeName: 'SPAN' } }));
  const store = new Map();
  const sandbox = {
    console,
    Map,
    localStorage: { getItem: (key) => store.get(key) || null, setItem: (key, value) => store.set(key, value) },
    document: {
      readyState: 'complete',
      documentElement: {},
      addEventListener() {},
      querySelectorAll() { return []; },
      createTreeWalker() {
        let index = -1;
        return { nextNode() { index += 1; return index < nodes.length ? nodes[index] : null; } };
      },
      body: {}
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'i18n.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'en-overlay.js'), 'utf8'), sandbox);
  const remaining = originals.filter((value, index) => nodes[index].nodeValue.trim() === value);
  assert.deepEqual(remaining, []);
});

test('standalone APK page and its logic contain no Turkish text', () => {
  const html = fs.readFileSync(path.join(ROOT, 'apk.html'), 'utf8');
  const visibleText = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
  assert.equal(/[şŞğĞıİçÇöÖüÜ]/.test(visibleText), false);

  const h = createHarness();
  const script = fs.readFileSync(path.join(ROOT, 'js', 'apk-page.js'), 'utf8');
  assert.equal(/[şŞğĞıİçÇöÖüÜ]/.test(script), false);
});

test('English overlay translates legacy labels and restores them on Turkish', () => {
  const h = overlayHarness('en');
  assert.equal(h.textNode.nodeValue, ' Save ');
  assert.equal(h.input.attrs.placeholder, 'Search cards...');

  h.run("clearEnglishOverlay()");
  assert.equal(h.textNode.nodeValue, ' Kaydet ');
  assert.equal(h.input.attrs.placeholder, 'Kart, banka veya model ara...');

  const tr = overlayHarness('tr');
  assert.equal(tr.textNode.nodeValue, ' Kaydet ');
  assert.equal(tr.input.attrs.placeholder, 'Kart, banka veya model ara...');
});
