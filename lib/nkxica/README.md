# @gtajisan/nkxica

<p align="center">
  <strong>NKXICA - Auto-loading Instagram Chat API</strong><br>
  <em>Build Instagram chatbots using personal accounts with MQTT real-time messaging</em>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@gtajisan/nkxica"><img src="https://img.shields.io/npm/v/@gtajisan/nkxica.svg" alt="npm version"></a>
  <a href="https://github.com/gtajisan/nkxica/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@gtajisan/nkxica.svg" alt="license"></a>
</p>

---

## 📦 Installation

```bash
npm install @gtajisan/nkxica
```

> Requires Node.js **20.0.0+**. TypeScript declarations are bundled — `import { login, Api, Health } from '@gtajisan/nkxica'` just works.

---

## ✨ What's new in 1.0.3

- **Adaptive rate limiting & circuit breaker** — the HTTP layer now learns per-endpoint delays from `429 Retry-After` headers and short-circuits requests to failing hosts to protect long-running bots.
- **Network-error retry with backoff + jitter** — transient `ECONNRESET` / `ETIMEDOUT` / `EAI_AGAIN` failures retry automatically.
- **MQTT exponential backoff with jitter** — replaces the previous fixed 5 s reconnect loop; resets after a successful handshake.
- **Idempotency** — pass `idempotencyKey` on `sendMessage` / `replyToMessage` to safely retry sends without double-posting:
  ```js
  await api.sendMessage({ body: 'hello', idempotencyKey: 'order-42-confirmed' }, threadID);
  ```
- **Per-thread send pacing** — automatic ≥800 ms spacing between sends to the same thread.
- **Health endpoint** for monitoring:
  ```js
  const h = api.getHealth();
  // { authenticated, listening, mqtt: { connected, reconnectAttempts, ... },
  //   http:  { msSinceLastSuccess, circuits, rateLimits }, ... }
  ```
- **Stricter validation** — message body length caps and per-kind media size limits (image 8 MB, video 100 MB, audio 25 MB) checked **before** the file is loaded into memory.
- **Listener-leak fix** — re-authenticating in the same process no longer accumulates stale MQTT listeners.
- **`searchReels(query, opts)`** — newly exposed on the API.
- **TypeScript declarations** shipped (`index.d.ts`).

---

## 🚀 Quick Start

```javascript
const { login } = require('@gtajisan/nkxica');

// Cookie login (recommended)
const api = await login('sessionid=...; ds_user_id=...; csrftoken=...; ig_did=...');

api.listen((err, event) => {
  if (err) return console.error(err);

  if (event.type === 'message') {
    api.sendMessage(`Echo: ${event.body}`, event.threadID);
  }
});
```

---

## 🔑 Authentication

### Cookie login (recommended)

Get your cookies from your browser's DevTools → Application → Cookies → instagram.com.
The four required cookies are: `sessionid`, `ds_user_id`, `csrftoken`, `ig_did`.

```javascript
const { login } = require('@gtajisan/nkxica');

// String format
const api = await login('sessionid=...; ds_user_id=...; csrftoken=...; ig_did=...');

// JSON array (export from a browser cookie extension)
const api = await login([
  { name: 'sessionid',  value: '...', domain: '.instagram.com', path: '/' },
  { name: 'ds_user_id', value: '...', domain: '.instagram.com', path: '/' },
  { name: 'csrftoken',  value: '...', domain: '.instagram.com', path: '/' },
  { name: 'ig_did',     value: '...', domain: '.instagram.com', path: '/' }
]);
```

### Password login

```javascript
const { login } = require('@gtajisan/nkxica');

try {
  const api = await login({ username: 'YOUR_USERNAME', password: 'YOUR_PASSWORD' });
} catch (err) {
  if (err.twoFactorRequired) {
    await err.verify('YOUR_2FA_CODE');  // code from your authenticator app
  }
}
```

---

## ⚙️ Options

Pass options as the second argument to `login()`:

```javascript
const api = await login(cookies, {
  selfListen: false,      // Receive your own sent messages as events
  listenEvents: true,     // Receive non-message events (typing, read receipts, etc.)
  autoMarkRead: false,    // Auto-mark every incoming message as read
  logLevel: 'info',       // 'silly' | 'debug' | 'verbose' | 'info' | 'warn' | 'error' | 'silent'
  database: false,        // Enable SQLite message persistence
  scheduler: false        // Enable cron-based task scheduler
});
```

### Available Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `selfListen` | boolean | `false` | Listen to own messages |
| `listenEvents` | boolean | `true` | Listen for events (read receipts, typing) |
| `autoMarkRead` | boolean | `false` | Auto mark messages as read |
| `autoMarkDelivery` | boolean | `true` | Auto mark messages as delivered |
| `logLevel` | string | `'info'` | Log level: silly, debug, verbose, info, warn, error, silent |
| `logColors` | boolean | `true` | Enable colored logs |
| `database` | boolean | `false` | Enable SQLite database for message persistence |
| `scheduler` | boolean | `false` | Enable cron-based task scheduler |
| `proxy` | string | `null` | HTTP proxy URL |
| `autoReconnect` | boolean | `true` | Auto reconnect on disconnect |
| `maxRetries` | number | `3` | Max retry attempts |

---

## 📚 API Reference

All methods are available on the `api` object returned by `login()`.

### Identity

```javascript
const me = api.getCurrentUserID();
// { userID, username }
```

### Listening

```javascript
api.listen((err, event) => { ... });
api.stopListening();

api.on('connected', ({ method }) => { ... });
api.on('disconnected', () => { ... });
api.on('error', (err) => { ... });
```

