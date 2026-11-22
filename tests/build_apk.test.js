'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { BuildManager, tail, findBuiltApk, detectEnvironment, quoteWindowsArg } = require('../server/build-apk');

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function makeApkPath(androidDir) {
  const dir = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'app-debug.apk');
}

const READY = () => ({ sdkDir: 'C:\\sdk', gradle: 'gradle.bat', issues: [], java: 'JDK' });
const NO_SDK = () => ({ sdkDir: null, gradle: 'gradle.bat', issues: ['Android SDK not found'], java: 'JDK' });

test('tail keeps only the last N characters of build output', () => {
  assert.equal(tail('abcdef', 3), 'def');
  assert.equal(tail('abc', 10), 'abc');
});

test('quoteWindowsArg quotes paths and arguments containing spaces', () => {
  assert.equal(quoteWindowsArg('gradlew.bat'), 'gradlew.bat');
  assert.equal(quoteWindowsArg('C:\\Program Files\\gradle.bat'), '"C:\\Program Files\\gradle.bat"');
  assert.equal(quoteWindowsArg('a&b'), '"a&b"');
});

test('findBuiltApk returns null when no artifact exists', () => {
  assert.equal(findBuiltApk(tempDir('cardmon-noapk-')), null);
});

test('BuildManager copies a successful build artifact into dist', async () => {
  const androidDir = tempDir('cardmon-android-');
  const distDir = tempDir('cardmon-dist-');
  fs.writeFileSync(makeApkPath(androidDir), Buffer.from('APK-BYTES'));

  const manager = new BuildManager({
    androidDir,
    outputDir: distDir,
    detect: READY,
    runner: async () => ({ code: 0, output: 'BUILD SUCCESSFUL' })
  });
  const result = manager.start();
  assert.equal(result.accepted, true);
  assert.equal(result.job.state, 'running');
  await new Promise((resolve) => setTimeout(resolve, 25));
  const status = manager.status();
  assert.equal(status.state, 'succeeded');
  assert.equal(status.size, 9);
  assert.equal(status.downloadName, 'cardmon-debug.apk');
  assert.ok(fs.existsSync(path.join(distDir, 'cardmon-debug.apk')));
  assert.match(fs.readFileSync(path.join(distDir, 'cardmon-debug.apk'), 'utf8'), /APK-BYTES/);
});

test('BuildManager rejects a second build while one is running', async () => {
  const manager = new BuildManager({
    androidDir: tempDir('cardmon-android-'),
    outputDir: tempDir('cardmon-dist-'),
    detect: READY,
    runner: () => new Promise((resolve) => setTimeout(() => resolve({ code: 0, output: 'ok' }), 40))
  });
  assert.equal(manager.start().accepted, true);
  const second = manager.start();
  assert.equal(second.accepted, false);
  assert.match(second.reason, /already running/);
});

test('BuildManager reports a clear failure when the SDK is missing', () => {
  const manager = new BuildManager({ androidDir: tempDir('cardmon-android-'), outputDir: tempDir('cardmon-dist-'), detect: NO_SDK });
  const result = manager.start();
  assert.equal(result.accepted, false);
  assert.equal(result.job.state, 'failed');
  assert.match(result.job.log, /Android SDK not found/);
});

test('BuildManager keeps a failed Gradle exit code as a failed job', async () => {
  const manager = new BuildManager({
    androidDir: tempDir('cardmon-android-'),
    outputDir: tempDir('cardmon-dist-'),
    detect: READY,
    runner: async () => ({ code: 1, output: 'FAILURE: Build failed' })
  });
  manager.start();
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(manager.status().state, 'failed');
  assert.match(manager.status().log, /FAILURE: Build failed/);
});

test('detectEnvironment returns a structured result on this host', () => {
  const result = detectEnvironment(tempDir('cardmon-env-'));
  assert.ok(result.gradle);
  assert.ok(Array.isArray(result.issues));
  assert.equal(typeof result.sdkDir === 'string' || result.sdkDir === null, true);
});
