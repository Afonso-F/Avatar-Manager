/* ============================================================
   sections/dashboard.js
   ============================================================ */
async function renderDashboard(container) {
  // Fetch data
  let posts = [], publicados = [];
  if (DB.ready()) {
    const [pr, pp] = await Promise.all([
      DB.getPosts({ limit: 100 }),
      DB.getPublicados({ limit: 100 })
    ]);
    posts      = pr.data || [];
    publicados = pp.data || [];
  }

  const agendados  = posts.filter(p => p.status === 'agendado').length;
  const rascunhos  = posts.filter(p => p.status === 'rascunho').length;
  const totalPub   = publicados.length;
  const totalLikes = publicados.reduce((s, p) => s + (p.likes || 0), 0);

  // Build calendar
  const hoje       = new Date();
  const scheduledDays = new Set(
    posts.filter(p => p.agendado_para).map(p => new Date(p.agendado_para).toDateString())
  );

  container.innerHTML = `
    <!-- Stats -->
    <div class="grid-4 mb-3">
      ${statCard('fa-calendar-check', 'var(--accent-soft)', 'var(--accent)', agendados, 'Posts agendados', '')}
      ${statCard('fa-file-pen',       'var(--yellow-soft)', 'var(--yellow)', rascunhos, 'Rascunhos',        '')}
      ${statCard('fa-paper-plane',    'var(--green-soft)',  'var(--green)',  totalPub,  'Publicados (total)','up')}
      ${statCard('fa-heart',          'var(--pink-soft)',   'var(--pink)',   app.formatNumber(totalLikes), 'Total de likes', 'up')}
    </div>

    <div class="grid-2 mb-3">
      <!-- Próximos posts -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Próximos posts</div>
            <div class="card-subtitle">Agendados para publicação</div>
          </div>
          <button class="btn btn-sm btn-secondary" onclick="app.navigate('fila')">Ver todos</button>
        </div>
        <div id="upcomingPosts">${renderUpcoming(posts)}</div>
      </div>

      <!-- Calendário -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Calendário</div>
        </div>
        <div class="mini-calendar">${buildCalendar(hoje, scheduledDays)}</div>
      </div>
    </div>

    <!-- Performance por plataforma -->
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Performance por plataforma</div>
          <div class="card-subtitle">Últimos 100 posts publicados</div>
        </div>
      </div>
      ${renderPlatformPerf(publicados)}
    </div>
  `;
}

function statCard(icon, bgSoft, color, value, label, trend) {
  return `
    <div class="stat-card">
      <div class="stat-icon" style="background:${bgSoft}">
        <i class="fa-solid ${icon}" style="color:${color}"></i>
      </div>
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
      ${trend ? `<div class="stat-change ${trend}"><i class="fa-solid fa-arrow-${trend === 'up' ? 'up' : 'down'}"></i> —</div>` : ''}
    </div>`;
}

function renderUpcoming(posts) {
  const upcoming = posts
    .filter(p => p.status === 'agendado' && p.agendado_para)
    .sort((a, b) => new Date(a.agendado_para) - new Date(b.agendado_para))
    .slice(0, 5);

  if (!upcoming.length) {
    return '<div class="empty-state" style="padding:30px"><i class="fa-regular fa-calendar"></i><p>Nenhum post agendado</p></div>';
  }

  return upcoming.map(p => `
    <div class="flex items-center gap-1 mb-2" style="padding:8px 0; border-bottom:1px solid var(--border)">
      <div class="post-thumb" style="width:48px;height:48px;font-size:1.2rem">
        ${p.imagem_url ? `<img src="${p.imagem_url}" alt="">` : '<i class="fa-regular fa-image"></i>'}
      </div>
      <div class="flex-1 truncate">
        <div class="truncate text-sm font-bold">${p.legenda || '(sem legenda)'}</div>
        <div class="text-muted text-sm">${app.formatDate(p.agendado_para)}</div>
      </div>
      ${app.statusBadge(p.status)}
    </div>`).join('');
}

function renderPlatformPerf(publicados) {
  const platforms = ['instagram', 'tiktok', 'facebook', 'youtube'];
  const stats = {};
  platforms.forEach(p => { stats[p] = { posts: 0, likes: 0, comentarios: 0, visualizacoes: 0 }; });

  publicados.forEach(p => {
    const pl = p.plataforma;
    if (stats[pl]) {
      stats[pl].posts++;
      stats[pl].likes        += p.likes        || 0;
      stats[pl].comentarios  += p.comentarios  || 0;
      stats[pl].visualizacoes+= p.visualizacoes|| 0;
    }
  });

  const maxLikes = Math.max(1, ...platforms.map(p => stats[p].likes));

  return `
    <div style="display:flex; flex-direction:column; gap:14px">
      ${platforms.map(pl => {
        const s = stats[pl];
        const pct = Math.round((s.likes / maxLikes) * 100);
        const colors = { instagram: 'var(--pink)', tiktok: '#ccc', facebook: 'var(--blue)', youtube: 'var(--red)' };
        return `
          <div>
            <div class="flex justify-between items-center mb-1">
              <span class="metric-label">${app.platformIcon(pl)} ${pl.charAt(0).toUpperCase() + pl.slice(1)}</span>
              <span class="text-sm text-muted">${s.posts} posts · ${app.formatNumber(s.likes)} likes · ${app.formatNumber(s.visualizacoes)} views</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width:${pct}%;background:${colors[pl]}"></div>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

function buildCalendar(hoje, scheduledDays) {
  const year  = hoje.getFullYear();
  const month = hoje.getMonth();
  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const dayNames   = ['D','S','T','Q','Q','S','S'];

  const first     = new Date(year, month, 1);
  const lastDay   = new Date(year, month + 1, 0).getDate();
  const startDow  = first.getDay();

  let cells = '';
  // Pad previous month
  for (let i = 0; i < startDow; i++) {
    const d = new Date(year, month, -startDow + i + 1);
    cells += `<div class="cal-day other-month">${d.getDate()}</div>`;
  }
  // Current month
  for (let d = 1; d <= lastDay; d++) {
    const date    = new Date(year, month, d);
    const isToday = date.toDateString() === hoje.toDateString();
    const hasPost = scheduledDays.has(date.toDateString());
    cells += `<div class="cal-day${isToday ? ' today' : ''}${hasPost ? ' has-post' : ''}">${d}</div>`;
  }

  return `
    <div class="cal-header">
      <span>${monthNames[month]} ${year}</span>
    </div>
    <div class="cal-grid">
      ${dayNames.map(d => `<div class="cal-day-name">${d}</div>`).join('')}
      ${cells}
    </div>`;
}
