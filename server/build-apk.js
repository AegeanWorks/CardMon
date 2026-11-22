// ==========================================================================
// CARDMON - ANDROID APK BUILD ORCHESTRATOR
// Drives the local Gradle/Android toolchain and publishes the debug APK.
// Exposed to the local website through the sync server and usable via CLI.
// ==========================================================================

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const LOG_LIMIT = 4000;

function tail(text, limit = LOG_LIMIT) {
  const value = String(text || '');
  return value.length > limit ? value.slice(-limit) : value;
}

function findAndroidSdk() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk'),
    path.join(os.homedir(), 'Android', 'Sdk'),
    '/opt/android-sdk',
    '/usr/local/lib/android/sdk'
  ].filter(Boolean);
  return candidates.find((dir) => fs.existsSync(path.join(dir, 'platform-tools', 'adb.exe')) ||
                                 fs.existsSync(path.join(dir, 'platform-tools', 'adb'))) || null;
}

function findGradleExecutable(androidDir) {
  const wrapperName = process.platform === 'win32' ? 'gradlew.bat' : 'gradlew';
  const wrapper = path.join(androidDir, wrapperName);
  if (fs.existsSync(wrapper)) return wrapper;

  const distsRoot = path.join(os.homedir(), '.gradle', 'wrapper', 'dists');
  if (fs.existsSync(distsRoot)) {
    const binName = process.platform === 'win32' ? 'gradle.bat' : 'gradle';
    for (const dist of fs.readdirSync(distsRoot)) {
      if (!dist.startsWith('gradle-')) continue;
      const distDir = path.join(distsRoot, dist);
      for (const hash of fs.readdirSync(distDir)) {
        const candidate = path.join(distDir, hash, 'gradle-' + dist.slice('gradle-'.length).split('-')[0], 'bin', binName);
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  }
  return process.platform === 'win32' ? 'gradle.bat' : 'gradle';
}

function detectEnvironment(androidDir) {
  const sdkDir = findAndroidSdk();
  const gradle = findGradleExecutable(androidDir);
  const issues = [];
  if (!sdkDir) issues.push('Android SDK not found. Set ANDROID_HOME or install the SDK.');
  if (gradle.endsWith('gradle.bat') || gradle.endsWith('gradle')) {
    // A bare command is still acceptable if it is on PATH; verified at run time.
  }
  return { sdkDir, gradle, issues, java: process.env.JAVA_HOME || 'system JDK' };
}

function quoteWindowsArg(value) {
  const text = String(value);
  return /[\s"&|<>()^]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function defaultRunner(command, args, options) {
  return new Promise((resolve, reject) => {
    const common = {
      cwd: options.cwd,
      env: options.env || process.env,
      windowsHide: true
    };
    // .bat wrappers need cmd.exe on Windows; pass one pre-quoted command line
    // instead of args+shell so arguments are not concatenated unescaped.
    const child = process.platform === 'win32'
      ? spawn([command, ...args].map(quoteWindowsArg).join(' '), { ...common, shell: true })
      : spawn(command, args, common);
    let output = '';
    const collect = (chunk) => { output += chunk.toString(); };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    const timer = setTimeout(() => {
      child.kill();
      reject(Object.assign(new Error('Build timed out'), { output: tail(output) }));
    }, options.timeoutMs || 10 * 60 * 1000);
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(Object.assign(err, { output: tail(output) }));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, output: tail(output) });
    });
  });
}

function findBuiltApk(androidDir) {
  const candidates = [
    path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'),
    path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug-unsigned.apk')
  ];
  return candidates.find((file) => fs.existsSync(file)) || null;
}

class BuildManager {
  constructor(options = {}) {
    this.androidDir = options.androidDir || path.join(__dirname, '..', 'android');
    this.outputDir = options.outputDir || path.join(__dirname, '..', 'dist');
    this.runner = options.runner || defaultRunner;
    this.detect = options.detect || detectEnvironment;
    this.env = options.env || process.env;
    this.jobId = 0;
    this.job = { jobId: 0, state: 'idle', startedAt: null, finishedAt: null, apkPath: null, downloadName: null, size: null, log: '' };
  }

  status() {
    return { ...this.job, environment: this.detect(this.androidDir) };
  }

  start(options = {}) {
    if (this.job.state === 'running') {
      return { accepted: false, reason: 'A build is already running', job: this.status() };
    }
    const detected = this.detect(this.androidDir);
    if (detected.issues.length) {
      this.job = {
        jobId: ++this.jobId,
        state: 'failed',
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        apkPath: null,
        downloadName: null,
        size: null,
        log: detected.issues.join('\n')
      };
      return { accepted: false, reason: detected.issues.join(' '), job: this.status() };
    }

    const job = {
      jobId: ++this.jobId,
      state: 'running',
      startedAt: new Date().toISOString(),
      finishedAt: null,
      apkPath: null,
      downloadName: null,
      size: null,
      log: `Gradle: ${detected.gradle}\nSDK: ${detected.sdkDir}\n`
    };
    this.job = job;
    const args = ['-p', this.androidDir, 'assembleDebug', '--no-daemon'];
    if (options.offline !== false) args.push('--offline');

    const childEnv = { ...this.env };
    if (detected.sdkDir) {
      childEnv.ANDROID_HOME = detected.sdkDir;
      childEnv.ANDROID_SDK_ROOT = detected.sdkDir;
    }

    Promise.resolve()
      .then(() => this.runner(detected.gradle, args, { cwd: this.androidDir, env: childEnv, timeoutMs: options.timeoutMs }))
      .then((result) => {
        const built = findBuiltApk(this.androidDir);
        if (result.code !== 0 || !built) {
          job.state = 'failed';
          job.log = tail(`${job.log}\n${result.output || 'No output'}\n${built ? '' : 'Why: Gradle finished without producing an APK.'}`);
        } else {
          fs.mkdirSync(this.outputDir, { recursive: true });
          const stamp = new Date().toISOString().replace(/[:.]/g, '-');
          const named = path.join(this.outputDir, `cardmon-${stamp}.apk`);
          fs.copyFileSync(built, named);
          const stable = path.join(this.outputDir, 'cardmon-debug.apk');
          fs.copyFileSync(built, stable);
          job.state = 'succeeded';
          job.apkPath = stable;
          job.downloadName = 'cardmon-debug.apk';
          job.size = fs.statSync(stable).size;
          job.log = tail(`${job.log}\n${result.output || ''}\nAPK: ${stable} (${job.size} bytes)`);
        }
        job.finishedAt = new Date().toISOString();
      })
      .catch((err) => {
        job.state = 'failed';
        job.finishedAt = new Date().toISOString();
        job.log = tail(`${job.log}\n${err.output || err.message || String(err)}`);
      });

    return { accepted: true, job: this.status() };
  }
}

async function main() {
  const manager = new BuildManager();
  const result = manager.start({ offline: !process.argv.includes('--online') });
  if (!result.accepted) {
    console.error(`Why: build could not start. Fix: ${result.reason}`);
    process.exit(1);
  }
  console.log(`APK build #${result.job.jobId} started (${result.job.state}).`);
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const job = manager.status();
    if (job.state === 'running') continue;
    if (job.state === 'succeeded') {
      console.log(`APK ready: ${job.apkPath} (${job.size} bytes)`);
      process.exit(0);
    }
    console.error(`Why: APK build failed. Fix: ${job.log}`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = {
  LOG_LIMIT,
  tail,
  findAndroidSdk,
  findGradleExecutable,
  detectEnvironment,
  quoteWindowsArg,
  defaultRunner,
  findBuiltApk,
  BuildManager
};
