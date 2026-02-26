/* ============================================================
   sections/youtube-channels.js — Canais de Vídeo (multi-plataforma)
   ============================================================ */

const VIDEO_PLATAFORMAS = {
  youtube:     { label: 'YouTube',     color: '#ff0000', icon: 'fa-brands fa-youtube',      badge: 'badge-red',    rpm_label: 'RPM AdSense' },
  twitch:      { label: 'Twitch',      color: '#9146ff', icon: 'fa-brands fa-twitch',       badge: 'badge-purple', rpm_label: 'Receita por sub' },
  tiktok:      { label: 'TikTok',      color: '#010101', icon: 'fa-brands fa-tiktok',       badge: 'badge-muted',  rpm_label: 'Creator Fund/1000' },
  vimeo:       { label: 'Vimeo',       color: '#1ab7ea', icon: 'fa-brands fa-vimeo-v',      badge: 'badge-blue',   rpm_label: 'Receita OTT/mês' },
  rumble:      { label: 'Rumble',      color: '#85c742', icon: 'fa-solid fa-video',         badge: 'badge-green',  rpm_label: 'RPM estimado' },
  dailymotion: { label: 'Dailymotion', color: '#0066DC', icon: 'fa-solid fa-play',          badge: 'badge-blue',   rpm_label: 'RPM estimado' },
};

function getVideoPlataforma(p) {
  return VIDEO_PLATAFORMAS[p] || VIDEO_PLATAFORMAS.youtube;
}