### Messaging

```javascript
await api.sendMessage('Hello!', threadID);
await api.sendDirectMessage(userID, 'Hey');
await api.replyToMessage(threadID, 'Reply text', replyToMessageID);
await api.unsendMessage(messageID);
```

### Media

```javascript
await api.sendPhoto(threadID, './photo.jpg');
await api.sendPhotoFromUrl(threadID, 'https://example.com/image.jpg');
await api.sendVideo(threadID, './clip.mp4');
await api.sendVideoFromUrl(threadID, 'https://example.com/video.mp4');
await api.sendVoice(threadID, './voice.m4a');
await api.sendVoiceFromUrl(threadID, 'https://example.com/audio.mp3');
await api.sendGIF(threadID, 'https://media.giphy.com/...');
```

### Reactions

```javascript
await api.sendReaction('❤️', messageID);
await api.removeReaction(messageID);
```

### Threads

```javascript
const inbox   = await api.getInbox({ limit: 20 });
const info    = await api.getThreadInfo(threadID);
const history = await api.getThreadHistory(threadID, 30);
await api.markAsRead(threadID);
await api.markAsUnread(threadID);
await api.deleteThread(threadID);
```

### Typing

```javascript
await api.sendTypingIndicator(threadID);
await api.stopTypingIndicator(threadID);
```

### Users

```javascript
const user = await api.getUserInfo(userID);
const user = await api.getUserInfoByUsername('instagram');
const results = await api.searchUsers('alice', { limit: 5 });
```

### Stories

```javascript
const stories = await api.getUserStories(userID);
const feed    = await api.getFeedStories({ limit: 10 });
await api.reactToStory(storyId, userId, '🔥');
await api.replyToStory(storyId, userId, 'Great story!');
```

### Live

```javascript
const feed = await api.getLiveFeed({ limit: 5 });
await api.sendLiveComment(broadcastId, 'Hello!');
await api.sendLiveHeart(broadcastId, 5);
```

### Search

```javascript
const users    = await api.searchUsers('alice');
const hashtags = await api.searchHashtags('photography');
const places   = await api.searchPlaces('New York');
```

### Session

```javascript
const state = api.getSession();          // serialize session to JSON
await api.loadSession(state);            // restore from serialized state
await api.logout();
```

### Scheduler

```javascript
const api = await login(cookies, { scheduler: true });

api.scheduleTask('morning', '0 9 * * *', async () => {
  await api.sendMessage('Good morning!', threadID);
});
```

### Database

```javascript
const api = await login(cookies, { database: true, dbOptions: { storage: './messages.db' } });
await api.initDatabase();
```

---

## 💡 Examples

### Echo Bot

```javascript
const { login } = require('@gtajisan/nkxica');

const api = await login(process.env.IG_COOKIES, { logLevel: 'info' });
const me  = api.getCurrentUserID();

api.listen((err, event) => {
  if (err || event.type !== 'message') return;
  if (event.senderID === me.userID) return;

  api.sendMessage(`Echo: ${event.body}`, event.threadID);
});
```

### Command Bot

```javascript
const { login } = require('@gtajisan/nkxica');

const api = await login(process.env.IG_COOKIES, { logLevel: 'info', autoMarkRead: true });
const me  = api.getCurrentUserID();

api.listen((err, event) => {
  if (err || event.type !== 'message') return;
  if (event.senderID === me.userID) return;

  const body     = event.body.toLowerCase();
  const threadID = event.threadID;

  switch (body) {
    case 'ping':
      api.sendMessage('pong! 🏓', threadID);
      break;

    case 'info':
      api.getThreadInfo(threadID).then(info => {
        api.sendMessage(`Thread: ${info.name}`, threadID);
      });
      break;
  }
});
```

### Multi-Account

```javascript
const { login } = require('@gtajisan/nkxica');

const [api1, api2] = await Promise.all([
  login(process.env.COOKIES_ACCOUNT_1),
  login(process.env.COOKIES_ACCOUNT_2)
]);

api1.listen((err, event) => { /* ... */ });
api2.listen((err, event) => { /* ... */ });
```

### Advanced (custom options)

```javascript
const { login } = require('@gtajisan/nkxica');

const api = await login(cookies, {
  logLevel: 'debug',
  database: true,
  proxy: 'http://proxy:8080'
});

api.listen((err, event) => { /* ... */ });
```

---

## 🔧 Cookie Utilities

`login.CookieUtils` is available directly from the `login` import — no extra destructuring needed.

```javascript
const { login } = require('@gtajisan/nkxica');

const jar = login.CookieUtils.parse('sessionid=abc; csrftoken=xyz');
const jar = login.CookieUtils.parseJSON('[{"name":"sessionid","value":"abc","domain":".instagram.com","path":"/"}]');
const jar = login.CookieUtils.loadFromFile('./cookies.txt');

login.CookieUtils.saveToFile(jar, './cookies_netscape.txt', 'netscape');
login.CookieUtils.saveToFile(jar, './cookies.json', 'json');
```

After logging in, `api.CookieUtils` is also available on the api object itself.

---

## 👨‍💻 Credits

**Owner:** Gtajisan (Gtajisan)
**Email:** gtajisan@gmail.com
**GitHub:** [@gtajisan](https://github.com/gtajisan)

---

## ⚠️ Disclaimer

This is an **unofficial** Instagram API. Use at your own risk.

- Use dedicated bot accounts for automation
- Avoid excessive messaging
- Not affiliated with Instagram/Meta

---

## 📄 License

MIT © 2026 Gtajisan - Gtajisan
