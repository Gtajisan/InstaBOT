const socket = io();
let authToken = localStorage.getItem('bot_token');

if (authToken) {
    showDashboard();
}

document.getElementById('login-btn').addEventListener('click', async () => {
    const password = document.getElementById('password').value;
    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
    });

    const data = await res.json();
    if (data.success) {
        authToken = data.token;
        localStorage.setItem('bot_token', authToken);
        showDashboard();
    } else {
        alert('Login failed');
    }
});

function showDashboard() {
    const loginScreen = document.getElementById('login-screen');
    const dashboard = document.getElementById('dashboard');
    if (loginScreen) loginScreen.classList.add('hidden');
    if (dashboard) dashboard.classList.remove('hidden');
    updateStats();
    setInterval(updateStats, 5000);
}

async function updateStats() {
    try {
        const res = await fetch('/api/stats', {
            headers: { 'Authorization': authToken }
        });
        if (!res.ok) throw new Error('Unauthorized');
        const stats = await res.json();

        document.getElementById('stat-messages').innerText = stats.messagesHandled || 0;
        document.getElementById('stat-commands').innerText = stats.commandsExecuted || 0;
        document.getElementById('stat-errors').innerText = stats.errorCount || 0;
        document.getElementById('stat-threads').innerText = stats.activeThreads || 0;

        const uptime = stats.uptime || 0;
        const h = Math.floor(uptime / 3600);
        const m = Math.floor((uptime % 3600) / 60);
        const s = uptime % 60;
        document.getElementById('uptime-badge').innerText = `Uptime: ${h}:${m}:${s}`;
    } catch (e) {
        console.error('Stats update failed', e);
    }
}

document.getElementById('reload-cmds-btn').addEventListener('click', () => fetch('/api/reload/commands', { method: 'POST', headers: { 'Authorization': authToken } }));
document.getElementById('reload-events-btn').addEventListener('click', () => fetch('/api/reload/events', { method: 'POST', headers: { 'Authorization': authToken } }));
document.getElementById('restart-mqtt-btn').addEventListener('click', () => fetch('/api/restart/mqtt', { method: 'POST', headers: { 'Authorization': authToken } }));

socket.on('log', (log) => {
    const container = document.getElementById('log-container');
    if (!container) return;
    const entry = document.createElement('div');
    entry.style.color = log.level === 'error' ? '#ff5252' : log.level === 'warn' ? '#ffeb3b' : '#ffffff';
    entry.innerText = `[${log.timestamp || new Date().toISOString()}] [${(log.level || 'info').toUpperCase()}] ${log.message}`;
    container.appendChild(entry);
    container.scrollTop = container.scrollHeight;
});