async function renderYoutube(container) {
  let canais = [];
  if (DB.ready()) {
    const { data } = await DB.getYoutubeChannels();
    canais = data || [];
  }

  const totalReceita = canais.reduce((s,c) => s + (parseFloat(c.receita_mes)||0), 0);
  const totalViews   = canais.reduce((s,c) => s + (c.total_views||0), 0);
  const totalSubs    = canais.reduce((s,c) => s + (c.seguidores||0), 0);
  const totalVids    = canais.reduce((s,c) => s + (c.videos_count||0), 0);

  // Agrupar por plataforma para filtros
  const plataformasUsadas = [...new Set(canais.map(c => c.plataforma || 'youtube'))];

  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Canais de Vídeo</div>
        <div class="section-subtitle">YouTube, Twitch, TikTok, Vimeo, Rumble, Dailymotion</div>
      </div>
      <button class="btn btn-primary" onclick="openYoutubeModal(null)">
        <i class="fa-solid fa-plus"></i> Novo canal
      </button>
    </div>

    ${canais.length === 0 ? `
      <div class="empty-state" style="padding:60px 20px">
        <i class="fa-solid fa-video" style="font-size:2.5rem;color:var(--border);margin-bottom:12px"></i>
        <p style="font-size:1.1rem;font-weight:600;margin-bottom:6px">Sem canais adicionados</p>
        <p class="text-muted" style="margin-bottom:20px">Adiciona o teu canal de vídeo para monitorizar views e receita</p>
        <button class="btn btn-primary" onclick="openYoutubeModal(null)"><i class="fa-solid fa-plus"></i> Adicionar canal</button>
      </div>
    ` : `
      <!-- KPIs gerais -->
      <div class="grid-4 mb-3">
        ${ytStatCard('fa-users','var(--red-soft)','var(--red)', app.formatNumber(totalSubs), 'Total Subscritores')}
        ${ytStatCard('fa-eye','var(--accent-soft)','var(--accent)', app.formatNumber(totalViews), 'Total Views')}
        ${ytStatCard('fa-film','var(--yellow-soft)','var(--yellow)', totalVids, 'Total Vídeos')}
        ${ytStatCard('fa-euro-sign','var(--green-soft)','var(--green)', '€'+totalReceita.toFixed(2), 'Receita Este Mês')}
      </div>

      <!-- Filtro por plataforma -->
      ${plataformasUsadas.length > 1 ? `
        <div class="flex gap-1 mb-3" style="flex-wrap:wrap">
          <button class="btn btn-sm btn-secondary" id="vf-all" onclick="filterVideoCanais('all')" style="border-color:var(--accent);color:var(--accent)">
            Todos (${canais.length})
          </button>
          ${plataformasUsadas.map(p => {
            const info = getVideoPlataforma(p);
            const count = canais.filter(c => (c.plataforma||'youtube') === p).length;
            return `<button class="btn btn-sm btn-secondary" id="vf-${p}" onclick="filterVideoCanais('${p}')" style="border-color:${info.color}20;color:${info.color}">
              <i class="${info.icon}"></i> ${info.label} (${count})
            </button>`;
          }).join('')}
        </div>` : ''}

      <div class="grid-auto" id="yt-channel-grid">
        ${canais.map(c => renderYoutubeCard(c)).join('')}
      </div>
    `}
  `;
}

function filterVideoCanais(plataforma) {
  const grid = document.getElementById('yt-channel-grid');
  if (!grid) return;
  grid.querySelectorAll('[data-plataforma-canal]').forEach(el => {
    if (plataforma === 'all' || el.dataset.plataformaCanal === plataforma) {
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  });
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
  const plat = c.plataforma || 'youtube';
  const info = getVideoPlataforma(plat);

  return `
    <div class="content-card" id="ytc-${c.id}" data-plataforma-canal="${plat}">
      <div class="content-card-header">
        <div class="content-card-img" style="background:${info.color}20">
          ${c.imagem_url
            ? `<img src="${c.imagem_url}" alt="${c.nome}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
            : `<i class="${info.icon}" style="color:${info.color};font-size:1.4rem"></i>`}
        </div>
        <div>
          <div class="content-card-name">${c.nome}</div>
          <div class="content-card-sub">${c.nicho || info.label}</div>
        </div>
        <span class="badge" style="margin-left:auto;background:${info.color}20;color:${info.color}">
          <i class="${info.icon}"></i> ${info.label}
        </span>
      </div>

      <div class="metrics-grid">
        <div class="metric-item">
          <div class="metric-value" style="color:${info.color}">${app.formatNumber(c.seguidores)}</div>
          <div class="metric-label">${plat === 'twitch' ? 'Seguidores' : 'Subscritores'}</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">${app.formatNumber(c.total_views)}</div>
          <div class="metric-label">${plat === 'twitch' ? 'Views/mês' : 'Views totais'}</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">${c.videos_count || 0}</div>
          <div class="metric-label">${plat === 'twitch' ? 'Streams' : 'Vídeos'}</div>
        </div>
        <div class="metric-item">
          <div class="metric-value" style="color:var(--green)">€${parseFloat(c.receita_mes||0).toFixed(2)}</div>
          <div class="metric-label">Receita/mês</div>
        </div>
      </div>

      ${c.canal_id ? `<div class="text-sm text-muted" style="display:flex;align-items:center;gap:5px"><i class="fa-solid fa-link" style="color:var(--accent)"></i> ID: ${c.canal_id}</div>` : ''}

      <div class="flex gap-1 mt-1">
        <button class="btn btn-sm btn-secondary flex-1" onclick="openYoutubeVideosModal('${c.id}','${(c.nome||'').replace(/'/g,"\\'")}','${plat}')">
          <i class="fa-solid fa-film"></i> ${plat === 'twitch' ? 'Streams' : 'Vídeos'}
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
async function openYoutubeModal(id, preAvatarId = '') {
  let canais = [], avatares = app.getAvatares();
  if (DB.ready()) {
    const { data } = await DB.getYoutubeChannels();
    canais = data || [];
    if (!avatares.length) {
      const { data: avData } = await DB.getAvatares();
      avatares = avData || [];
      app.setAvatares(avatares);
    }
  }
  const c = id ? canais.find(x => String(x.id) === String(id)) : null;
  const isNew = !c;
  const platAtual = c?.plataforma || 'youtube';

  const avatarOpts = avatares.map(a =>
    `<option value="${a.id}" ${String(c?.avatar_id || preAvatarId) === String(a.id) ? 'selected' : ''}>${a.emoji || '🎭'} ${a.nome}</option>`
  ).join('');

  const body = `
    <div class="concept-toolbar">
      <button id="prompts-toggle-btn-youtube" class="btn btn-sm btn-ghost" onclick="PromptsLibrary.toggle('youtube')">
        <i class="fa-solid fa-book-open"></i> Biblioteca
      </button>
      <button id="concept-toggle-btn-youtube" class="btn btn-sm btn-ghost" onclick="_toggleConceptBar('youtube')">
        <i class="fa-solid fa-wand-magic-sparkles"></i> Descrever com IA
      </button>
    </div>
    ${PromptsLibrary.renderYoutubePanel()}
    <div class="concept-panel" id="concept-panel-youtube">
      <div class="concept-panel-label"><i class="fa-solid fa-wand-magic-sparkles" style="color:var(--accent)"></i> Descreve o teu canal — a IA preenche tudo</div>
      <textarea id="concept-text-youtube" class="form-control" rows="3"
        placeholder="Ex: Canal de tutoriais de Python para iniciantes, vídeos curtos e directos, foco em automação e IA no dia-a-dia…"></textarea>
      <div class="flex items-center gap-2 mt-2">
        <button class="btn btn-sm btn-primary" onclick="gerarCanalDeConceito()">
          <i class="fa-solid fa-wand-magic-sparkles"></i> Gerar com IA
        </button>
        <span id="concept-progress-youtube" class="text-sm" style="color:var(--accent)"></span>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Avatar associado</label>
      <select id="yt-avatar-id" class="form-control">
        <option value="">Sem avatar associado</option>
        ${avatarOpts}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Plataforma *</label>
      <div class="platform-toggles" id="vp-platforms">
        ${Object.entries(VIDEO_PLATAFORMAS).map(([key, info]) => `
          <div class="platform-toggle${key === platAtual ? ' active' : ''}" data-vp="${key}"
               onclick="selectVideoPlataforma(this)"
               style="${key === platAtual ? `background:${info.color}20;border-color:${info.color};color:${info.color}` : ''}">
            <i class="${info.icon}"></i> ${info.label}
          </div>`).join('')}
      </div>
      <input type="hidden" id="vp-plataforma" value="${platAtual}">
    </div>
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
      <label class="form-label">ID / Handle do Canal</label>
      <input id="yt-canal-id" class="form-control" value="${c?.canal_id||''}" placeholder="Ex: UCxxxxxx ou @meucanal">
      <div class="form-hint" id="canal-id-hint">YouTube: encontra em youtube.com/channel/<strong>ID</strong></div>
    </div>
    <div class="form-group">
      <label class="form-label">URL da imagem do canal</label>
      <input id="yt-img" class="form-control" value="${c?.imagem_url||''}" placeholder="https://…">
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label" id="subs-label">Subscritores</label>
        <input id="yt-subs" class="form-control" type="number" min="0" value="${c?.seguidores||0}">
      </div>
      <div class="form-group">
        <label class="form-label" id="views-label">Views totais</label>
        <input id="yt-views" class="form-control" type="number" min="0" value="${c?.total_views||0}">
      </div>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label" id="vids-label">Nº de vídeos</label>
        <input id="yt-vids" class="form-control" type="number" min="0" value="${c?.videos_count||0}">
      </div>
      <div class="form-group">
        <label class="form-label">Receita este mês (€)</label>
        <input id="yt-receita" class="form-control" type="number" min="0" step="0.01" value="${c?.receita_mes||0}">
      </div>
    </div>
    <div class="form-group" id="rpm-group">
      <label class="form-label" id="rpm-label">RPM AdSense (€ por 1000 views)</label>
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

  app.openModal(isNew ? 'Novo canal de vídeo' : `Editar — ${c.nome}`, body, footer);
  // Atualizar labels com a plataforma atual
  setTimeout(() => updateVideoPlataformaLabels(platAtual), 50);
}

function selectVideoPlataforma(el) {
  const vp = el.dataset.vp;
  const info = getVideoPlataforma(vp);
  // Desativar todos
  document.querySelectorAll('#vp-platforms .platform-toggle').forEach(t => {
    t.classList.remove('active');
    t.style.background = '';
    t.style.borderColor = '';
    t.style.color = '';
  });
  // Ativar selecionado
  el.classList.add('active');
  el.style.background = `${info.color}20`;
  el.style.borderColor = info.color;
  el.style.color = info.color;
  // Atualizar hidden input
  const inp = document.getElementById('vp-plataforma');
  if (inp) inp.value = vp;
  updateVideoPlataformaLabels(vp);
}

function updateVideoPlataformaLabels(plat) {
  const info = getVideoPlataforma(plat);
  const hint = document.getElementById('canal-id-hint');
  if (hint) {
    const hints = {
      youtube:     'Encontra em youtube.com/channel/<strong>ID</strong>',
      twitch:      'O teu username no Twitch',
      tiktok:      'O teu @username no TikTok',
      vimeo:       'Ex: vimeo.com/<strong>username</strong>',
      rumble:      'O teu username no Rumble',
      dailymotion: 'O teu username no Dailymotion',
    };
    hint.innerHTML = hints[plat] || 'Handle ou ID do canal';
  }
  const subsLabel = document.getElementById('subs-label');
  if (subsLabel) subsLabel.textContent = plat === 'twitch' ? 'Seguidores' : 'Subscritores';
  const viewsLabel = document.getElementById('views-label');
  if (viewsLabel) viewsLabel.textContent = plat === 'twitch' ? 'Views médias/mês' : 'Views totais';
  const vidsLabel = document.getElementById('vids-label');
  if (vidsLabel) vidsLabel.textContent = plat === 'twitch' ? 'Streams realizados' : 'Nº de vídeos';
  const rpmLabel = document.getElementById('rpm-label');
  if (rpmLabel) rpmLabel.textContent = info.rpm_label;
  const rpmGroup = document.getElementById('rpm-group');
  if (rpmGroup) rpmGroup.style.display = plat === 'vimeo' ? 'none' : '';
}

async function gerarCanalDeConceito() {
  const conceito = document.getElementById('concept-text-youtube')?.value.trim();
  if (!conceito) { app.toast('Escreve primeiro o teu conceito', 'warning'); return; }

  const btn      = document.querySelector('#concept-panel-youtube .btn-primary');
  const progress = document.getElementById('concept-progress-youtube');
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:12px;height:12px;display:inline-block"></div> A gerar…'; }
  if (progress) progress.textContent = 'A interpretar conceito…';

  try {
    const prompt = `Cria um perfil de canal de vídeo baseado nesta descrição: "${conceito}"

Responde APENAS com JSON válido, sem markdown, sem backticks:
{
  "nome": "Nome criativo e memorável para o canal (2-4 palavras)",
  "nicho": "Nicho específico do canal",
  "plataforma": "youtube ou twitch ou tiktok ou vimeo ou rumble ou dailymotion",
  "notas": "Descrição em português: tipo de conteúdo, audiência alvo, estilo de apresentação, periodicidade sugerida — 2-3 frases"
}`;

    const raw  = await Gemini.generateText(prompt, { temperature: 0.8 });
    const m    = raw.match(/\{[\s\S]*\}/);
    const data = JSON.parse(m ? m[0] : raw);

    const set = (id, v) => { const el = document.getElementById(id); if (el && v) el.value = v; };
    set('yt-nome',  data.nome);
    set('yt-nicho', data.nicho || '');
    set('yt-notas', data.notas || '');

    // Selecionar plataforma
    if (data.plataforma) {
      const toggle = document.querySelector(`#vp-platforms [data-vp="${data.plataforma}"]`);
      if (toggle) selectVideoPlataforma(toggle);
    }

    if (progress) progress.textContent = '';
    _toggleConceptBar('youtube', false);
    app.toast(`Canal "${data.nome}" gerado a partir do conceito!`, 'success');

  } catch (e) {
    if (progress) progress.textContent = '';
    app.toast('Erro: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Gerar com IA'; }
  }
}

async function saveYoutubeChannel(id) {
  const plataforma  = document.getElementById('vp-plataforma')?.value || 'youtube';
  const nome        = document.getElementById('yt-nome')?.value.trim();
  const nicho       = document.getElementById('yt-nicho')?.value.trim();
  const canal_id    = document.getElementById('yt-canal-id')?.value.trim();
  const imagem_url  = document.getElementById('yt-img')?.value.trim();
  const seguidores  = parseInt(document.getElementById('yt-subs')?.value)||0;
  const total_views = parseInt(document.getElementById('yt-views')?.value)||0;
  const videos_count= parseInt(document.getElementById('yt-vids')?.value)||0;
  const receita_mes = parseFloat(document.getElementById('yt-receita')?.value)||0;
  const adsense_rpm = parseFloat(document.getElementById('yt-rpm')?.value)||2;
  const notas       = document.getElementById('yt-notas')?.value.trim();
  const avatar_id   = document.getElementById('yt-avatar-id')?.value || null;

  if (!nome) { app.toast('Nome é obrigatório', 'error'); return; }

  const payload = { plataforma, nome, nicho, canal_id, imagem_url, seguidores, total_views, videos_count, receita_mes, adsense_rpm, notas, avatar_id };
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

/* ── Modal Vídeos / Streams ── */
async function openYoutubeVideosModal(channelId, channelNome, plat = 'youtube') {
  if (!DB.ready()) { app.toast('Supabase necessário', 'warning'); return; }
  const { data: videos } = await DB.getYoutubeVideos(channelId);
  const vids = videos || [];
  const info = getVideoPlataforma(plat);
  const itemLabel = plat === 'twitch' ? 'stream' : 'vídeo';

  const body = `
    <div style="margin-bottom:16px">
      <button class="btn btn-sm btn-primary" onclick="openAddVideoModal('${channelId}','${channelNome.replace(/'/g,"\\'")}','${plat}')">
        <i class="fa-solid fa-plus"></i> Adicionar ${itemLabel}
      </button>
    </div>
    ${vids.length === 0 ? `
      <div class="empty-state" style="padding:30px">
        <i class="${info.icon}" style="color:${info.color}"></i>
        <p>Sem ${itemLabel}s registados</p>
      </div>
    ` : `
      <div style="display:flex;flex-direction:column;gap:10px;max-height:420px;overflow-y:auto">
        ${vids.map(v => `
          <div style="background:var(--bg-elevated);border-radius:10px;padding:12px;display:flex;gap:12px;align-items:center">
            ${v.thumbnail_url
              ? `<img src="${v.thumbnail_url}" style="width:72px;height:48px;object-fit:cover;border-radius:6px;flex-shrink:0">`
              : `<div style="width:72px;height:48px;background:${info.color}20;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="${info.icon}" style="color:${info.color}"></i></div>`}
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:.9rem;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v.titulo}</div>
              <div style="display:flex;gap:12px;font-size:.8rem;color:var(--text-muted)">
                <span><i class="fa-solid fa-eye"></i> ${app.formatNumber(v.views)}</span>
                <span><i class="fa-solid fa-thumbs-up"></i> ${app.formatNumber(v.likes)}</span>
                <span style="color:var(--green)"><i class="fa-solid fa-euro-sign"></i> ${parseFloat(v.receita_estimada||0).toFixed(2)}</span>
                ${v.publicado_em ? `<span>${app.formatDate(v.publicado_em).split(',')[0]}</span>` : ''}
              </div>
            </div>
            <button class="btn btn-sm btn-danger btn-icon" onclick="deleteVideoConfirmed('${v.id}','${channelId}','${channelNome.replace(/'/g,"\\'")}','${plat}')">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>`).join('')}
      </div>
    `}`;

  app.openModal(`${plat === 'twitch' ? 'Streams' : 'Vídeos'} — ${channelNome}`, body, `<button class="btn btn-secondary" onclick="app.closeModal()">Fechar</button>`);
}

async function openAddVideoModal(channelId, channelNome = '', plat = 'youtube') {
  const info = getVideoPlataforma(plat);
  const itemLabel = plat === 'twitch' ? 'Stream' : 'Vídeo';
  const body = `
    <div class="form-group">
      <label class="form-label">Título *</label>
      <input id="vid-titulo" class="form-control" placeholder="Título do ${itemLabel.toLowerCase()}">
    </div>
    <div class="form-group">
      <label class="form-label">ID / URL do ${itemLabel}</label>
      <input id="vid-id" class="form-control" placeholder="${plat === 'youtube' ? 'dQw4w9WgXcQ' : 'URL ou ID'}">
    </div>
    <div class="form-group">
      <label class="form-label">URL da thumbnail</label>
      <input id="vid-thumb" class="form-control" placeholder="https://…">
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Views</label>
        <input id="vid-views" class="form-control" type="number" min="0" value="0">
      </div>
      <div class="form-group">
        <label class="form-label">${plat === 'twitch' ? 'Peak viewers' : 'Likes'}</label>
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

  app.openModal(`Adicionar ${itemLabel}`, body, `
    <button class="btn btn-secondary" onclick="openYoutubeVideosModal('${channelId}','${channelNome.replace(/'/g,"\\'")}','${plat}')">Voltar</button>
    <button class="btn btn-primary" onclick="saveYoutubeVideo('${channelId}','${plat}')">
      <i class="fa-solid fa-floppy-disk"></i> Guardar
    </button>`);
}

async function saveYoutubeVideo(channelId, plat = 'youtube') {
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

  app.toast('Adicionado!', 'success');
  app.closeModal();
  renderYoutube(document.getElementById('content'));
}

async function deleteVideoConfirmed(videoId, channelId, channelNome, plat = 'youtube') {
  if (DB.ready()) {
    const { error } = await DB.deleteYoutubeVideo(videoId);
    if (error) { app.toast('Erro ao apagar', 'error'); return; }
  }
  app.toast('Apagado', 'success');
  openYoutubeVideosModal(channelId, channelNome, plat);
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
    <div style="font-weight:700;margin-bottom:10px">Top por views</div>
    ${topVids.length ? topVids.map((v,i) => `
      <div class="metric-row">
        <span class="metric-label"><span style="color:var(--accent);font-weight:800">#${i+1}</span> ${v.titulo}</span>
        <span class="metric-value">${app.formatNumber(v.views)} <i class="fa-solid fa-eye" style="font-size:.7rem"></i></span>
      </div>`).join('') : '<div class="text-muted text-sm" style="padding:16px 0">Sem vídeos/streams registados</div>'}
    <div style="font-weight:700;margin:16px 0 10px">Total de likes / interactions</div>
    <div class="metric-row">
      <span class="metric-label">Total likes</span>
      <span class="metric-value" style="color:var(--red)">${app.formatNumber(totalLikes)} <i class="fa-solid fa-thumbs-up" style="font-size:.7rem"></i></span>
    </div>`;

  app.openModal(`Stats — ${channelNome}`, body, `<button class="btn btn-secondary" onclick="app.closeModal()">Fechar</button>`);
}
