// ==================== APP STATE ====================
const state = {
  currentView: 'auth',
  username: null,
  sites: [],
  currentSite: null,
  charts: {}
};

// ==================== API HELPERS ====================
async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ==================== VIEW MANAGEMENT ====================
function showScreen(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(`${screen}-screen`).classList.remove('hidden');
}

function showView(view) {
  ['dashboard-view', 'add-site-view', 'results-view'].forEach(v => {
    document.getElementById(v).classList.add('hidden');
  });
  document.getElementById(`${view}-view`).classList.remove('hidden');
  state.currentView = view;
}

// ==================== AUTH ====================
function initAuth() {
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
      document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
    });
  });

  // Login
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('login-error');
    errEl.textContent = '';
    try {
      const data = await api('/api/login', {
        method: 'POST',
        body: JSON.stringify({
          email: document.getElementById('login-email').value,
          password: document.getElementById('login-password').value
        })
      });
      state.username = data.username;
      enterDashboard();
    } catch (err) {
      errEl.textContent = err.message;
    }
  });

  // Register
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('register-error');
    errEl.textContent = '';
    try {
      const data = await api('/api/register', {
        method: 'POST',
        body: JSON.stringify({
          username: document.getElementById('reg-username').value,
          email: document.getElementById('reg-email').value,
          password: document.getElementById('reg-password').value
        })
      });
      state.username = data.username;
      enterDashboard();
    } catch (err) {
      errEl.textContent = err.message;
    }
  });
}

// ==================== DASHBOARD ====================
async function enterDashboard() {
  document.getElementById('nav-user').textContent = `👤 ${state.username}`;
  showScreen('dashboard');
  showView('dashboard');
  await loadSites();
}

async function loadSites() {
  try {
    state.sites = await api('/api/sites');
    renderSites();
    renderStats();
  } catch {
    state.sites = [];
    renderSites();
  }
}

function renderStats() {
  const sites = state.sites;
  document.getElementById('stat-total').textContent = sites.length;

  if (sites.length === 0) {
    document.getElementById('stat-avg-score').textContent = '—';
    document.getElementById('stat-best').textContent = '—';
    document.getElementById('stat-total-area').textContent = '—';
    return;
  }

  const avgScore = sites.reduce((sum, s) => sum + s.feasibility_score, 0) / sites.length;
  document.getElementById('stat-avg-score').textContent = `${Math.round(avgScore * 100)}%`;

  const best = Math.max(...sites.map(s => s.feasibility_score));
  document.getElementById('stat-best').textContent = `${Math.round(best * 100)}%`;

  const totalArea = sites.reduce((sum, s) => sum + s.size_sqft, 0);
  document.getElementById('stat-total-area').textContent = totalArea.toLocaleString();
}

