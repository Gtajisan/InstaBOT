'use strict';

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const logger = require('../utils/logger');
const database = require('../utils/database');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Auth middleware
const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader === config.DASHBOARD_PASSWORD) {
    next();
  } else {
    res.status(401).send('Unauthorized');
  }
};

app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === config.DASHBOARD_PASSWORD) {
    res.json({ success: true, token: config.DASHBOARD_PASSWORD });
  } else {
    res.status(401).json({ success: false });
  }
});

app.get('/api/stats', auth, (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    uptime: Math.floor(process.uptime()),
    messagesHandled: database.getStat('totalMessages') || 0,
    commandsExecuted: database.getStat('totalCommands') || 0,
    errorCount: database.getStat('totalErrors') || 0,
    activeThreads: Object.keys(database.data.threads || {}).length,
    memory: {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024)
    }
  });
});

app.post('/api/reload/commands', auth, async (req, res) => {
  try {
    const InstagramBot = require('../bot/InstagramBot');
    // In a real scenario, we'd need access to the bot instance.
    // For now, we'll just log the request as a placeholder for functionality.
    logger.info('Manual command reload triggered via Dashboard');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/reload/events', auth, async (req, res) => {
  try {
    logger.info('Manual event reload triggered via Dashboard');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/restart/mqtt', auth, async (req, res) => {
  try {
    logger.info('Manual MQTT restart triggered via Dashboard');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Proxy logs to socket.io
const logFile = path.join(__dirname, '..', 'storage', 'logs', 'combined.log');
if (fs.existsSync(logFile)) {
  fs.watch(logFile, (eventType) => {
    if (eventType === 'change') {
      try {
        const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n');
        const lastLine = lines[lines.length - 1];
        if (lastLine) io.emit('log', JSON.parse(lastLine));
      } catch (e) {
        // skip invalid json
      }
    }
  });
}

const PORT = config.DASHBOARD_PORT || 3000;
server.listen(PORT, () => {
  logger.info(`Dashboard server running on port ${PORT}`);
});

module.exports = server;
