/* ============================================================
   sections/analises.js — Análises por tipo de conteúdo
   ============================================================ */
let _charts = {};

async function renderAnalises(container) {
  let avatares = app.getAvatares();
  let canais   = [];
  let musicos  = [];

  if (!avatares.length && DB.ready()) {
    const { data } = await DB.getAvatares();
    avatares = data || [];
    app.setAvatares(avatares);
  }

  if (DB.ready()) {
    const [ytRes, muRes] = await Promise.all([DB.getYoutubeChannels(), DB.getMusicos()]);
    canais  = ytRes.data || [];
    musicos = muRes.data || [];
  }

  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Análises</div>
        <div class="section-subtitle">Performance por tipo de conteúdo</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <select class="form-control" style="width:auto" id="an-tipo" onchange="switchAnalyticsType()">
          <option value="posts">Posts (Avatares)</option>
          <option value="youtube">YouTube</option>
          <option value="musicos">Música</option>
        </select>
      </div>
    </div>

    <!-- Secção Posts (avatares) -->
    <div id="an-posts-section">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:16px">
        <select class="form-control" style="width:auto" id="an-avatar" onchange="loadAnalytics()">
          <option value="">Todos os avatares</option>
          ${avatares.map(a => `<option value="${a.id}">${a.nome}</option>`).join('')}
        </select>
      </div>

      <div class="grid-4 mb-3" id="an-kpis">
        ${kpiCard('fa-heart','var(--pink-soft)','var(--pink)','—','Total Likes')}
        ${kpiCard('fa-comment','var(--blue-soft)','var(--blue)','—','Comentários')}
        ${kpiCard('fa-eye','var(--accent-soft)','var(--accent)','—','Visualizações')}
        ${kpiCard('fa-paper-plane','var(--green-soft)','var(--green)','—','Posts publicados')}
      </div>

      <div class="grid-2 mb-3">
        <div class="card">
          <div class="card-header"><div class="card-title">Likes por plataforma</div></div>
          <div class="chart-container"><canvas id="chart-platforms"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Posts por avatar</div></div>
          <div class="chart-container"><canvas id="chart-avatars"></canvas></div>
        </div>
      </div>

      <div class="card mb-3">
        <div class="card-header">
          <div class="card-title">Engagement ao longo do tempo</div>
          <div class="card-subtitle">Últimos 30 dias</div>
        </div>
        <div class="chart-container" style="height:200px"><canvas id="chart-timeline"></canvas></div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">Melhor hora por plataforma</div></div>
          <div id="an-best-times"></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Top posts</div></div>
          <div id="an-top-posts"></div>
        </div>
      </div>
    </div>

    <!-- Secção YouTube -->
    <div id="an-youtube-section" style="display:none">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:16px">
        <select class="form-control" style="width:auto" id="an-canal" onchange="loadYoutubeAnalytics()">
          <option value="">Todos os canais</option>
          ${canais.map(c => `<option value="${c.id}">${c.nome}</option>`).join('')}
        </select>
      </div>

      <div class="grid-4 mb-3" id="yt-kpis">
        ${kpiCard('fa-users','var(--red-soft)','var(--red)','—','Subscritores')}
        ${kpiCard('fa-eye','var(--accent-soft)','var(--accent)','—','Views totais')}
        ${kpiCard('fa-film','var(--yellow-soft)','var(--yellow)','—','Vídeos')}
        ${kpiCard('fa-euro-sign','var(--green-soft)','var(--green)','—','Receita/mês')}
      </div>

      <div class="grid-2 mb-3">
        <div class="card">
          <div class="card-header"><div class="card-title">Subscritores por canal</div></div>
          <div class="chart-container"><canvas id="chart-yt-subs"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Views por canal</div></div>
          <div class="chart-container"><canvas id="chart-yt-views"></canvas></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">Top canais por receita</div></div>
        <div id="yt-ranking"></div>
      </div>
    </div>

    <!-- Secção Música -->
    <div id="an-musicos-section" style="display:none">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:16px">
        <select class="form-control" style="width:auto" id="an-musico" onchange="loadMusicoAnalytics()">
          <option value="">Todos os artistas</option>
          ${musicos.map(m => `<option value="${m.id}">${m.nome}</option>`).join('')}
        </select>
      </div>

      <div class="grid-4 mb-3" id="mu-kpis">
        ${kpiCard('fa-headphones','var(--accent-soft)','var(--accent)','—','Ouvintes/mês')}
        ${kpiCard('fa-play','var(--blue-soft)','var(--blue)','—','Total Streams')}
        ${kpiCard('fa-users','var(--yellow-soft)','var(--yellow)','—','Seguidores')}
        ${kpiCard('fa-euro-sign','var(--green-soft)','var(--green)','—','Receita/mês')}
      </div>

      <div class="grid-2 mb-3">
        <div class="card">
          <div class="card-header"><div class="card-title">Streams por artista</div></div>
          <div class="chart-container"><canvas id="chart-mu-streams"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Ouvintes por artista</div></div>
          <div class="chart-container"><canvas id="chart-mu-ouvintes"></canvas></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">Top artistas por streams</div></div>
        <div id="mu-ranking"></div>
      </div>
    </div>
  `;

  destroyCharts();
  await loadAnalytics();
  _cachedCanais  = canais;
  _cachedMusicos = musicos;
  await loadYoutubeAnalytics();
  await loadMusicoAnalytics();
}

let _cachedCanais  = [];
let _cachedMusicos = [];

function switchAnalyticsType() {
  const tipo = document.getElementById('an-tipo')?.value;
  document.getElementById('an-posts-section').style.display  = tipo === 'posts'   ? '' : 'none';
  document.getElementById('an-youtube-section').style.display = tipo === 'youtube' ? '' : 'none';
  document.getElementById('an-musicos-section').style.display = tipo === 'musicos' ? '' : 'none';
  destroyCharts();
  if (tipo === 'posts')   loadAnalytics();
  if (tipo === 'youtube') loadYoutubeAnalytics();
  if (tipo === 'musicos') loadMusicoAnalytics();
}

function destroyCharts() {
  Object.values(_charts).forEach(c => c?.destroy());
  _charts = {};
}

/* ── Posts Analytics ── */
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
  const totalLikes = data.reduce((s, d) => s + (d.likes  || 0), 0);
  const totalComs  = data.reduce((s, d) => s + (d.comentarios || 0), 0);
  const totalViews = data.reduce((s, d) => s + (d.visualizacoes || 0), 0);
  const kpis       = document.getElementById('an-kpis');
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
  const now    = new Date();
  const labels = [];
  const values = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    labels.push(key.slice(5));
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
        data: values, borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.1)',
        fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2,
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

/* ── YouTube Analytics ── */
async function loadYoutubeAnalytics() {
  const canais = _cachedCanais;
  const canalId = document.getElementById('an-canal')?.value || '';

  const filtered = canalId ? canais.filter(c => String(c.id) === canalId) : canais;

  const kpis = document.getElementById('yt-kpis');
  if (!kpis) return;

  const totalSubs    = filtered.reduce((s,c) => s+(c.seguidores||0), 0);
  const totalViews   = filtered.reduce((s,c) => s+(c.total_views||0), 0);
  const totalVids    = filtered.reduce((s,c) => s+(c.videos_count||0), 0);
  const totalReceita = filtered.reduce((s,c) => s+(parseFloat(c.receita_mes)||0), 0);

  kpis.innerHTML = `
    ${kpiCard('fa-users','var(--red-soft)','var(--red)',app.formatNumber(totalSubs),'Subscritores')}
    ${kpiCard('fa-eye','var(--accent-soft)','var(--accent)',app.formatNumber(totalViews),'Views totais')}
    ${kpiCard('fa-film','var(--yellow-soft)','var(--yellow)',totalVids,'Vídeos')}
    ${kpiCard('fa-euro-sign','var(--green-soft)','var(--green)','€'+totalReceita.toFixed(2),'Receita/mês')}`;

  const labels = filtered.map(c => c.nome);
  const subData = filtered.map(c => c.seguidores || 0);
  const viewData = filtered.map(c => c.total_views || 0);
  const colors  = filtered.map((_,i) => ['#ef4444','#f59e0b','#10b981','#3b82f6','#7c3aed'][i % 5]);

  const ctxSubs  = document.getElementById('chart-yt-subs');
  const ctxViews = document.getElementById('chart-yt-views');

  if (ctxSubs && labels.length) {
    _charts.ytSubs = new Chart(ctxSubs, {
      type: 'bar',
      data: { labels, datasets: [{ data: subData, backgroundColor: colors, borderRadius: 6, borderSkipped: false }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#9494b0' }, grid: { color: '#2a2a38' } }, y: { ticks: { color: '#9494b0' }, grid: { color: '#2a2a38' } } } }
    });
  }

  if (ctxViews && labels.length) {
    _charts.ytViews = new Chart(ctxViews, {
      type: 'bar',
      data: { labels, datasets: [{ data: viewData, backgroundColor: colors, borderRadius: 6, borderSkipped: false }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#9494b0' }, grid: { color: '#2a2a38' } }, y: { ticks: { color: '#9494b0' }, grid: { color: '#2a2a38' } } } }
    });
  }

  const ranking = document.getElementById('yt-ranking');
  if (ranking) {
    const sorted = [...filtered].sort((a,b) => (parseFloat(b.receita_mes)||0)-(parseFloat(a.receita_mes)||0));
    ranking.innerHTML = sorted.length ? sorted.map((c,i) => `
      <div class="metric-row">
        <span class="metric-label"><span style="color:var(--accent);font-weight:800">#${i+1}</span> <i class="fa-brands fa-youtube" style="color:var(--red)"></i> ${c.nome}</span>
        <span class="metric-value" style="color:var(--green)">€${parseFloat(c.receita_mes||0).toFixed(2)}</span>
      </div>`).join('') : '<div class="text-muted text-sm text-center" style="padding:16px">Sem dados</div>';
  }
}

/* ── Música Analytics ── */
async function loadMusicoAnalytics() {
  const musicos = _cachedMusicos;
  const musicoId = document.getElementById('an-musico')?.value || '';

  const filtered = musicoId ? musicos.filter(m => String(m.id) === musicoId) : musicos;

  const kpis = document.getElementById('mu-kpis');
  if (!kpis) return;

  const totalOuvintes = filtered.reduce((s,m) => s+(m.ouvintes_mensais||0), 0);
  const totalStreams   = filtered.reduce((s,m) => s+(m.total_streams||0), 0);
  const totalSeg      = filtered.reduce((s,m) => s+(m.seguidores||0), 0);
  const totalReceita  = filtered.reduce((s,m) => s+(parseFloat(m.receita_mes)||0), 0);

  kpis.innerHTML = `
    ${kpiCard('fa-headphones','var(--accent-soft)','var(--accent)',app.formatNumber(totalOuvintes),'Ouvintes/mês')}
    ${kpiCard('fa-play','var(--blue-soft)','var(--blue)',app.formatNumber(totalStreams),'Total Streams')}
    ${kpiCard('fa-users','var(--yellow-soft)','var(--yellow)',app.formatNumber(totalSeg),'Seguidores')}
    ${kpiCard('fa-euro-sign','var(--green-soft)','var(--green)','€'+totalReceita.toFixed(2),'Receita/mês')}`;

  const labels    = filtered.map(m => m.nome);
  const streamData= filtered.map(m => m.total_streams || 0);
  const oupData   = filtered.map(m => m.ouvintes_mensais || 0);
  const colors    = filtered.map((_,i) => ['#7c3aed','#ec4899','#10b981','#f59e0b','#3b82f6'][i % 5]);

  const ctxStr = document.getElementById('chart-mu-streams');
  const ctxOup = document.getElementById('chart-mu-ouvintes');

  if (ctxStr && labels.length) {
    _charts.muStreams = new Chart(ctxStr, {
      type: 'bar',
      data: { labels, datasets: [{ data: streamData, backgroundColor: colors, borderRadius: 6, borderSkipped: false }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#9494b0' }, grid: { color: '#2a2a38' } }, y: { ticks: { color: '#9494b0' }, grid: { color: '#2a2a38' } } } }
    });
  }

  if (ctxOup && labels.length) {
    _charts.muOuvintes = new Chart(ctxOup, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: oupData, backgroundColor: colors, borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#9494b0', boxWidth: 12 } } } }
    });
  }

  const ranking = document.getElementById('mu-ranking');
  if (ranking) {
    const sorted = [...filtered].sort((a,b) => (b.total_streams||0)-(a.total_streams||0));
    ranking.innerHTML = sorted.length ? sorted.map((m,i) => `
      <div class="metric-row">
        <span class="metric-label"><span style="color:var(--accent);font-weight:800">#${i+1}</span> <i class="fa-solid fa-music" style="color:var(--accent)"></i> ${m.nome}</span>
        <span class="metric-value">${app.formatNumber(m.total_streams)} <i class="fa-solid fa-play" style="font-size:.7rem"></i></span>
      </div>`).join('') : '<div class="text-muted text-sm text-center" style="padding:16px">Sem dados</div>';
  }
}
