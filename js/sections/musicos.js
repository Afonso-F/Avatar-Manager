/* ============================================================
   sections/musicos.js — Gestão de músicos e bandas
   ============================================================ */

const MUSIC_PLATFORMS = {
  spotify:      { label: 'Spotify',       icon: 'fa-brands fa-spotify',       color: '#1db954' },
  apple_music:  { label: 'Apple Music',   icon: 'fa-brands fa-apple',         color: '#fc3c44' },
  youtube_music:{ label: 'YouTube Music', icon: 'fa-brands fa-youtube',       color: '#ef4444' },
  soundcloud:   { label: 'SoundCloud',    icon: 'fa-brands fa-soundcloud',    color: '#ff5500' },
  deezer:       { label: 'Deezer',        icon: 'fa-solid fa-music',          color: '#a238ff' },
  tidal:        { label: 'TIDAL',         icon: 'fa-solid fa-wave-square',    color: '#00ffff' },
};

async function renderMusicos(container) {
  let musicos = [];
  if (DB.ready()) {
    const { data } = await DB.getMusicos();
    musicos = data || [];
  }

  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Músicos & Bandas</div>
        <div class="section-subtitle">Monitoriza streams, ouvintes e receitas de artistas</div>
      </div>
      <button class="btn btn-primary" onclick="openMusicoModal(null)">
        <i class="fa-solid fa-plus"></i> Novo artista
      </button>
    </div>

    ${musicos.length === 0 ? `
      <div class="empty-state" style="padding:60px 20px">
        <i class="fa-solid fa-music" style="font-size:2.5rem;color:var(--accent);margin-bottom:12px"></i>
        <p style="font-size:1.1rem;font-weight:600;margin-bottom:6px">Sem artistas adicionados</p>
        <p class="text-muted" style="margin-bottom:20px">Adiciona um músico ou banda para monitorizar streams e receitas</p>
        <button class="btn btn-primary" onclick="openMusicoModal(null)"><i class="fa-solid fa-plus"></i> Adicionar artista</button>
      </div>
    ` : `
      <!-- KPIs gerais -->
      <div class="grid-4 mb-3">
        ${musicStatCard('fa-headphones','var(--accent-soft)','var(--accent)', app.formatNumber(musicos.reduce((s,m)=>s+(m.ouvintes_mensais||0),0)), 'Ouvintes/mês')}
        ${musicStatCard('fa-play','var(--blue-soft)','var(--blue)', app.formatNumber(musicos.reduce((s,m)=>s+(m.total_streams||0),0)), 'Total Streams')}
        ${musicStatCard('fa-users','var(--yellow-soft)','var(--yellow)', app.formatNumber(musicos.reduce((s,m)=>s+(m.seguidores||0),0)), 'Seguidores')}
        ${musicStatCard('fa-euro-sign','var(--green-soft)','var(--green)', '€'+musicos.reduce((s,m)=>s+(parseFloat(m.receita_mes)||0),0).toFixed(2), 'Receita/mês')}
      </div>

      <div class="grid-auto" id="musicos-grid">
        ${musicos.map(m => renderMusicoCard(m)).join('')}
      </div>
    `}
  `;
}

function musicStatCard(icon, bgSoft, color, value, label) {
  return `
    <div class="stat-card">
      <div class="stat-icon" style="background:${bgSoft}"><i class="fa-solid ${icon}" style="color:${color}"></i></div>
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
    </div>`;
}

function renderMusicoCard(m) {
  const plataformas = (m.plataformas || []).map(p =>
    MUSIC_PLATFORMS[p] ? `<span style="color:${MUSIC_PLATFORMS[p].color};font-size:.75rem"><i class="${MUSIC_PLATFORMS[p].icon}"></i> ${MUSIC_PLATFORMS[p].label}</span>` : ''
  ).join('');

  return `
    <div class="content-card" id="mc-${m.id}">
      <div class="content-card-header">
        <div class="content-card-img" style="background:var(--accent-soft)">
          ${m.imagem_url
            ? `<img src="${m.imagem_url}" alt="${m.nome}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
            : `<i class="fa-solid fa-${m.tipo === 'banda' ? 'people-group' : 'user-music'}" style="color:var(--accent);font-size:1.3rem"></i>`}
        </div>
        <div>
          <div class="content-card-name">${m.nome}</div>
          <div class="content-card-sub">${m.genero || (m.tipo === 'banda' ? 'Banda' : 'Músico')}</div>
        </div>
        <span class="badge" style="margin-left:auto;background:var(--accent-soft);color:var(--accent)">
          <i class="fa-solid fa-${m.tipo === 'banda' ? 'people-group' : 'music'}"></i>
          ${m.tipo === 'banda' ? 'Banda' : 'Músico'}
        </span>
      </div>

      <div class="metrics-grid">
        <div class="metric-item">
          <div class="metric-value" style="color:var(--accent)">${app.formatNumber(m.ouvintes_mensais)}</div>
          <div class="metric-label">Ouvintes/mês</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">${app.formatNumber(m.total_streams)}</div>
          <div class="metric-label">Streams</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">${app.formatNumber(m.seguidores)}</div>
          <div class="metric-label">Seguidores</div>
        </div>
        <div class="metric-item">
          <div class="metric-value" style="color:var(--green)">€${parseFloat(m.receita_mes||0).toFixed(2)}</div>
          <div class="metric-label">Receita/mês</div>
        </div>
      </div>

      ${plataformas ? `<div class="flex gap-2 flex-wrap">${plataformas}</div>` : ''}

      <div class="flex gap-1 mt-1">
        <button class="btn btn-sm btn-secondary flex-1" onclick="openMusicoTracksModal('${m.id}','${(m.nome||'').replace(/'/g,"\\'")}')">
          <i class="fa-solid fa-list-music"></i> Tracks
        </button>
        <button class="btn btn-sm btn-secondary flex-1" onclick="openMusicoStatsModal('${m.id}','${(m.nome||'').replace(/'/g,"\\'")}')">
          <i class="fa-solid fa-chart-line"></i> Stats
        </button>
        <button class="btn btn-sm btn-secondary btn-icon" onclick="openMusicoModal('${m.id}')" title="Editar">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="btn btn-sm btn-danger btn-icon" onclick="confirmDeleteMusico('${m.id}','${(m.nome||'').replace(/'/g,"\\'")}')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>`;
}

/* ── Modal Criar/Editar ── */
async function openMusicoModal(id) {
  let musicos = [];
  if (DB.ready()) {
    const { data } = await DB.getMusicos();
    musicos = data || [];
  }
  const m = id ? musicos.find(x => String(x.id) === String(id)) : null;
  const isNew = !m;
  const plats = m?.plataformas || [];

  const body = `
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Nome *</label>
        <input id="mu-nome" class="form-control" value="${m?.nome||''}" placeholder="Ex: David Fonseca">
      </div>
      <div class="form-group">
        <label class="form-label">Tipo</label>
        <select id="mu-tipo" class="form-control">
          <option value="musico"${(!m||m.tipo==='musico')?' selected':''}>Músico</option>
          <option value="banda"${m?.tipo==='banda'?' selected':''}>Banda</option>
        </select>
      </div>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Género musical</label>
        <input id="mu-genero" class="form-control" value="${m?.genero||''}" placeholder="Ex: Pop, Rock, Hip-hop…">
      </div>
      <div class="form-group">
        <label class="form-label">URL imagem</label>
        <input id="mu-img" class="form-control" value="${m?.imagem_url||''}" placeholder="https://…">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Plataformas de streaming</label>
      <div class="platform-toggles" id="mu-platforms">
        ${Object.entries(MUSIC_PLATFORMS).map(([k, v]) => {
          const active = plats.includes(k);
          return `<div class="platform-toggle${active ? ' active' : ''}" data-p="${k}" onclick="toggleMusicPlatform(this)" style="${active ? `background:${v.color}22;border-color:${v.color};color:${v.color}` : ''}">
            <i class="${v.icon}"></i> ${v.label}
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Ouvintes mensais</label>
        <input id="mu-ouvintes" class="form-control" type="number" min="0" value="${m?.ouvintes_mensais||0}">
      </div>
      <div class="form-group">
        <label class="form-label">Total Streams</label>
        <input id="mu-streams" class="form-control" type="number" min="0" value="${m?.total_streams||0}">
      </div>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Seguidores</label>
        <input id="mu-seguidores" class="form-control" type="number" min="0" value="${m?.seguidores||0}">
      </div>
      <div class="form-group">
        <label class="form-label">Receita este mês (€)</label>
        <input id="mu-receita" class="form-control" type="number" min="0" step="0.01" value="${m?.receita_mes||0}">
      </div>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Spotify Artist ID</label>
        <input id="mu-spotify" class="form-control" value="${m?.spotify_id||''}" placeholder="0OdUWJ0sBjDrqHygGUXeCF">
      </div>
      <div class="form-group">
        <label class="form-label">Apple Music ID</label>
        <input id="mu-apple" class="form-control" value="${m?.apple_music_id||''}" placeholder="ID do artista">
      </div>
    </div>
    <div class="form-group mb-0">
      <label class="form-label">Descrição / Notas</label>
      <textarea id="mu-notas" class="form-control" rows="2" placeholder="Sobre o artista…">${m?.notas||''}</textarea>
    </div>`;

  const footer = `
    <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveMusico('${id||''}')">
      <i class="fa-solid fa-floppy-disk"></i> ${isNew ? 'Criar' : 'Guardar'}
    </button>`;

  app.openModal(isNew ? 'Novo artista' : `Editar — ${m.nome}`, body, footer);
}

function toggleMusicPlatform(el) {
  const p = el.dataset.p;
  const info = MUSIC_PLATFORMS[p];
  const isActive = el.classList.toggle('active');
  if (isActive) {
    el.style.background = info.color + '22';
    el.style.borderColor = info.color;
    el.style.color = info.color;
  } else {
    el.style.background = '';
    el.style.borderColor = '';
    el.style.color = '';
  }
}

async function saveMusico(id) {
  const nome          = document.getElementById('mu-nome')?.value.trim();
  const tipo          = document.getElementById('mu-tipo')?.value;
  const genero        = document.getElementById('mu-genero')?.value.trim();
  const imagem_url    = document.getElementById('mu-img')?.value.trim();
  const ouvintes      = parseInt(document.getElementById('mu-ouvintes')?.value)||0;
  const total_streams = parseInt(document.getElementById('mu-streams')?.value)||0;
  const seguidores    = parseInt(document.getElementById('mu-seguidores')?.value)||0;
  const receita_mes   = parseFloat(document.getElementById('mu-receita')?.value)||0;
  const spotify_id    = document.getElementById('mu-spotify')?.value.trim();
  const apple_music_id= document.getElementById('mu-apple')?.value.trim();
  const notas         = document.getElementById('mu-notas')?.value.trim();
  const plataformas   = [...document.querySelectorAll('#mu-platforms .platform-toggle.active')].map(el => el.dataset.p);

  if (!nome) { app.toast('Nome é obrigatório', 'error'); return; }

  const payload = { nome, tipo, genero, imagem_url, ouvintes_mensais: ouvintes, total_streams, seguidores, receita_mes, spotify_id, apple_music_id, notas, plataformas };
  if (id) payload.id = id;

  if (DB.ready()) {
    const { error } = await DB.upsertMusico(payload);
    if (error) { app.toast('Erro ao guardar: ' + (error?.message || error?.details || JSON.stringify(error)), 'error'); return; }
  }

  app.toast(id ? 'Artista atualizado!' : 'Artista criado!', 'success');
  app.closeModal();
  renderMusicos(document.getElementById('content'));
}

function confirmDeleteMusico(id, nome) {
  app.openModal(
    'Apagar artista',
    `<p>Tens a certeza que queres apagar <strong>${nome}</strong>?</p>`,
    `<button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
     <button class="btn btn-danger" onclick="deleteMusicoConfirmed('${id}')"><i class="fa-solid fa-trash"></i> Apagar</button>`
  );
}

async function deleteMusicoConfirmed(id) {
  if (DB.ready()) {
    const { error } = await DB.deleteMusico(id);
    if (error) { app.toast('Erro ao apagar', 'error'); return; }
  }
  app.toast('Artista apagado', 'success');
  app.closeModal();
  renderMusicos(document.getElementById('content'));
}

/* ── Modal Tracks ── */
async function openMusicoTracksModal(musicoId, musicoNome) {
  if (!DB.ready()) { app.toast('Supabase necessário', 'warning'); return; }
  const { data: tracks } = await DB.getMusicoTracks(musicoId);
  const tks = tracks || [];

  const body = `
    <div style="margin-bottom:16px">
      <button class="btn btn-sm btn-primary" onclick="openAddTrackModal('${musicoId}','${musicoNome.replace(/'/g,"\\'")}')">
        <i class="fa-solid fa-plus"></i> Adicionar track
      </button>
    </div>
    ${tks.length === 0 ? `
      <div class="empty-state" style="padding:30px">
        <i class="fa-solid fa-music"></i><p>Sem tracks registadas</p>
      </div>
    ` : `
      <div style="display:flex;flex-direction:column;gap:8px;max-height:420px;overflow-y:auto">
        ${tks.map((t,i) => `
          <div style="background:var(--bg-elevated);border-radius:10px;padding:12px;display:flex;gap:12px;align-items:center">
            ${t.capa_url
              ? `<img src="${t.capa_url}" style="width:44px;height:44px;object-fit:cover;border-radius:6px;flex-shrink:0">`
              : `<div style="width:44px;height:44px;background:var(--bg-hover);border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--accent)"><i class="fa-solid fa-music"></i></div>`}
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.titulo}</div>
              ${t.album ? `<div style="font-size:.78rem;color:var(--text-muted)">${t.album}</div>` : ''}
              <div style="display:flex;gap:10px;font-size:.78rem;color:var(--text-muted);margin-top:2px">
                <span><i class="fa-solid fa-play"></i> ${app.formatNumber(t.streams)}</span>
                <span style="color:var(--green)"><i class="fa-solid fa-euro-sign"></i> ${parseFloat(t.receita||0).toFixed(2)}</span>
                ${MUSIC_PLATFORMS[t.plataforma] ? `<span style="color:${MUSIC_PLATFORMS[t.plataforma].color}"><i class="${MUSIC_PLATFORMS[t.plataforma].icon}"></i></span>` : ''}
              </div>
            </div>
            <button class="btn btn-sm btn-danger btn-icon" onclick="deleteTrackConfirmed('${t.id}','${musicoId}','${musicoNome.replace(/'/g,"\\'")}')">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>`).join('')}
      </div>
    `}`;

  app.openModal(`Tracks — ${musicoNome}`, body, `<button class="btn btn-secondary" onclick="app.closeModal()">Fechar</button>`);
}

