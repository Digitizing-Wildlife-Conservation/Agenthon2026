/* ═══════════════════════════════════════════════════════
   Matatu Route Intelligence — Dashboard App Logic
   Particles · Clock · SMS Sim · Live Reports · Intents
   ═══════════════════════════════════════════════════════ */

const API = window.location.origin;
let logs = [];
let intentCounts = { ROUTE_QUERY: 0, LIVE_REPORT: 0, FARE_CHECK: 0, SAFETY_ALERT: 0, UNKNOWN: 0 };

// ─── Floating Particles ───
(function initParticles() {
  // Handle signage tile loading
  document.querySelectorAll('.signage-tile').forEach(tile => {
    const bgUrl = tile.querySelector('.tile-img').style.backgroundImage.slice(5, -2);
    if (bgUrl) {
      const img = new Image();
      img.onload = () => tile.classList.add('loaded');
      img.src = bgUrl;
    }
  });

  const canvas = document.getElementById('particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, particles = [];

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * w;
      this.y = Math.random() * h;
      this.r = Math.random() * 2 + 0.5;
      this.dx = (Math.random() - 0.5) * 0.3;
      this.dy = (Math.random() - 0.5) * 0.3;
      this.opacity = Math.random() * 0.15 + 0.05;
    }
    update() {
      this.x += this.dx;
      this.y += this.dy;
      if (this.x < 0 || this.x > w || this.y < 0 || this.y > h) this.reset();
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(100, 116, 139, ${this.opacity})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < 60; i++) particles.push(new Particle());

  function animate() {
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => { p.update(); p.draw(); });
    // Draw subtle connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(100, 116, 139, ${0.03 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(animate);
  }
  animate();
})();

// ─── Live Clock ───
function updateClock() {
  const now = new Date();
  const eat = new Date(now.getTime() + (3 * 60 * 60 * 1000));
  const h = String(eat.getUTCHours()).padStart(2, '0');
  const m = String(eat.getUTCMinutes()).padStart(2, '0');
  const s = String(eat.getUTCSeconds()).padStart(2, '0');
  const el = document.getElementById('clock');
  if (el) el.textContent = `${h}:${m}:${s} EAT`;
  const st = document.getElementById('sim-time');
  if (st) st.textContent = `${h}:${m}`;
}
setInterval(updateClock, 1000);
updateClock();

// ─── Fetch Reports ───
async function fetchReports() {
  try {
    const r = await fetch(API + '/api/reports');
    const d = await r.json();
    renderReports(d.reports || []);
    document.getElementById('stat-reports').textContent = d.count || 0;
    document.getElementById('report-count').textContent = (d.count || 0) + ' active';
    const crit = (d.reports || []).filter(r => r.severity === 'critical').length;
    document.getElementById('stat-critical').textContent = crit;
    // Update trend badges
    const critTrend = document.querySelector('[data-stat="critical"] .stat-trend');
    if (critTrend) {
      critTrend.className = 'stat-trend ' + (crit > 0 ? 'up' : 'down');
      critTrend.textContent = crit > 0 ? '⚠ Active' : '✓ Clear';
    }
  } catch (e) {
    console.error('Fetch reports error:', e);
  }
}

function renderReports(reports) {
  const el = document.getElementById('reports-feed');
  if (!reports.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🛰️</div><p>Listening for crowd-sourced reports...</p><p class="empty-sub">Real-time transit data appears here</p></div>';
    return;
  }
  el.innerHTML = reports.map(r => `
    <div class="report-item ${r.severity}">
      <div class="report-meta">
        <span class="report-type">${typeIcon(r.type)} ${r.type}</span>
        <span class="report-sev ${r.severity}">${r.severity}</span>
      </div>
      <div class="report-loc">📍 ${r.location_name}${r.route_number ? ' · Route ' + r.route_number : ''}</div>
      ${r.description ? '<div class="report-desc">' + r.description + '</div>' : ''}
      <div class="report-time">🕐 ${timeAgo(r.created_at)} · ${r.upvotes} upvote${r.upvotes !== 1 ? 's' : ''} ${r.verified ? '· ✅ Verified' : ''}</div>
    </div>`).join('');
}

function typeIcon(t) {
  return { traffic: '🚗', accident: '💥', breakdown: '🔧', police: '👮', weather: '🌧️', robbery: '🚨', other: 'ℹ️' }[t] || '📌';
}

function timeAgo(ts) {
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (d < 60) return d + 's ago';
  if (d < 3600) return Math.floor(d / 60) + 'm ago';
  return Math.floor(d / 3600) + 'h ago';
}

