// ==========================================================================
// CARDMON - SYNC SERVER CLI
//   node server/index.js [--port 8765] [--host 0.0.0.0] [--token SECRET]
// ==========================================================================

'use strict';

const path = require('node:path');
const { listen, lanAddresses } = require('./http-server');
const { createDiscoveryServer } = require('./discovery');
const { startCampaignPoller } = require('./campaign-feed');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const name = key.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) { args[name] = next; i += 1; }
    else args[name] = true;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const port = Number(args.port || process.env.CARDMON_PORT || 8765);
  const host = args.host || process.env.CARDMON_HOST || '0.0.0.0';
  const token = args.token || process.env.CARDMON_SYNC_TOKEN || '';
  const rootDir = path.join(__dirname, '..');
  const dataDir = args['data-dir'] || process.env.CARDMON_DATA_DIR || path.join(rootDir, '.sync-data');
  const discoveryPort = Number(args['discovery-port'] || process.env.CARDMON_DISCOVERY_PORT || 8766);
  const discoveryEnabled = !args['no-discovery'] && process.env.CARDMON_NO_DISCOVERY !== '1';

  listen({ port, host, token, rootDir, dataDir }).then((server) => {
    console.log('CardMon local sync server is running.');
    console.log(`  Local:    http://localhost:${port}`);
    console.log(`  APK page: http://localhost:${port}/apk`);
    for (const address of lanAddresses()) {
      // hygiene: allow local LAN address printed for the Android setup screen
      console.log(`  Android:  http://${address.address}:${port}  (${address.interface})`);
      // hygiene: allow local LAN APK page URL printed for phone browsers
      console.log(`  Phone APK: http://${address.address}:${port}/apk`);
    }
    console.log(`  Data:     ${dataDir}`);
    if (token) console.log('  Auth:     token required (X-CardMon-Token)');

    // Discovery is passive: the server only answers a one-shot broadcast from
    // the Android app. It never announces or syncs anything on its own.
    let discovery = null;
    if (discoveryEnabled) {
      discovery = createDiscoveryServer({ port: discoveryPort, httpPort: port });
      discovery.ready.then(() => {
        console.log(`  Discovery: UDP ${discoveryPort} (on-demand, no background sync)`);
      }).catch((err) => {
        console.log(`  Discovery: unavailable on UDP ${discoveryPort} (${err.message})`);
      });
    }

    // Pull campaign data in the background so /api/campaigns is warm on first use.
    const stopCampaignPoller = startCampaignPoller({
      onError: (err) => console.log(`  Campaigns: refresh failed (${err.message}); serving last good data`)
    });
    console.log('  Campaigns: background refresh every 6 hours');

    console.log('  Stop:     Ctrl+C');
    const shutdown = () => {
      stopCampaignPoller();
      if (discovery) discovery.socket.close();
      server.close(() => process.exit(0));
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }).catch((err) => {
    console.error(`Why: server could not start. Fix: ${err.message}`);
    process.exit(1);
  });
}

if (require.main === module) main();
module.exports = { parseArgs, main };