async function openAddTrackModal(musicoId, musicoNome) {
  const body = `
    <div class="form-group">
      <label class="form-label">Título *</label>
      <input id="tk-titulo" class="form-control" placeholder="Nome da música">
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Álbum</label>
        <input id="tk-album" class="form-control" placeholder="Nome do álbum">
      </div>
      <div class="form-group">
        <label class="form-label">Plataforma</label>
        <select id="tk-plat" class="form-control">
          ${Object.entries(MUSIC_PLATFORMS).map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">URL da capa</label>
      <input id="tk-capa" class="form-control" placeholder="https://…">
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Streams</label>
        <input id="tk-streams" class="form-control" type="number" min="0" value="0">
      </div>
      <div class="form-group">
        <label class="form-label">Receita (€)</label>
        <input id="tk-receita" class="form-control" type="number" min="0" step="0.01" value="0">
      </div>
    </div>
    <div class="form-group mb-0">
      <label class="form-label">Data de lançamento</label>
      <input id="tk-date" class="form-control" type="date">
    </div>`;

  app.openModal('Adicionar track', body, `
    <button class="btn btn-secondary" onclick="openMusicoTracksModal('${musicoId}','${musicoNome}')">Voltar</button>
    <button class="btn btn-primary" onclick="saveTrack('${musicoId}','${musicoNome}')">
      <i class="fa-solid fa-floppy-disk"></i> Guardar
    </button>`);
}

