'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createServer, listen } = require('../server/http-server');
const { BuildManager } = require('../server/build-apk');
const { parseArgs } = require('../server/index');
const { resetCampaignCache } = require('../server/campaign-feed');

async function withServer(options, fn) {
  const server = createServer(options);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`, server);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cardmon-sync-'));
}

test('health endpoint reports the sync protocol and server state', async () => {
  const root = tempRoot();
  await withServer({ rootDir: root, dataDir: path.join(root, 'data') }, async (base) => {
    const res = await fetch(`${base}/api/health`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.service, 'cardmon-sync');
    assert.equal(body.protocol, 1);
    assert.equal(body.hasData, false);
    assert.equal(body.authRequired, false);
  });
});

test('portfolio PUT then GET round-trips with a revision number', async () => {
  const root = tempRoot();
  await withServer({ rootDir: root, dataDir: path.join(root, 'data') }, async (base) => {
    const portfolio = { banks: [{ id: 'b1' }], cards: [{ id: 'c1' }], loans: [], cashSubscriptions: [], profile: { name: 'Test' } };
    const put = await fetch(`${base}/api/portfolio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portfolio })
    });
    const putBody = await put.json();
    assert.equal(put.status, 200);
    assert.equal(putBody.revision, 1);

    const got = await fetch(`${base}/api/portfolio`);
    const gotBody = await got.json();
    assert.equal(got.status, 200);
    assert.equal(gotBody.revision, 1);
    assert.deepEqual(gotBody.portfolio, portfolio);
  });
});

test('stale baseRevision is rejected with 409 conflict', async () => {
  const root = tempRoot();
  await withServer({ rootDir: root, dataDir: path.join(root, 'data') }, async (base) => {
    const portfolio = { banks: [], cards: [] };
    await fetch(`${base}/api/portfolio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portfolio })
    });
    await fetch(`${base}/api/portfolio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portfolio: { banks: [1], cards: [] } })
    });
    const conflict = await fetch(`${base}/api/portfolio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portfolio, baseRevision: 1 })
    });
    const body = await conflict.json();
    assert.equal(conflict.status, 409);
    assert.match(body.error, /Conflict/);
    assert.equal(body.current.revision, 2);
  });
});

test('invalid portfolio shape is rejected with 400', async () => {
  const root = tempRoot();
  await withServer({ rootDir: root, dataDir: path.join(root, 'data') }, async (base) => {
    const res = await fetch(`${base}/api/portfolio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portfolio: { banks: 'not-an-array', cards: [] } })
    });
    const body = await res.json();
    assert.equal(res.status, 400);
    assert.match(body.error, /banks must be an array/);
  });
});