function renderSites() {
  const container = document.getElementById('sites-list');

  if (state.sites.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📍</div>
        <h3>No sites yet</h3>
        <p>Add your first site to get AI-powered feasibility analysis</p>
      </div>`;
    return;
  }

  container.innerHTML = state.sites.map(site => {
    const pct = Math.round(site.feasibility_score * 100);
    const tier = pct >= 75 ? 'high' : pct >= 50 ? 'medium' : 'low';
    return `
      <div class="site-card fade-in" data-id="${site.id}">
        <div class="site-card-header">
          <span class="site-card-name">${escapeHtml(site.name)}</span>
          <div style="display:flex;gap:0.5rem;align-items:center;">
            <span class="site-card-ai ${site.ai_powered ? 'real' : 'fallback'}">${site.ai_powered ? '🤖 AI' : '⚙️ Basic'}</span>
            <span class="site-card-score ${tier}">${pct}%</span>
          </div>
        </div>
        <div class="site-card-meta">
          <span>📍 ${escapeHtml(site.location)}</span>
          <span>📐 ${Number(site.size_sqft).toLocaleString()} sqft · ${escapeHtml(capitalize(site.zoning))}</span>
          <span>💰 ₱${Number(site.estimated_cost).toLocaleString()}</span>
        </div>
        <div class="site-card-actions">
          <button class="btn btn-danger delete-site-btn" data-id="${site.id}" title="Delete">🗑 Delete</button>
        </div>
      </div>`;
  }).join('');

  // Click handlers for cards
  container.querySelectorAll('.site-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.delete-site-btn')) return;
      const id = parseInt(card.dataset.id);
      viewResults(id);
    });
  });

  // Delete buttons
  container.querySelectorAll('.delete-site-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      if (confirm('Delete this site?')) {
        await api(`/api/sites/${id}`, { method: 'DELETE' });
        await loadSites();
      }
    });
  });
}

// ==================== ADD SITE ====================
function initAddSite() {
  document.getElementById('add-site-btn').addEventListener('click', () => {
    showView('add-site');
    document.getElementById('site-form').reset();
    document.getElementById('site-form-error').textContent = '';
  });

  document.getElementById('back-to-dashboard').addEventListener('click', () => {
    showView('dashboard');
  });

  document.getElementById('site-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('site-form-error');
    const btnText = document.querySelector('#analyze-btn .btn-text');
    const btnLoading = document.querySelector('#analyze-btn .btn-loading');
    errEl.textContent = '';

    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');

    try {
      const site = await api('/api/sites', {
        method: 'POST',
        body: JSON.stringify({
          name: document.getElementById('site-name').value,
          location: document.getElementById('site-location').value,
          size_sqft: parseFloat(document.getElementById('site-size').value),
          zoning: document.getElementById('site-zoning').value,
          latitude: document.getElementById('site-lat').value || null,
          longitude: document.getElementById('site-lng').value || null,
          estimated_cost: parseFloat(document.getElementById('site-cost').value)
        })
      });
      state.sites.unshift(site);
      viewResults(site.id);
    } catch (err) {
      errEl.textContent = err.message;
    } finally {
      btnText.classList.remove('hidden');
      btnLoading.classList.add('hidden');
    }
  });
}

// ==================== RESULTS VIEW ====================
async function viewResults(siteId) {
  try {
    const site = await api(`/api/sites/${siteId}`);
    state.currentSite = site;
    renderResults(site);
    showView('results');
  } catch (err) {
    alert('Could not load site: ' + err.message);
  }
}

function renderResults(site) {
  document.getElementById('result-site-name').textContent = site.name;
  document.getElementById('result-site-location').textContent = site.location;

  // AI badge
  const badge = document.getElementById('ai-badge');
  if (site.ai_powered) {
    badge.className = 'ai-badge ai-real';
    badge.textContent = '🤖 Powered by Gemini AI';
  } else {
    badge.className = 'ai-badge ai-fallback';
    badge.textContent = '⚙️ Basic Analysis';
  }

  // Animated score circle
  const pct = Math.round(site.feasibility_score * 100);
  document.getElementById('score-value').textContent = `${pct}%`;

  const ring = document.getElementById('score-ring');
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (site.feasibility_score * circumference);
  ring.style.strokeDasharray = circumference;
  ring.style.strokeDashoffset = circumference;
  setTimeout(() => { ring.style.strokeDashoffset = offset; }, 100);

  // Score color
  if (pct >= 75) {
    ring.style.stroke = 'var(--success)';
    document.getElementById('score-verdict').textContent = '✅ Highly Feasible';
    document.getElementById('score-verdict').style.color = 'var(--success)';
  } else if (pct >= 50) {
    ring.style.stroke = 'var(--warning)';
    document.getElementById('score-verdict').textContent = '⚠️ Moderately Feasible';
    document.getElementById('score-verdict').style.color = 'var(--warning)';
  } else {
    ring.style.stroke = 'var(--danger)';
    document.getElementById('score-verdict').textContent = '❌ Low Feasibility';
    document.getElementById('score-verdict').style.color = 'var(--danger)';
  }

  // Radar chart
  renderRadarChart(site);

  // Bar chart
  renderBarChart(site);

  // Site details
  document.getElementById('site-details').innerHTML = [
    { label: 'Location', value: site.location },
    { label: 'Size', value: `${Number(site.size_sqft).toLocaleString()} sqft` },
    { label: 'Zoning', value: capitalize(site.zoning) },
    { label: 'Est. Cost', value: `₱${Number(site.estimated_cost).toLocaleString()}` },
    { label: 'Cost/sqft', value: `₱${(site.estimated_cost / site.size_sqft).toFixed(2)}` },
    { label: 'Analyzed', value: new Date(site.created_at).toLocaleDateString() }
  ].map(d => `
    <div class="detail-item">
      <div class="label">${d.label}</div>
      <div class="value">${escapeHtml(String(d.value))}</div>
    </div>
  `).join('');

  // AI Summary
  const summaryCard = document.getElementById('ai-summary-card');
  if (site.ai_summary) {
    summaryCard.style.display = '';
    document.getElementById('ai-summary-text').textContent = site.ai_summary;
  } else {
    summaryCard.style.display = 'none';
  }

  // GPS Map
  renderMap(site);

  // Recommendations (AI-generated or fallback)
  renderRecommendations(site);
}

function renderRadarChart(site) {
  const ctx = document.getElementById('radar-chart').getContext('2d');
  if (state.charts.radar) state.charts.radar.destroy();

  state.charts.radar = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Environmental', 'Market', 'Infrastructure', 'Regulatory'],
      datasets: [{
        label: 'Score',
        data: [
          site.environmental_score * 100,
          site.market_score * 100,
          site.infrastructure_score * 100,
          site.regulatory_score * 100
        ],
        backgroundColor: 'rgba(108, 92, 231, 0.2)',
        borderColor: '#6c5ce7',
        borderWidth: 2,
        pointBackgroundColor: '#6c5ce7',
        pointBorderColor: '#fff',
        pointBorderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: { display: false },
          grid: { color: 'rgba(255,255,255,0.08)' },
          angleLines: { color: 'rgba(255,255,255,0.08)' },
          pointLabels: { color: '#8b8fa3', font: { size: 11 } }
        }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function renderBarChart(site) {
  const ctx = document.getElementById('bar-chart').getContext('2d');
  if (state.charts.bar) state.charts.bar.destroy();

  const scores = [
    site.environmental_score * 100,
    site.market_score * 100,
    site.infrastructure_score * 100,
    site.regulatory_score * 100
  ];

  const colors = scores.map(s => s >= 75 ? '#00cec9' : s >= 50 ? '#fdcb6e' : '#ff7675');

  state.charts.bar = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Environmental', 'Market', 'Infrastructure', 'Regulatory'],
      datasets: [{
        label: 'Score %',
        data: scores,
        backgroundColor: colors,
        borderRadius: 6,
        barThickness: 40
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#8b8fa3' }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#8b8fa3', font: { size: 11 } }
        }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function renderMap(site) {
  const mapCard = document.getElementById('map-card');
  const mapContainer = document.getElementById('site-map');

  if (site.latitude && site.longitude) {
    mapCard.style.display = '';
    mapContainer.innerHTML = '';

    // Destroy previous map instance if any
    if (state.map) {
      state.map.remove();
      state.map = null;
    }

    const map = L.map(mapContainer).setView([site.latitude, site.longitude], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
    L.marker([site.latitude, site.longitude])
      .addTo(map)
      .bindPopup(`<b>${escapeHtml(site.name)}</b><br>${escapeHtml(site.location)}`)
      .openPopup();
    state.map = map;

    // Fix tile rendering when container was hidden
    setTimeout(() => map.invalidateSize(), 200);
  } else {
    mapCard.style.display = 'none';
  }
}

function renderRecommendations(site) {
  // Use AI-generated recommendations if available
  if (site.ai_recommendations) {
    let aiRecs = [];
    try {
      aiRecs = typeof site.ai_recommendations === 'string'
        ? JSON.parse(site.ai_recommendations) : site.ai_recommendations;
    } catch { aiRecs = []; }

    if (aiRecs.length > 0) {
      document.getElementById('recommendations').innerHTML = aiRecs.map(r => `
        <div class="recommendation">
          <span class="rec-icon">${escapeHtml(r.icon || '📌')}</span>
          <div class="rec-text">
            <strong>${escapeHtml(r.title || 'Recommendation')}</strong>
            ${escapeHtml(r.text || '')}
          </div>
        </div>
      `).join('');
      return;
    }
  }

  // Fallback static recommendations
  const recs = [];
  const scores = {
    environmental: site.environmental_score,
    market: site.market_score,
    infrastructure: site.infrastructure_score,
    regulatory: site.regulatory_score
  };

  if (scores.environmental < 0.6) {
    recs.push({ icon: '🌿', title: 'Environmental Concern', text: 'Consider conducting a thorough environmental impact assessment. Explore green building options to improve sustainability metrics.' });
  } else {
    recs.push({ icon: '🌿', title: 'Environmental: Strong', text: 'Site shows good environmental compatibility. Consider LEED certification to maximize green building incentives.' });
  }

  if (scores.market < 0.6) {
    recs.push({ icon: '📊', title: 'Market Analysis Needed', text: 'The market score is below optimal. Research local demand trends and consider adjusting the project scope or target demographic.' });
  } else {
    recs.push({ icon: '📊', title: 'Market: Favorable', text: 'Strong market indicators suggest good demand. Proceed with detailed market research to validate pricing strategy.' });
  }

  if (scores.infrastructure < 0.6) {
    recs.push({ icon: '🏗️', title: 'Infrastructure Gaps', text: 'Infrastructure score suggests potential challenges. Evaluate utility access, transportation links, and required site improvements.' });
  } else {
    recs.push({ icon: '🏗️', title: 'Infrastructure: Adequate', text: 'Existing infrastructure supports development. Verify utility capacity and plan for any necessary upgrades early in the process.' });
  }

  if (scores.regulatory < 0.6) {
    recs.push({ icon: '📋', title: 'Regulatory Hurdles', text: 'Zoning or regulatory challenges detected. Engage with local planning authorities early and consider variance applications if needed.' });
  } else {
    recs.push({ icon: '📋', title: 'Regulatory: Favorable', text: 'Site aligns well with current zoning regulations. Ensure all permits are in order and monitor for upcoming zoning changes.' });
  }

  document.getElementById('recommendations').innerHTML = recs.map(r => `
    <div class="recommendation">
      <span class="rec-icon">${r.icon}</span>
      <div class="rec-text">
        <strong>${r.title}</strong>
        ${r.text}
      </div>
    </div>
  `).join('');
}

// ==================== NAVIGATION ====================
function initNavigation() {
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await api('/api/logout', { method: 'POST' });
    state.username = null;
    state.sites = [];
    showScreen('auth');
  });

  document.getElementById('back-to-dashboard-2').addEventListener('click', () => {
    showView('dashboard');
    loadSites();
  });
}

// ==================== UTILS ====================
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ==================== INIT ====================
async function init() {
  initAuth();
  initAddSite();
  initNavigation();

  // Check if already authenticated
  try {
    const user = await api('/api/me');
    state.username = user.username;
    enterDashboard();
  } catch {
    showScreen('auth');
  }
}

document.addEventListener('DOMContentLoaded', init);