async function saveTrack(musicoId, musicoNome) {
  const titulo    = document.getElementById('tk-titulo')?.value.trim();
  const album     = document.getElementById('tk-album')?.value.trim();
  const plataforma= document.getElementById('tk-plat')?.value;
  const capa_url  = document.getElementById('tk-capa')?.value.trim();
  const streams   = parseInt(document.getElementById('tk-streams')?.value)||0;
  const receita   = parseFloat(document.getElementById('tk-receita')?.value)||0;
  const dateVal   = document.getElementById('tk-date')?.value;

  if (!titulo) { app.toast('Título é obrigatório', 'error'); return; }

  const payload = { musico_id: musicoId, titulo, album, plataforma, capa_url, streams, receita, publicado_em: dateVal || null };

  if (DB.ready()) {
    const { error } = await DB.upsertMusicoTrack(payload);
    if (error) { app.toast('Erro ao guardar track', 'error'); return; }
  }

  app.toast('Track adicionada!', 'success');
  app.closeModal();
  renderMusicos(document.getElementById('content'));
}

async function deleteTrackConfirmed(trackId, musicoId, musicoNome) {
  if (DB.ready()) {
    const { error } = await DB.deleteMusicoTrack(trackId);
    if (error) { app.toast('Erro ao apagar', 'error'); return; }
  }
  app.toast('Track apagada', 'success');
  openMusicoTracksModal(musicoId, musicoNome);
}