test('token authentication protects writes but leaves health public', async () => {
  const root = tempRoot();
  await withServer({ rootDir: root, dataDir: path.join(root, 'data'), token: 'secret-123' }, async (base) => {
    const health = await (await fetch(`${base}/api/health`)).json();
    assert.equal(health.authRequired, true);

    const denied = await fetch(`${base}/api/portfolio`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{"portfolio":{"banks":[],"cards":[]}}' });
    assert.equal(denied.status, 401);

    const allowed = await fetch(`${base}/api/portfolio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-CardMon-Token': 'secret-123' },
      body: JSON.stringify({ portfolio: { banks: [], cards: [] } })
    });
    assert.equal(allowed.status, 200);
  });
});

test('static hosting serves index.html and blocks path traversal', async () => {
  const root = tempRoot();
  fs.writeFileSync(path.join(root, 'index.html'), '<h1>CardMon</h1>');
  await withServer({ rootDir: root, dataDir: path.join(root, 'data') }, async (base) => {
    const index = await fetch(`${base}/`);
    assert.equal(index.status, 200);
    assert.match(await index.text(), /CardMon/);

    const traversal = await fetch(`${base}/..%2F..%2Fwindows%2Fwin.ini`);
    assert.equal(traversal.status, 403);
  });
});

test('phone-friendly /apk page and /build-apk alias are served publicly', async () => {
  const root = tempRoot();
  fs.copyFileSync(path.join(__dirname, '..', 'apk.html'), path.join(root, 'apk.html'));
  await withServer({ rootDir: root, dataDir: path.join(root, 'data'), token: 'secret' }, async (base) => {
    for (const route of ['/apk', '/build-apk', '/apk.html']) {
      const res = await fetch(`${base}${route}`);
      const html = await res.text();
      assert.equal(res.status, 200, `${route} should be public`);
      assert.match(html, /id="apkBuildBtn"/);
    }
  });
});

test('campaign proxy endpoint serves normalized campaign data', async () => {
  resetCampaignCache();
  const root = tempRoot();
  const campaignFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      meta: { snapshotDate: '2026-11-19' },
      apps: [{ id: 'spotify', name: 'Spotify', category: 'digital' }],
      banks: [{ id: 'akbank', name: 'Akbank' }],
      offers: [{ id: 'o1', appId: 'spotify', bankId: 'akbank', rate: 50, limit: 100, status: 'active' }]
    })
  });
  await withServer({ rootDir: root, dataDir: path.join(root, 'data'), campaignFetch }, async (base) => {
    const res = await fetch(`${base}/api/campaigns`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.offerCount, 1);
    assert.equal(body.offers[0].category, 'digital');
    assert.equal(body.offers[0].bankName, 'Akbank');
    assert.equal(body.cached, false);
  });
});

test('campaign search endpoint returns merged local results', async () => {
  resetCampaignCache();
  const root = tempRoot();
  const campaignFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      meta: { snapshotDate: '2026-11-19' },
      apps: [{ id: 'spotify', name: 'Spotify', category: 'digital' }],
      banks: [{ id: 'garanti-bbva', name: 'Garanti BBVA' }],
      offers: [{ id: 'o1', appId: 'spotify', bankId: 'garanti-bbva', benefitLabel: '500 TL', note: 'Spotify bonus', status: 'active' }]
    })
  });
  await withServer({ rootDir: root, dataDir: path.join(root, 'data'), campaignFetch }, async (base) => {
    const res = await fetch(`${base}/api/campaign-search?q=spotify&banks=Garanti%20BBVA%7Cgaranti-bbva`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.query, 'spotify');
    assert.deepEqual(JSON.parse(JSON.stringify(body.banks)), ['Garanti BBVA']);
    assert.ok(body.results.length >= 1);
    assert.equal(body.results[0].bank, 'Garanti BBVA');
    assert.match(body.results[0].title, /Spotify/);
  });
});

test('APK download response is an attachment with the APK filename', async () => {
  const root = tempRoot();
  const dist = path.join(root, 'dist');
  fs.mkdirSync(dist, { recursive: true });
  fs.writeFileSync(path.join(dist, 'cardmon-debug.apk'), Buffer.from('PK-fake'));
  await withServer({ rootDir: root, dataDir: path.join(root, 'data'), distDir: dist }, async (base) => {
    const res = await fetch(`${base}/api/build-apk/download`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-disposition') || '', /attachment; filename="cardmon-debug.apk"/);
    assert.equal(await res.text(), 'PK-fake');
  });
});

test('CLI argument parser and listen helper boot the server', async () => {
  const args = parseArgs(['--port', '8799', '--token', 'abc', '--data-dir', 'C:\\data']);
  assert.equal(args.port, '8799');
  assert.equal(args.token, 'abc');
  assert.equal(args['data-dir'], 'C:\\data');

  const root = tempRoot();
  const server = await listen({ port: 0, host: '127.0.0.1', rootDir: root, dataDir: path.join(root, 'data') });
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/health`);
    assert.equal((await res.json()).ok, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('build status endpoint surfaces toolchain detection', async () => {
  const root = tempRoot();
  const manager = new BuildManager({ androidDir: root, outputDir: path.join(root, 'dist') });
  await withServer({ rootDir: root, dataDir: path.join(root, 'data'), buildManager: manager }, async (base) => {
    const res = await fetch(`${base}/api/build-apk/status`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.state, 'idle');
    assert.ok(body.environment);
    assert.ok(Array.isArray(body.environment.issues));
  });
});
