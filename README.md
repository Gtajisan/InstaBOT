# GoatBot-IG (Integrated & Rebranded)

A powerful, modular, and role-based Instagram chatbot built on the rebranded `@gtajisan/nkxica` library. This project combines the architectural elegance of `GoatBot-IG-Port` with the robust engine and feature set of `InstaBOT`.

## Table of Contents
- [Project Description](#project-description)
- [Folder Structure](#folder-structure)
- [Quick Start](#quick-start)
- [Dashboard](#dashboard)
- [Role System](#role-system)
- [Creating Commands](#creating-commands)
- [Creating Events](#creating-events)
- [Configuration Reference](#configuration-reference)
- [Library Rebrand Note](#library-rebrand-note)

---

## Project Description

GoatBot-IG is a hybrid Instagram bot designed for performance and flexibility. It uses a custom-rebranded version of the `nkxica` library to interact with the Instagram MQTT stream. It features a sophisticated command/event loading system, a multi-tier role system, a premium web-based dashboard, and built-in protection against spam and errors.

## Folder Structure

```
.
├── index.js                  ← Entry point (GoatBot-IG-Port)
├── account.txt               ← Instagram cookies (Netscape format)
├── bot/
│   └── InstagramBot.js       ← Core engine (InstaBOT connection layer)
├── commands/                 ← Command modules (Integrated from both repos)
├── config/
│   ├── default.json          ← Merged configuration base
│   └── index.js              ← Environment-aware config loader
├── dashboard/                ← Premium glass-morphism web dashboard
│   ├── server.js             ← Express + Socket.IO backend
│   └── ...                   ← HTML/CSS/JS frontend
├── events/                   ← Event handlers (Integrated from both repos)
├── lib/
│   └── nkxica/               ← Rebranded @gtajisan/nkxica library
├── storage/
│   ├── data/                 ← SQLite/MongoDB persistent storage
│   └── logs/                 ← Winston log files
└── utils/                    ← Core utility functions (InstaBOT logic)
    ├── database.js           ← SQLite + MongoDB abstraction
    ├── permissions.js        ← Role & Permission resolution
    └── ...
```

## Quick Start

### 1. Installation
```bash
npm install
```

### 2. Configuration
- Rename `.env.example` to `.env` (if applicable) or edit `config/default.json`.
- Add your Instagram cookies to `account.txt` in Netscape format.
- Set your Developer ID in `config/default.json` under `devUsers`.

### 3. Running
```bash
# Start bot and dashboard concurrently
npm run start:all

# Start only the bot
npm start

# Start only the dashboard
npm run dashboard
```

## Dashboard

The premium dashboard provides real-time monitoring and control.
- **Login:** Access via `http://localhost:3000` (default port).
- **Default Password:** `admin123` (change in `config/default.json`).
- **Features:** Real-time uptime, message/command stats, live log streaming via Socket.IO, and bot status indicators.

## Role System

| Role | Name | Who |
|------|------|-----|
| `0` | Everyone | Any user |
| `1` | Group Admin | Thread-level administrators |
| `2` | Bot Admin | IDs in `adminBot` list |
| `3` | Premium User | IDs in `premiumUsers` list |
| `4` | Bot Developer| IDs in `devUsers` list (Full Access) |

## Creating Commands

Commands follow the `GoatBot-IG-Port` template but use `InstaBOT`'s `api.*` methods.

```javascript
module.exports = {
  config: {
    name: 'hello',
    description: 'A friendly greeting',
    usage: 'hello',
    role: 0,
    cooldown: 5,
    category: 'fun'
  },

  async run({ api, event, args, bot, database, logger }) {
    await api.sendMessage('Hello there!', event.threadId);
  }
};
```

### Supported `api` Methods:
- `api.sendMessage(text, threadID)`
- `api.replyToMessage(threadID, text, messageID)`
- `api.sendPhoto(photoPath, threadID, opts)`
- `api.sendPhotoFromUrl(threadID, url, opts)`
- `api.getUserInfo(userID)`
- `api.unsendMessage(threadID, messageID)`
- ... and more in `bot/InstagramBot.js`.

## Creating Events

Events are auto-loaded and must match Instagram MQTT event types.

```javascript
module.exports = {
  config: {
    name: 'bot_added',
    description: 'Handles bot joining a group'
  },

  async run(bot, event) {
    await bot.api.sendMessage('I have arrived!', event.threadId);
  }
};
```

## Configuration Reference

Key fields in `config/default.json`:
- `instagramAccount`: Credentials and cookie refresh settings.
- `prefix`: Global command prefix (default `!`).
- `noPrefix`: Allows admins/devs to bypass prefix.
- `spamProtection`: Thresholds for automatic user banning.
- `database`: Configuration for SQLite or MongoDB.
- `typingIndicator`: Toggle for simulated typing.

## Library Rebrand Note

The underlying Instagram API library has been rebranded from `@gtajisan/nkxica` to `@gtajisan/nkxica`. This was a metadata-only change to align with the Gtajisan ecosystem; all functional logic remains identical to the original library.