/* ── Modal Stats Músico ── */
async function openMusicoStatsModal(musicoId, musicoNome) {
  if (!DB.ready()) { app.toast('Supabase necessário', 'warning'); return; }
  const { data: tracks } = await DB.getMusicoTracks(musicoId);
  const tks = tracks || [];

  const totalStreams = tks.reduce((s,t) => s+(t.streams||0), 0);
  const totalReceita = tks.reduce((s,t) => s+(parseFloat(t.receita)||0), 0);
  const topTracks    = [...tks].sort((a,b) => (b.streams||0)-(a.streams||0)).slice(0,5);

  // Group streams by platform
  const platStreams = {};
  tks.forEach(t => { platStreams[t.plataforma] = (platStreams[t.plataforma]||0) + (t.streams||0); });

  const body = `
    <div class="grid-2 mb-3" style="gap:12px">
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--accent-soft)"><i class="fa-solid fa-play" style="color:var(--accent)"></i></div>
        <div class="stat-value">${app.formatNumber(totalStreams)}</div>
        <div class="stat-label">Streams registados</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--green-soft)"><i class="fa-solid fa-euro-sign" style="color:var(--green)"></i></div>
        <div class="stat-value">€${totalReceita.toFixed(2)}</div>
        <div class="stat-label">Receita total</div>
      </div>
    </div>
    <div style="font-weight:700;margin-bottom:10px">Streams por plataforma</div>
    ${Object.entries(platStreams).map(([p, s]) => {
      const info = MUSIC_PLATFORMS[p] || { label: p, icon: 'fa-solid fa-music', color: 'var(--accent)' };
      return `<div class="metric-row">
        <span class="metric-label"><i class="${info.icon}" style="color:${info.color}"></i> ${info.label}</span>
        <span class="metric-value">${app.formatNumber(s)}</span>
      </div>`;
    }).join('') || '<div class="text-muted text-sm" style="padding:8px 0">Sem dados</div>'}
    <div style="font-weight:700;margin:16px 0 10px">Top tracks</div>
    ${topTracks.map((t,i) => `
      <div class="metric-row">
        <span class="metric-label"><span style="color:var(--accent);font-weight:800">#${i+1}</span> ${t.titulo}</span>
        <span class="metric-value">${app.formatNumber(t.streams)} <i class="fa-solid fa-play" style="font-size:.7rem"></i></span>
      </div>`).join('') || '<div class="text-muted text-sm" style="padding:8px 0">Sem tracks registadas</div>'}`;

  app.openModal(`Stats — ${musicoNome}`, body, `<button class="btn btn-secondary" onclick="app.closeModal()">Fechar</button>`);
}
