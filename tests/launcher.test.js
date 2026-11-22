'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');

test('one-click launcher files exist with the correct server invocation', () => {
  const cmd = fs.readFileSync(path.join(ROOT, 'start-server.cmd'), 'utf8');
  assert.match(cmd, /cd \/d "%~dp0"/);
  assert.match(cmd, /start "CardMon Server" cmd \/k "node server\\index\.js/);
  assert.match(cmd, /http:\/\/localhost:%PORT%\/apk/);
  assert.match(cmd, /CARDMON_PORT/);

  const sh = fs.readFileSync(path.join(ROOT, 'start-server.sh'), 'utf8');
  assert.match(sh, /^#!\/usr\/bin\/env bash/);
  assert.match(sh, /node server\/index\.js --port "\$PORT" --host 0\.0\.0\.0/);
});

test('desktop shortcut creator targets the one-click launcher', () => {
  const cmd = fs.readFileSync(path.join(ROOT, 'create-desktop-shortcut.cmd'), 'utf8');
  assert.match(cmd, /CardMon Server\.lnk/);
  assert.match(cmd, /start-server\.cmd/);
  assert.match(cmd, /WScript\.Shell/);
});

test('firewall helper opens both the HTTP port and the discovery port', () => {
  const cmd = fs.readFileSync(path.join(ROOT, 'allow-firewall.cmd'), 'utf8');
  assert.match(cmd, /protocol=TCP localport=%PORT%/);
  assert.match(cmd, /protocol=UDP localport=%DPORT%/);
  assert.match(cmd, /CARDMON_DISCOVERY_PORT/);
});

test('Windows launchers run in dry-run mode without starting a server', { skip: process.platform !== 'win32' }, () => {
  const env = { ...process.env, CARDMON_LAUNCHER_DRY_RUN: '1', CARDMON_PORT: '8888' };
  const startOutput = execFileSync('cmd.exe', ['/c', 'start-server.cmd'], { cwd: ROOT, env, encoding: 'utf8' });
  assert.match(startOutput, /\[dry-run\] start "CardMon Server"/);
  assert.match(startOutput, /http:\/\/localhost:8888\/apk/);

  const shortcutOutput = execFileSync('cmd.exe', ['/c', 'create-desktop-shortcut.cmd'], { cwd: ROOT, env, encoding: 'utf8' });
  assert.match(shortcutOutput, /\[dry-run\] create shortcut/);
  assert.match(shortcutOutput, /CardMon Server\.lnk/);

  const firewallOutput = execFileSync('cmd.exe', ['/c', 'allow-firewall.cmd'], { cwd: ROOT, env, encoding: 'utf8' });
  assert.match(firewallOutput, /\[dry-run\] allow inbound TCP 8888 and UDP 8766/);
});
