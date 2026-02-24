/* ============================================================
   sections/analises.js — Análises com Chart.js
   ============================================================ */
let _charts = {};

async function renderAnalises(container) {
  let avatares = app.getAvatares();
  if (!avatares.length && DB.ready()) {
    const { data } = await DB.getAvatares();
    avatares = data || [];
    app.setAvatares(avatares);
  }

  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Análises</div>
        <div class="section-subtitle">Performance dos teus avatares</div>
      </div>
      <select class="form-control" style="width:auto" id="an-avatar" onchange="loadAnalytics()">
        <option value="">Todos os avatares</option>
        ${avatares.map(a => `<option value="${a.id}">${a.nome}</option>`).join('')}
      </select>
    </div>

    <!-- KPI row -->
    <div class="grid-4 mb-3" id="an-kpis">
      ${kpiCard('fa-heart','var(--pink-soft)','var(--pink)','—','Total Likes')}
      ${kpiCard('fa-comment','var(--blue-soft)','var(--blue)','—','Comentários')}
      ${kpiCard('fa-eye','var(--accent-soft)','var(--accent)','—','Visualizações')}
      ${kpiCard('fa-paper-plane','var(--green-soft)','var(--green)','—','Posts publicados')}
    </div>

    <div class="grid-2 mb-3">
      <!-- Engagement por plataforma -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Likes por plataforma</div>
        </div>
        <div class="chart-container"><canvas id="chart-platforms"></canvas></div>
      </div>

      <!-- Posts por avatar -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Posts por avatar</div>
        </div>
        <div class="chart-container"><canvas id="chart-avatars"></canvas></div>
      </div>
    </div>

    <!-- Timeline -->
    <div class="card mb-3">
      <div class="card-header">
        <div class="card-title">Engagement ao longo do tempo</div>
        <div class="card-subtitle">Últimos 30 dias</div>
      </div>
      <div class="chart-container" style="height:200px"><canvas id="chart-timeline"></canvas></div>
    </div>

    <!-- Best times -->
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">Melhor hora por plataforma</div></div>
        <div id="an-best-times"></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Top posts</div></div>
        <div id="an-top-posts"></div>
      </div>
    </div>`;

  // Destroy old charts
  Object.values(_charts).forEach(c => c?.destroy());
  _charts = {};

  await loadAnalytics();
}

async function loadAnalytics() {
  const avatarId = document.getElementById('an-avatar')?.value || '';
  let data = [];

  if (DB.ready()) {
    const res = await DB.getAnalytics(avatarId || undefined);
    data = res.data || [];
  } else {
    data = getDemoData();
  }

  updateKPIs(data);
  renderPlatformChart(data);
  renderAvatarChart(data, app.getAvatares());
  renderTimelineChart(data);
  renderBestTimes(data);
  renderTopPosts(data);
}

function getDemoData() {
  const platforms = ['instagram','instagram','tiktok','tiktok','facebook','youtube'];
  const avatarIds = ['luna','aria','zara','nova'];
  const now = new Date();
  return Array.from({ length: 60 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    return {
      plataforma:   platforms[i % platforms.length],
      avatar_id:    avatarIds[i % avatarIds.length],
      likes:        Math.floor(Math.random() * 3000 + 200),
      comentarios:  Math.floor(Math.random() * 200 + 10),
      partilhas:    Math.floor(Math.random() * 100),
      visualizacoes:Math.floor(Math.random() * 20000 + 1000),
      publicado_em: d.toISOString(),
    };
  });
}

function updateKPIs(data) {
  const totalLikes  = data.reduce((s, d) => s + (d.likes  || 0), 0);
  const totalComs   = data.reduce((s, d) => s + (d.comentarios || 0), 0);
  const totalViews  = data.reduce((s, d) => s + (d.visualizacoes || 0), 0);
  const kpis        = document.getElementById('an-kpis');
  if (!kpis) return;
  kpis.innerHTML = `
    ${kpiCard('fa-heart','var(--pink-soft)','var(--pink)',app.formatNumber(totalLikes),'Total Likes')}
    ${kpiCard('fa-comment','var(--blue-soft)','var(--blue)',app.formatNumber(totalComs),'Comentários')}
    ${kpiCard('fa-eye','var(--accent-soft)','var(--accent)',app.formatNumber(totalViews),'Visualizações')}
    ${kpiCard('fa-paper-plane','var(--green-soft)','var(--green)',data.length,'Posts publicados')}`;
}

function kpiCard(icon, bgSoft, color, value, label) {
  return `
    <div class="stat-card">
      <div class="stat-icon" style="background:${bgSoft}"><i class="fa-solid ${icon}" style="color:${color}"></i></div>
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
    </div>`;
}

function renderPlatformChart(data) {
  const platforms = ['instagram','tiktok','facebook','youtube'];
  const totals    = platforms.map(p => data.filter(d => d.plataforma === p).reduce((s, d) => s + (d.likes || 0), 0));
  const colors    = ['#ec4899','#e5e5e5','#3b82f6','#ef4444'];

  const ctx = document.getElementById('chart-platforms');
  if (!ctx) return;
  _charts.platforms = new Chart(ctx, {
    type: 'doughnut',
    data: { labels: platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)), datasets: [{ data: totals, backgroundColor: colors, borderWidth: 0 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#9494b0', boxWidth: 12 } } }
    }
  });
}

function renderAvatarChart(data, avatares) {
  const labels = avatares.length ? avatares.map(a => a.nome) : ['Luna','Aria','Zara','Nova'];
  const ids    = avatares.length ? avatares.map(a => a.id)   : ['luna','aria','zara','nova'];
  const counts = ids.map(id => data.filter(d => String(d.avatar_id) === String(id)).length);
  const colors = ['#7c3aed','#ec4899','#10b981','#f59e0b'];

  const ctx = document.getElementById('chart-avatars');
  if (!ctx) return;
  _charts.avatars = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ data: counts, backgroundColor: colors, borderRadius: 6, borderSkipped: false }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#9494b0' }, grid: { color: '#2a2a38' } },
        y: { ticks: { color: '#9494b0' }, grid: { color: '#2a2a38' } }
      }
    }
  });
}

function renderTimelineChart(data) {
  // Group by day (last 30 days)
  const now    = new Date();
  const labels = [];
  const values = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    labels.push(key.slice(5)); // MM-DD
    const dayData = data.filter(x => x.publicado_em && x.publicado_em.slice(0, 10) === key);
    values.push(dayData.reduce((s, x) => s + (x.likes || 0), 0));
  }

  const ctx = document.getElementById('chart-timeline');
  if (!ctx) return;
  _charts.timeline = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: '#7c3aed',
        backgroundColor: 'rgba(124,58,237,0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#9494b0', maxTicksLimit: 8 }, grid: { color: '#2a2a38' } },
        y: { ticks: { color: '#9494b0' }, grid: { color: '#2a2a38' } }
      }
    }
  });
}

function renderBestTimes(data) {
  const el = document.getElementById('an-best-times');
  if (!el) return;
  const platforms = ['instagram','tiktok','facebook','youtube'];
  const colors    = { instagram: 'var(--pink)', tiktok: '#ccc', facebook: 'var(--blue)', youtube: 'var(--red)' };

  // Find hour with most likes per platform
  const bestHours = platforms.map(pl => {
    const plData = data.filter(d => d.plataforma === pl && d.publicado_em);
    if (!plData.length) return { pl, hour: '—', likes: 0 };
    const hourMap = {};
    plData.forEach(d => {
      const h = new Date(d.publicado_em).getHours();
      hourMap[h] = (hourMap[h] || 0) + (d.likes || 0);
    });
    const best = Object.entries(hourMap).sort((a, b) => b[1] - a[1])[0];
    return { pl, hour: best ? `${best[0]}h00` : '—', likes: best?.[1] || 0 };
  });

  el.innerHTML = bestHours.map(b => `
    <div class="metric-row">
      <span class="metric-label">${app.platformIcon(b.pl)} ${b.pl}</span>
      <span class="metric-value" style="color:${colors[b.pl]}">${b.hour}</span>
    </div>`).join('');
}

function renderTopPosts(data) {
  const el = document.getElementById('an-top-posts');
  if (!el) return;
  const top = [...data].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 4);
  if (!top.length) { el.innerHTML = '<div class="text-muted text-sm text-center" style="padding:20px">Sem dados</div>'; return; }
  el.innerHTML = top.map((p, i) => `
    <div class="metric-row">
      <span class="metric-label">
        <span style="color:var(--accent);font-weight:800;min-width:20px">#${i + 1}</span>
        ${app.platformIcon(p.plataforma)} ${app.formatDate(p.publicado_em)?.split(',')[0] || '—'}
      </span>
      <span class="metric-value" style="color:var(--pink)">${app.formatNumber(p.likes)} <i class="fa-solid fa-heart" style="font-size:.7rem"></i></span>
    </div>`).join('');
}
