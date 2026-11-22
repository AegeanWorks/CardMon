'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHarness } = require('./harness');

const ROOT = path.join(__dirname, '..');

test('top-right settings dropdown markup is wired to toggle and close handlers', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /id="settingsDropdownWrapper"/);
  assert.match(html, /id="openProfileBtn"[^>]*onclick="toggleSettingsDropdown\(event\)"/);
  assert.match(html, /class="settings-dropdown-menu topbar-dropdown-menu" id="settingsDropdownMenu"/);
  assert.match(html, /onclick="openProfileModal\(\); closeSettingsDropdown\(\);"/);
});

test('CSS makes the combined settings/topbar dropdown visible when active', () => {
  const css = fs.readFileSync(path.join(ROOT, 'css', 'layout.css'), 'utf8');
  const hidden = css.match(/\.topbar-user-wrapper \.settings-dropdown-menu\.topbar-dropdown-menu\s*\{([^}]*)\}/);
  assert.ok(hidden, 'scoped hidden-state rule must exist');
  assert.match(hidden[1], /opacity:\s*0/);
  assert.match(hidden[1], /pointer-events:\s*none/);

  const active = css.match(/\.topbar-user-wrapper \.settings-dropdown-menu\.topbar-dropdown-menu\.active\s*\{([^}]*)\}/);
  assert.ok(active, 'scoped active-state rule must exist');
  assert.match(active[1], /opacity:\s*1/);
  assert.match(active[1], /pointer-events:\s*auto/);
});

test('toggle and close update the active class of the settings menu', () => {
  const h = createHarness();
  const menu = h.sandbox.document.getElementById('settingsDropdownMenu');
  assert.equal(menu.classList.contains('active'), false);
  h.toggleSettingsDropdown({ stopPropagation() {} });
  assert.equal(menu.classList.contains('active'), true);
  h.closeSettingsDropdown();
  assert.equal(menu.classList.contains('active'), false);
});
