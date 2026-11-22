// ==========================================================================
// CARDMON - LOCAL SYNC / HOSTING HTTP SERVER
// Serves the web app on the LAN and exposes the portfolio sync + APK build API.
// ==========================================================================

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { getPortfolio, putPortfolio } = require('./sync-store');
const { BuildManager, detectEnvironment } = require('./build-apk');

const MAX_BODY = 8 * 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.cardmon': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
  '.apk': 'application/vnd.android.package-archive',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

function lanAddresses() {
  const out = [];
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const info of interfaces[name] || []) {
      if (info.family === 'IPv4' && !info.internal) out.push({ interface: name, address: info.address });
    }
  }
  return out;
}

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data)
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('Payload too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); }
      catch { reject(Object.assign(new Error('Invalid JSON body'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function safeStaticPath(rootDir, urlPath) {
  let decoded;
  try { decoded = decodeURIComponent(urlPath.split('?')[0]); }
  catch { return null; }
  if (decoded === '/' || decoded === '') decoded = '/index.html';
  const resolved = path.resolve(rootDir, `.${path.sep}${decoded.replace(/^[/\\]+/, '')}`);
  const root = path.resolve(rootDir) + path.sep;
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

function serveFile(res, filePath, cache = false, extraHeaders = {}) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stats.size,
      'Cache-Control': cache ? 'public, max-age=300' : 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders
    };
    res.writeHead(200, headers);
    if (res.req && res.req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(filePath).pipe(res);
  });
}

function authorized(options, req) {
  if (!options.token) return true;
  const supplied = req.headers['x-cardmon-token'] || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return supplied === options.token;
}

function createServer(options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const dataDir = options.dataDir || path.join(rootDir, '.sync-data');
  const distDir = options.distDir || path.join(rootDir, 'dist');
  const token = options.token || '';
  const builders = options.buildManager || new BuildManager({ androidDir: path.join(rootDir, 'android'), outputDir: distDir });

  return http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CardMon-Token, Authorization');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    const url = new URL(req.url || '/', 'http://localhost');
    const route = url.pathname;

    try {
      if (route === '/api/health' && req.method === 'GET') {
        const store = getPortfolio(dataDir);
        sendJson(res, 200, {
          ok: true,
          service: 'cardmon-sync',
          protocol: 1,
          revision: store.revision,
          updatedAt: store.updatedAt,
          hasData: !!store.portfolio,
          authRequired: !!token
        });
        return;
      }

      if (route === '/api/sync/info' && req.method === 'GET') {
        sendJson(res, 200, {
          service: 'cardmon-sync',
          protocol: 1,
          // hygiene: allow advertised local server origin derived from the incoming request host
          baseUrl: `http://${req.headers.host || 'localhost'}`,
          addresses: lanAddresses(),
          authRequired: !!token,
          android: detectEnvironment(path.join(rootDir, 'android'))
        });
        return;
      }

      // Phone-friendly standalone APK builder page (public; the API remains
      // token-protected and the page offers a token field for that case).
      if ((route === '/apk' || route === '/build-apk' || route === '/apk.html') && req.method === 'GET') {
        serveFile(res, path.join(rootDir, 'apk.html'));
        return;
      }

      if (!authorized({ token }, req)) {
        sendJson(res, 401, { error: 'Unauthorized: provide a valid X-CardMon-Token' });
        return;
      }

      if (route === '/api/portfolio' && req.method === 'GET') {
        const store = getPortfolio(dataDir);
        if (!store.portfolio) { sendJson(res, 404, { error: 'No portfolio synced yet', revision: 0 }); return; }
        sendJson(res, 200, { revision: store.revision, updatedAt: store.updatedAt, portfolio: store.portfolio });
        return;
      }

      if (route === '/api/portfolio' && req.method === 'PUT') {
        const body = await readBody(req);
        const result = putPortfolio(dataDir, body.portfolio, { baseRevision: body.baseRevision });
        if (!result.ok) {
          sendJson(res, result.status, { error: result.error, ...(result.current ? { current: result.current } : {}) });
          return;
        }
        sendJson(res, result.status, { ok: true, revision: result.revision, updatedAt: result.updatedAt });
        return;
      }

      if (route === '/api/build-apk' && req.method === 'POST') {
        const body = await readBody(req);
        const result = builders.start({ offline: body.offline !== false });
        sendJson(res, result.accepted ? 202 : 409, result);
        return;
      }

      if (route === '/api/build-apk/status' && req.method === 'GET') {
        sendJson(res, 200, builders.status());
        return;
      }

      if (route === '/api/build-apk/download' && req.method === 'GET') {
        const apk = path.join(distDir, 'cardmon-debug.apk');
        if (!fs.existsSync(apk)) { sendJson(res, 404, { error: 'No APK built yet' }); return; }
        res.req = req;
        serveFile(res, apk, false, { 'Content-Disposition': 'attachment; filename="cardmon-debug.apk"' });
        return;
      }

      if (route.startsWith('/api/')) {
        sendJson(res, 404, { error: 'Unknown API route' });
        return;
      }

      const filePath = safeStaticPath(rootDir, url.pathname);
      if (!filePath) { sendJson(res, 403, { error: 'Forbidden path' }); return; }
      serveFile(res, filePath, true);
    } catch (err) {
      const status = err.status || 500;
      sendJson(res, status, { error: err.message || 'Internal error' });
    }
  });
}

function listen(options = {}) {
  const server = createServer(options);
  const port = options.port || 8765;
  const host = options.host || '0.0.0.0';
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve(server));
  });
}

module.exports = { createServer, listen, safeStaticPath, lanAddresses, MIME, MAX_BODY };
