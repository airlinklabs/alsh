const WebSocket = require('ws');
const pty = require('node-pty');
const fs = require('fs');
const path = require('path');
const process = require('process');
const { v4: uuidv4 } = require('uuid');

const PASSWORD = process.env.PASSWORD || 'secret';
const ID = uuidv4();

const idFilePath = '/app/data/airlink/alshid.txt';
fs.mkdirSync(path.dirname(idFilePath), { recursive: true });
fs.writeFileSync(idFilePath, ID);

const WS_URL = 'wss://alsh.airlinklabs.xyz';
let shell;
let ws;
let reconnectAttempts = 0;
const MAX_RECONNECTS = 20;
const RECONNECT_INTERVAL = 5000;

const connect = () => {
  ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    reconnectAttempts = 0;
    ws.send(JSON.stringify({
      type: 'register',
      role: 'server',
      id: ID,
      password: PASSWORD
    }));
  });

  ws.on('message', (msg) => {
    const data = JSON.parse(msg.toString());

    if (data.type === 'client-connected') {
      startShell();
    }

    if (data.type === 'stream' && shell) {
      shell.write(data.payload);
    }
  });

  ws.on('error', (err) => {
    console.error('[ERROR] WebSocket error:', err.message);
  });

  ws.on('close', () => {
    console.log('[INFO] WebSocket connection closed');
    attemptReconnect();
  });
};

const attemptReconnect = () => {
  if (reconnectAttempts < MAX_RECONNECTS) {
    reconnectAttempts++;
    console.log(`[INFO] Reconnecting in 5s... (${reconnectAttempts}/${MAX_RECONNECTS})`);
    setTimeout(connect, RECONNECT_INTERVAL);
  } else {
    console.error('[ERROR] Max reconnect attempts reached. Exiting.');
    process.exit(1);
  }
};

const startShell = () => {
  shell = pty.spawn('bash', [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: '/app/data',
    env: process.env,
  });

  shell.onData((data) => {
    ws.send(JSON.stringify({ type: 'stream', payload: data }));
  });

  shell.onExit(({ exitCode }) => {
    ws.send(JSON.stringify({ type: 'stream', payload: `\nShell exited with code ${exitCode}\n` }));
  });
};

process.on('SIGINT', () => {
  console.log('[INFO] Process terminated');
  if (shell) shell.kill();
  process.exit(0);
});

connect();
