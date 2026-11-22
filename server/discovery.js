// ==========================================================================
// CARDMON - LAN DISCOVERY BEACON
// Answers the Android app's UDP broadcast so it can find the server address
// automatically, without typing an IP on the phone.
// ==========================================================================

'use strict';

const dgram = require('node:dgram');
const { lanAddresses } = require('./http-server');

const DISCOVERY_TOKEN = 'CARDMON_DISCOVER_V1';
const DEFAULT_DISCOVERY_PORT = 8766;

function discoveryPayload(httpPort) {
  return JSON.stringify({
    type: 'cardmon_server',
    protocol: 1,
    httpPort,
    // No hostname or user-specific data is published during discovery.
    addresses: lanAddresses().map((entry) => entry.address)
  });
}

function createDiscoveryServer(options = {}) {
  const port = options.port === undefined ? DEFAULT_DISCOVERY_PORT : options.port;
  const httpPort = options.httpPort || 8765;
  const socket = dgram.createSocket('udp4');

  socket.on('error', (err) => {
    if (typeof options.onError === 'function') options.onError(err);
  });

  socket.on('message', (message, sender) => {
    if (!message.toString('utf8').includes(DISCOVERY_TOKEN)) return;
    const reply = Buffer.from(discoveryPayload(httpPort), 'utf8');
    socket.send(reply, sender.port, sender.address, () => {});
  });

  const ready = new Promise((resolve, reject) => {
    const onError = (err) => reject(err);
    socket.once('error', onError);
    socket.bind(port, '0.0.0.0', () => {
      socket.removeListener('error', onError);
      socket.setBroadcast(true);
      resolve(socket);
    });
  });

  return { socket, ready, port };
}

module.exports = { DISCOVERY_TOKEN, DEFAULT_DISCOVERY_PORT, discoveryPayload, createDiscoveryServer };
