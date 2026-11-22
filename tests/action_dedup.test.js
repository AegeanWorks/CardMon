'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function count(action) {
  const re = new RegExp(`onclick="[^"]*\\b${action}\\(`, 'g');
  return (html.match(re) || []).length;
}

test('each global action has exactly one home', () => {
  const globalActions = [
    'openProfileModal',
    'exportPdfReport',
    'saveToActiveFile',
    'saveFileAs',
    'openPortfolioFile',
    'openBackupVaultModal',
    'exportJsonBackup',
    'triggerImportJson',
    'exportCsvReport',
    'confirmClearAllData',
    'openShortcutsModal'
  ];
  for (const action of globalActions) {
    assert.equal(count(action), 1, `${action} must appear in one place only`);
  }
});

test('settings actions live in the single top-right settings menu', () => {
  const menuStart = html.indexOf('id="settingsDropdownMenu"');
  const menuEnd = html.indexOf('id="importFileInput"', menuStart);
  assert.ok(menuStart > 0 && menuEnd > menuStart);
  const menu = html.slice(menuStart, menuEnd);
  for (const action of ['openProfileModal', 'exportPdfReport', 'saveToActiveFile', 'openBackupVaultModal']) {
    assert.match(menu, new RegExp(`onclick="[^"]*${action}\\(`));
  }

  const sidebar = html.slice(html.indexOf('id="appSidebar"'), html.indexOf('</aside>'));
  assert.doesNotMatch(sidebar, /openProfileModal/);
  assert.doesNotMatch(sidebar, /exportPdfReport/);
});

test('APK has one launcher: the top-bar link to the standalone page', () => {
  assert.equal(count('requestApkBuild'), 0);
  assert.equal((html.match(/id="topbarApkBtn"/g) || []).length, 1);
  assert.match(html, /id="topbarApkBtn"[^>]*href="\/apk"/);
  assert.doesNotMatch(html, /id="apkBuildStatus"/);
});

test('demo data appears in the settings menu and the contextual empty state only', () => {
  assert.ok(count('loadDemoData') <= 2);
  assert.match(html, /onclick="loadDemoData\(true\); closeSettingsDropdown\(\);"/);
});