// ─── SMS Simulator ───
function quickSend(text) {
  document.getElementById('sim-text').value = text;
  simulateSms();
}

async function simulateSms() {
  const btn = document.getElementById('sim-btn');
  const input = document.getElementById('sim-text');
  const chat = document.getElementById('sim-chat');
  const text = input.value.trim();
  if (!text) return;

  // Add user message bubble
  chat.innerHTML += `<div class="sim-msg user"><p>${escHtml(text)}</p></div>`;
  chat.scrollTop = chat.scrollHeight;
  input.value = '';
  btn.disabled = true;

  // Add typing indicator
  const typingId = 'typing-' + Date.now();
  chat.innerHTML += `<div class="sim-msg agent" id="${typingId}"><p style="color:var(--muted)">● ● ●</p></div>`;
  chat.scrollTop = chat.scrollHeight;

  try {
    const phone = '+254700100100';
    const r = await fetch(API + '/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: phone, text }),
    });
    const d = await r.json();

    // Remove typing indicator
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    if (d.response) {
      const rr = d.response;
      chat.innerHTML += `
        <div class="sim-msg agent">
          <p>${escHtml(rr.smsReply || 'No reply')}</p>
          <div class="msg-meta">${rr.intent} · ${(rr.confidence * 100).toFixed(0)}% · ${rr.smsReply?.length || 0}/160 · ${rr.processingTimeMs}ms</div>
        </div>`;
      addLog({ intent: rr.intent, text, reply: rr.smsReply, time: new Date().toISOString(), ms: rr.processingTimeMs });
      updateIntents(rr.intent);
      fetchReports();
    } else {
      chat.innerHTML += `<div class="sim-msg agent"><p style="color:var(--rose)">Error: ${JSON.stringify(d)}</p></div>`;
    }
  } catch (e) {
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();
    chat.innerHTML += `<div class="sim-msg agent"><p style="color:var(--rose)">Connection error: ${e.message}</p></div>`;
  }

  chat.scrollTop = chat.scrollHeight;
  btn.disabled = false;
  input.focus();
}

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ─── Intent Distribution ───
function updateIntents(intent) {
  if (intentCounts[intent] !== undefined) intentCounts[intent]++;
  else intentCounts[intent] = 1;

  const total = Object.values(intentCounts).reduce((a, b) => a + b, 0);
  if (total === 0) return;

  const bars = document.querySelectorAll('.intent-row');
  const keys = ['ROUTE_QUERY', 'LIVE_REPORT', 'FARE_CHECK', 'SAFETY_ALERT', 'UNKNOWN'];
  keys.forEach((key, i) => {
    if (!bars[i]) return;
    const pct = Math.round((intentCounts[key] / total) * 100);
    const bar = bars[i].querySelector('.intent-bar');
    const label = bars[i].querySelector('.intent-pct');
    if (bar) bar.style.width = pct + '%';
    if (label) label.textContent = pct;
  });
}

// ─── Message Log ───
function addLog(entry) {
  logs.unshift(entry);
  if (logs.length > 50) logs.pop();

  const el = document.getElementById('message-log');
  document.getElementById('log-count').textContent = logs.length + ' entries';
  document.getElementById('stat-messages').textContent = logs.length;

  const avg = logs.reduce((s, l) => s + (l.ms || 0), 0) / logs.length;
  document.getElementById('stat-latency').textContent = Math.round(avg);

  el.innerHTML = logs.map(l => `
    <div class="log-item">
      <span class="log-intent ${l.intent}">${l.intent}</span>
      <div class="log-content">
        <div class="log-in">"${escHtml(l.text.substring(0, 50))}${l.text.length > 50 ? '...' : ''}"</div>
        <div class="log-out">→ "${escHtml((l.reply || '').substring(0, 60))}${(l.reply || '').length > 60 ? '...' : ''}"</div>
      </div>
      <div class="log-meta">
        <div class="log-time">${l.ms}ms</div>
        <div class="log-chars">${l.reply?.length || 0}/160</div>
      </div>
    </div>`).join('');
}

// ─── Keyboard Shortcut ───
document.getElementById('sim-text').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); simulateSms(); }
});

// ─── Init ───
fetchReports();
setInterval(fetchReports, 15000);

// Stat card entrance animation
document.querySelectorAll('.stat-card').forEach((card, i) => {
  card.style.opacity = '0';
  card.style.transform = 'translateY(16px)';
  setTimeout(() => {
    card.style.transition = 'all 0.5s cubic-bezier(0.22, 1, 0.36, 1)';
    card.style.opacity = '1';
    card.style.transform = 'translateY(0)';
  }, 100 + i * 80);
});
