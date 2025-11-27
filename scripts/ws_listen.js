#!/usr/bin/env node
// Simple WebSocket listener for manual testing
// Usage: npm run test:ws -- [roomId]

const WebSocket = require('ws');
const args = process.argv.slice(2);
const roomId = args[0] || '123456';
const protocol = process.env.VITE_API_URL && process.env.VITE_API_URL.startsWith('https') ? 'wss' : 'ws';
const host = process.env.VITE_API_URL ? new URL(process.env.VITE_API_URL).host : 'localhost:8000';
const url = `${protocol}://${host}/ws/room_${roomId}`;

console.log(`Connecting to ${url} ...`);
const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('Connected. Waiting for messages...');
});

ws.on('message', (data) => {
  try {
    const parsed = JSON.parse(data.toString());
    console.log('<<', JSON.stringify(parsed, null, 2));
  } catch (e) {
    console.log('<<', data.toString());
  }
});

ws.on('close', () => {
  console.log('Disconnected');
  process.exit(0);
});

ws.on('error', (err) => {
  console.error('WS error', err.message || err);
  process.exit(1);
});
