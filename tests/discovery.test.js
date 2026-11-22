'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const dgram = require('node:dgram');
const fs = require('node:fs');
const path = require('node:path');
const { DISCOVERY_TOKEN, discoveryPayload, createDiscoveryServer } = require('../server/discovery');

const ROOT = path.join(__dirname, '..');

test('discovery payload identifies a CardMon server and its HTTP port', () => {
  const payload = JSON.parse(discoveryPayload(9123));
  assert.equal(payload.type, 'cardmon_server');
  assert.equal(payload.protocol, 1);
  assert.equal(payload.httpPort, 9123);
  assert.ok(Array.isArray(payload.addresses));
});

test('server replies to a one-shot discovery broadcast with its HTTP port', async () => {
  const beacon = createDiscoveryServer({ port: 0, httpPort: 8765 });
  await beacon.ready;
  const port = beacon.socket.address().port;

  const answer = await new Promise((resolve, reject) => {
    const client = dgram.createSocket('udp4');
    const timer = setTimeout(() => { client.close(); reject(new Error('no discovery reply')); }, 2000);
    client.on('message', (message) => {
      clearTimeout(timer);
      client.close();
      resolve(JSON.parse(message.toString('utf8')));
    });
    const data = Buffer.from(DISCOVERY_TOKEN, 'utf8');
    client.send(data, port, '127.0.0.1', (err) => { if (err) { clearTimeout(timer); reject(err); } });
  });

  assert.equal(answer.type, 'cardmon_server');
  assert.equal(answer.httpPort, 8765);
  beacon.socket.close();
});

test('Android app discovers the server on demand without a background sync loop', () => {
  const java = fs.readFileSync(path.join(ROOT, 'android', 'app', 'src', 'main', 'java', 'com', 'aegeanworks', 'cardmon', 'MainActivity.java'), 'utf8');
  assert.match(java, /CARDMON_DISCOVER_V1/);
  assert.match(java, /DatagramSocket/);
  assert.match(java, /discoverServerOnce/);
  assert.match(java, /discoverAutomatically/);
  assert.doesNotMatch(java, /setInterval/);

  const sync = fs.readFileSync(path.join(ROOT, 'js', 'sync-client.js'), 'utf8');
  assert.match(sync, /autoSync: false/);
  assert.doesNotMatch(sync, /setInterval/);
});

test('server ignores unrelated UDP traffic', async () => {
  const beacon = createDiscoveryServer({ port: 0, httpPort: 8765 });
  await beacon.ready;
  const port = beacon.socket.address().port;
  let replied = false;
  await new Promise((resolve) => {
    const client = dgram.createSocket('udp4');
    client.on('message', () => { replied = true; });
    client.send(Buffer.from('unrelated', 'utf8'), port, '127.0.0.1', () => setTimeout(() => { client.close(); resolve(); }, 250));
  });
  assert.equal(replied, false);
  beacon.socket.close();
});
