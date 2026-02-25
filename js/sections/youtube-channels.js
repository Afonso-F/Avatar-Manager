/* ============================================================
   sections/youtube-channels.js — Gestão de canais YouTube
   ============================================================ */

async function renderYoutube(container) {
  let canais = [];
  if (DB.ready()) {
    const { data } = await DB.getYoutubeChannels();
    canais = data || [];
  }

  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Canais YouTube</div>
        <div class="section-subtitle">Monitoriza os teus canais e receita AdSense</div>
      </div>
      <button class="btn btn-primary" onclick="openYoutubeModal(null)">
        <i class="fa-solid fa-plus"></i> Novo canal
      </button>
    </div>

    ${canais.length === 0 ? `
      <div class="empty-state" style="padding:60px 20px">
        <i class="fa-brands fa-youtube" style="font-size:2.5rem;color:var(--red);margin-bottom:12px"></i>
        <p style="font-size:1.1rem;font-weight:600;margin-bottom:6px">Sem canais adicionados</p>
        <p class="text-muted" style="margin-bottom:20px">Adiciona o teu canal YouTube para monitorizar views e receita</p>
        <button class="btn btn-primary" onclick="openYoutubeModal(null)"><i class="fa-solid fa-plus"></i> Adicionar canal</button>
      </div>
    ` : `
      <!-- KPIs gerais -->
      <div class="grid-4 mb-3">
        ${ytStatCard('fa-users','var(--red-soft)','var(--red)', app.formatNumber(canais.reduce((s,c)=>s+(c.seguidores||0),0)), 'Total Subscritores')}
        ${ytStatCard('fa-eye','var(--accent-soft)','var(--accent)', app.formatNumber(canais.reduce((s,c)=>s+(c.total_views||0),0)), 'Total Views')}
        ${ytStatCard('fa-film','var(--yellow-soft)','var(--yellow)', canais.reduce((s,c)=>s+(c.videos_count||0),0), 'Total Vídeos')}
        ${ytStatCard('fa-euro-sign','var(--green-soft)','var(--green)', '€'+canais.reduce((s,c)=>s+(parseFloat(c.receita_mes)||0),0).toFixed(2), 'Receita Este Mês')}
      </div>

      <div class="grid-auto" id="yt-channel-grid">
        ${canais.map(c => renderYoutubeCard(c)).join('')}
      </div>
    `}
  `;
}

function ytStatCard(icon, bgSoft, color, value, label) {
  return `
    <div class="stat-card">
      <div class="stat-icon" style="background:${bgSoft}"><i class="fa-solid ${icon}" style="color:${color}"></i></div>
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
    </div>`;
}

function renderYoutubeCard(c) {
  return `
    <div class="content-card" id="ytc-${c.id}">
      <div class="content-card-header">
        <div class="content-card-img" style="background:var(--red-soft)">
          ${c.imagem_url
            ? `<img src="${c.imagem_url}" alt="${c.nome}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
            : `<i class="fa-brands fa-youtube" style="color:var(--red);font-size:1.4rem"></i>`}
        </div>
        <div>
          <div class="content-card-name">${c.nome}</div>
          <div class="content-card-sub">${c.nicho || 'YouTube'}</div>
        </div>
        <span class="badge badge-red" style="margin-left:auto"><i class="fa-brands fa-youtube"></i> YouTube</span>
      </div>

      <div class="metrics-grid">
        <div class="metric-item">
          <div class="metric-value" style="color:var(--red)">${app.formatNumber(c.seguidores)}</div>
          <div class="metric-label">Subscritores</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">${app.formatNumber(c.total_views)}</div>
          <div class="metric-label">Views totais</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">${c.videos_count || 0}</div>
          <div class="metric-label">Vídeos</div>
        </div>
        <div class="metric-item">
          <div class="metric-value" style="color:var(--green)">€${parseFloat(c.receita_mes||0).toFixed(2)}</div>
          <div class="metric-label">Receita/mês</div>
        </div>
      </div>

      ${c.canal_id ? `<div class="text-sm text-muted" style="display:flex;align-items:center;gap:5px"><i class="fa-solid fa-link" style="color:var(--accent)"></i> ID: ${c.canal_id}</div>` : ''}

      <div class="flex gap-1 mt-1">
        <button class="btn btn-sm btn-secondary flex-1" onclick="openYoutubeVideosModal('${c.id}','${(c.nome||'').replace(/'/g,"\\'")}')">
          <i class="fa-solid fa-film"></i> Vídeos
        </button>
        <button class="btn btn-sm btn-secondary flex-1" onclick="openYoutubeStatsModal('${c.id}','${(c.nome||'').replace(/'/g,"\\'")}')">
          <i class="fa-solid fa-chart-line"></i> Stats
        </button>
        <button class="btn btn-sm btn-secondary btn-icon" onclick="openYoutubeModal('${c.id}')" title="Editar">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="btn btn-sm btn-danger btn-icon" onclick="confirmDeleteYoutube('${c.id}','${(c.nome||'').replace(/'/g,"\\'")}')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>`;
}

/* ── Modal Criar/Editar Canal ── */
async function openYoutubeModal(id) {
  let canais = [];
  if (DB.ready()) {
    const { data } = await DB.getYoutubeChannels();
    canais = data || [];
  }
  const c = id ? canais.find(x => String(x.id) === String(id)) : null;
  const isNew = !c;

  const body = `
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Nome do canal *</label>
        <input id="yt-nome" class="form-control" value="${c?.nome||''}" placeholder="Ex: TechTutos">
      </div>
      <div class="form-group">
        <label class="form-label">Nicho / Categoria</label>
        <input id="yt-nicho" class="form-control" value="${c?.nicho||''}" placeholder="Ex: Gaming, Tecnologia…">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">ID do Canal YouTube</label>
      <input id="yt-canal-id" class="form-control" value="${c?.canal_id||''}" placeholder="UCxxxxxxxxxxxxxxxxxx">
      <div class="form-hint">Encontra o ID em youtube.com/channel/<strong>ID</strong></div>
    </div>
    <div class="form-group">
      <label class="form-label">URL da imagem do canal</label>
      <input id="yt-img" class="form-control" value="${c?.imagem_url||''}" placeholder="https://…">
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Subscritores</label>
        <input id="yt-subs" class="form-control" type="number" min="0" value="${c?.seguidores||0}">
      </div>
      <div class="form-group">
        <label class="form-label">Views totais</label>
        <input id="yt-views" class="form-control" type="number" min="0" value="${c?.total_views||0}">
      </div>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Nº de vídeos</label>
        <input id="yt-vids" class="form-control" type="number" min="0" value="${c?.videos_count||0}">
      </div>
      <div class="form-group">
        <label class="form-label">Receita estimada este mês (€)</label>
        <input id="yt-receita" class="form-control" type="number" min="0" step="0.01" value="${c?.receita_mes||0}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">RPM AdSense (€ por 1000 views)</label>
      <input id="yt-rpm" class="form-control" type="number" min="0" step="0.01" value="${c?.adsense_rpm||2.00}">
      <div class="form-hint">Valor médio que recebes por 1000 visualizações</div>
    </div>
    <div class="form-group mb-0">
      <label class="form-label">Descrição / Notas</label>
      <textarea id="yt-notas" class="form-control" rows="2" placeholder="Notas sobre o canal…">${c?.notas||''}</textarea>
    </div>`;

  const footer = `
    <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveYoutubeChannel('${id||''}')">
      <i class="fa-solid fa-floppy-disk"></i> ${isNew ? 'Criar' : 'Guardar'}
    </button>`;

  app.openModal(isNew ? 'Novo canal YouTube' : `Editar — ${c.nome}`, body, footer);
}

async function saveYoutubeChannel(id) {
  const nome       = document.getElementById('yt-nome')?.value.trim();
  const nicho      = document.getElementById('yt-nicho')?.value.trim();
  const canal_id   = document.getElementById('yt-canal-id')?.value.trim();
  const imagem_url = document.getElementById('yt-img')?.value.trim();
  const seguidores = parseInt(document.getElementById('yt-subs')?.value)||0;
  const total_views= parseInt(document.getElementById('yt-views')?.value)||0;
  const videos_count=parseInt(document.getElementById('yt-vids')?.value)||0;
  const receita_mes= parseFloat(document.getElementById('yt-receita')?.value)||0;
  const adsense_rpm= parseFloat(document.getElementById('yt-rpm')?.value)||2;
  const notas      = document.getElementById('yt-notas')?.value.trim();

  if (!nome) { app.toast('Nome é obrigatório', 'error'); return; }

  const payload = { nome, nicho, canal_id, imagem_url, seguidores, total_views, videos_count, receita_mes, adsense_rpm, notas };
  if (id) payload.id = id;

  if (DB.ready()) {
    const { error } = await DB.upsertYoutubeChannel(payload);
    if (error) { app.toast('Erro ao guardar: ' + error, 'error'); return; }
  }

  app.toast(id ? 'Canal atualizado!' : 'Canal criado!', 'success');
  app.closeModal();
  renderYoutube(document.getElementById('content'));
}

function confirmDeleteYoutube(id, nome) {
  app.openModal(
    'Apagar canal',
    `<p>Tens a certeza que queres apagar <strong>${nome}</strong>? Esta ação é irreversível.</p>`,
    `<button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
     <button class="btn btn-danger" onclick="deleteYoutubeConfirmed('${id}')"><i class="fa-solid fa-trash"></i> Apagar</button>`
  );
}

async function deleteYoutubeConfirmed(id) {
  if (DB.ready()) {
    const { error } = await DB.deleteYoutubeChannel(id);
    if (error) { app.toast('Erro ao apagar', 'error'); return; }
  }
  app.toast('Canal apagado', 'success');
  app.closeModal();
  renderYoutube(document.getElementById('content'));
}

/* ── Modal Vídeos ── */
async function openYoutubeVideosModal(channelId, channelNome) {
  if (!DB.ready()) { app.toast('Supabase necessário', 'warning'); return; }
  const { data: videos } = await DB.getYoutubeVideos(channelId);
  const vids = videos || [];

  const body = `
    <div style="margin-bottom:16px">
      <button class="btn btn-sm btn-primary" onclick="openAddVideoModal('${channelId}','${channelNome.replace(/'/g,"\\'")}')">
        <i class="fa-solid fa-plus"></i> Adicionar vídeo
      </button>
    </div>
    ${vids.length === 0 ? `
      <div class="empty-state" style="padding:30px">
        <i class="fa-solid fa-film"></i><p>Sem vídeos registados</p>
      </div>
    ` : `
      <div style="display:flex;flex-direction:column;gap:10px;max-height:420px;overflow-y:auto">
        ${vids.map(v => `
          <div style="background:var(--bg-elevated);border-radius:10px;padding:12px;display:flex;gap:12px;align-items:center">
            ${v.thumbnail_url
              ? `<img src="${v.thumbnail_url}" style="width:72px;height:48px;object-fit:cover;border-radius:6px;flex-shrink:0">`
              : `<div style="width:72px;height:48px;background:var(--bg-hover);border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fa-solid fa-play" style="color:var(--text-muted)"></i></div>`}
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:.9rem;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v.titulo}</div>
              <div style="display:flex;gap:12px;font-size:.8rem;color:var(--text-muted)">
                <span><i class="fa-solid fa-eye"></i> ${app.formatNumber(v.views)}</span>
                <span><i class="fa-solid fa-thumbs-up"></i> ${app.formatNumber(v.likes)}</span>
                <span style="color:var(--green)"><i class="fa-solid fa-euro-sign"></i> ${parseFloat(v.receita_estimada||0).toFixed(2)}</span>
                ${v.publicado_em ? `<span>${app.formatDate(v.publicado_em).split(',')[0]}</span>` : ''}
              </div>
            </div>
            <button class="btn btn-sm btn-danger btn-icon" onclick="deleteVideoConfirmed('${v.id}','${channelId}','${channelNome.replace(/'/g,"\\'")}')">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>`).join('')}
      </div>
    `}`;

  app.openModal(`Vídeos — ${channelNome}`, body, `<button class="btn btn-secondary" onclick="app.closeModal()">Fechar</button>`);
}

async function openAddVideoModal(channelId, channelNome = '') {
  const body = `
    <div class="form-group">
      <label class="form-label">Título *</label>
      <input id="vid-titulo" class="form-control" placeholder="Título do vídeo">
    </div>
    <div class="form-group">
      <label class="form-label">ID do vídeo (YouTube)</label>
      <input id="vid-id" class="form-control" placeholder="dQw4w9WgXcQ">
    </div>
    <div class="form-group">
      <label class="form-label">URL da thumbnail</label>
      <input id="vid-thumb" class="form-control" placeholder="https://img.youtube.com/vi/VIDEO_ID/0.jpg">
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Views</label>
        <input id="vid-views" class="form-control" type="number" min="0" value="0">
      </div>
      <div class="form-group">
        <label class="form-label">Likes</label>
        <input id="vid-likes" class="form-control" type="number" min="0" value="0">
      </div>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Comentários</label>
        <input id="vid-comments" class="form-control" type="number" min="0" value="0">
      </div>
      <div class="form-group">
        <label class="form-label">Receita estimada (€)</label>
        <input id="vid-receita" class="form-control" type="number" min="0" step="0.01" value="0">
      </div>
    </div>
    <div class="form-group mb-0">
      <label class="form-label">Data de publicação</label>
      <input id="vid-date" class="form-control" type="date">
    </div>`;

  app.openModal('Adicionar vídeo', body, `
    <button class="btn btn-secondary" onclick="openYoutubeVideosModal('${channelId}','${channelNome.replace(/'/g,"\\'")}')">Voltar</button>
    <button class="btn btn-primary" onclick="saveYoutubeVideo('${channelId}')">
      <i class="fa-solid fa-floppy-disk"></i> Guardar
    </button>`);
}

async function saveYoutubeVideo(channelId) {
  const titulo   = document.getElementById('vid-titulo')?.value.trim();
  const video_id = document.getElementById('vid-id')?.value.trim();
  const thumb    = document.getElementById('vid-thumb')?.value.trim();
  const views    = parseInt(document.getElementById('vid-views')?.value)||0;
  const likes    = parseInt(document.getElementById('vid-likes')?.value)||0;
  const coments  = parseInt(document.getElementById('vid-comments')?.value)||0;
  const receita  = parseFloat(document.getElementById('vid-receita')?.value)||0;
  const dateVal  = document.getElementById('vid-date')?.value;

  if (!titulo) { app.toast('Título é obrigatório', 'error'); return; }

  const payload = {
    channel_id: channelId, titulo, video_id, thumbnail_url: thumb,
    views, likes, comentarios: coments, receita_estimada: receita,
    publicado_em: dateVal || null,
  };

  if (DB.ready()) {
    const { error } = await DB.upsertYoutubeVideo(payload);
    if (error) { app.toast('Erro ao guardar vídeo', 'error'); return; }
  }

  app.toast('Vídeo adicionado!', 'success');
  app.closeModal();
  renderYoutube(document.getElementById('content'));
}

async function deleteVideoConfirmed(videoId, channelId, channelNome) {
  if (DB.ready()) {
    const { error } = await DB.deleteYoutubeVideo(videoId);
    if (error) { app.toast('Erro ao apagar', 'error'); return; }
  }
  app.toast('Vídeo apagado', 'success');
  openYoutubeVideosModal(channelId, channelNome);
}

/* ── Modal Stats do Canal ── */
async function openYoutubeStatsModal(channelId, channelNome) {
  if (!DB.ready()) { app.toast('Supabase necessário', 'warning'); return; }
  const { data: videos } = await DB.getYoutubeVideos(channelId);
  const vids = videos || [];

  const totalViews    = vids.reduce((s,v) => s+(v.views||0), 0);
  const totalLikes    = vids.reduce((s,v) => s+(v.likes||0), 0);
  const totalReceita  = vids.reduce((s,v) => s+(parseFloat(v.receita_estimada)||0), 0);
  const topVids       = [...vids].sort((a,b) => (b.views||0)-(a.views||0)).slice(0,3);

  const body = `
    <div class="grid-2 mb-3" style="gap:12px">
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--red-soft)"><i class="fa-solid fa-eye" style="color:var(--red)"></i></div>
        <div class="stat-value">${app.formatNumber(totalViews)}</div>
        <div class="stat-label">Views registadas</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--green-soft)"><i class="fa-solid fa-euro-sign" style="color:var(--green)"></i></div>
        <div class="stat-value">€${totalReceita.toFixed(2)}</div>
        <div class="stat-label">Receita total</div>
      </div>
    </div>
    <div style="font-weight:700;margin-bottom:10px">Top vídeos por views</div>
    ${topVids.length ? topVids.map((v,i) => `
      <div class="metric-row">
        <span class="metric-label"><span style="color:var(--accent);font-weight:800">#${i+1}</span> ${v.titulo}</span>
        <span class="metric-value">${app.formatNumber(v.views)} <i class="fa-solid fa-eye" style="font-size:.7rem"></i></span>
      </div>`).join('') : '<div class="text-muted text-sm" style="padding:16px 0">Sem vídeos registados</div>'}
    <div style="font-weight:700;margin:16px 0 10px">Total de likes</div>
    <div class="metric-row">
      <span class="metric-label">Total likes nos vídeos</span>
      <span class="metric-value" style="color:var(--red)">${app.formatNumber(totalLikes)} <i class="fa-solid fa-thumbs-up" style="font-size:.7rem"></i></span>
    </div>`;

  app.openModal(`Stats — ${channelNome}`, body, `<button class="btn btn-secondary" onclick="app.closeModal()">Fechar</button>`);
}
