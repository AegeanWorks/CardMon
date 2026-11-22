'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHarness } = require('./harness');

const JAVA = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'java',
  'com', 'aegeanworks', 'cardmon', 'MainActivity.java');

test('Android companion wires downloads, file picking and printing', () => {
  const source = fs.readFileSync(JAVA, 'utf8');
  assert.match(source, /setDownloadListener/);
  assert.match(source, /DownloadManager/);
  assert.match(source, /onShowFileChooser/);
  assert.match(source, /addJavascriptInterface\(new CardMonBridge\(\), "CardMonAndroid"\)/);
  assert.match(source, /void printPage\(\)/);
  assert.match(source, /void downloadText\(/);
  assert.match(source, /void downloadBase64\(/);
  assert.match(source, /onCreateWindow/);
});

test('native top bar exposes a direct APK page shortcut', () => {
  const res = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
  const layout = fs.readFileSync(path.join(res, 'layout', 'activity_web.xml'), 'utf8');
  const strings = fs.readFileSync(path.join(res, 'values', 'strings.xml'), 'utf8');
  const source = fs.readFileSync(JAVA, 'utf8');
  assert.match(layout, /android:id="@\+id\/apkButton"/);
  assert.match(strings, /<string name="apk">APK<\/string>/);
  assert.match(source, /findViewById\(R\.id\.apkButton\)/);
  assert.match(source, /apkUrlFor\(String serverUrl\)/);
  assert.match(source, /\.path\("\/apk"\)/);
});

test('JSON export routes through the Android download bridge when present', () => {
  const h = createHarness();
  const calls = [];
  h.sandbox.window.CardMonAndroid = {
    downloadText: (filename, text, mime) => calls.push({ filename, text, mime })
  };
  h.evalInContext('state').banks = [{ id: 'b1', name: 'Bank' }];
  h.exportJsonBackup();
  assert.equal(calls.length, 1);
  assert.match(calls[0].filename, /^cardmon_backup_.*\.json$/);
  assert.equal(calls[0].mime, 'text/json');
  assert.match(calls[0].text, /"banks"/);
});

test('blob download routes through the Android base64 bridge when present', async () => {
  const h = createHarness();
  const calls = [];
  h.sandbox.window.CardMonAndroid = {
    downloadBase64: (filename, base64, mime) => calls.push({ filename, base64, mime })
  };
  h.sandbox.Blob = class {
    constructor(parts, options) { this.type = (options && options.type) || ''; }
  };
  h.sandbox.FileReader = class {
    readAsDataURL(blob) {
      this.result = 'data:' + blob.type + ';base64,QUJD';
      this.onloadend();
    }
  };
  const blob = h.evalInContext('new Blob(["ABC"], { type: "application/json" })');
  h.downloadBlob(blob, 'portfolio.cardmon');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].filename, 'portfolio.cardmon');
  assert.equal(calls[0].base64, 'QUJD');
  assert.equal(calls[0].mime, 'application/json');
});

test('PDF report uses the Android print bridge when present', async () => {
  const h = createHarness();
  let printed = 0;
  let windowPrinted = 0;
  h.sandbox.window.CardMonAndroid = { printPage: () => { printed += 1; } };
  h.sandbox.window.print = () => { windowPrinted += 1; };
  h.evalInContext('triggerPrint()');
  assert.equal(printed, 1);
  assert.equal(windowPrinted, 0);
});
