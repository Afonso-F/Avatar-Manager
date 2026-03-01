/* ============================================================
   sections/campanhas.js — Gestão de Campanhas Publicitárias
   ============================================================ */

const CAMP_STATUS = {
  planeamento: { label: 'Planeamento', color: 'var(--yellow)' },
  ativa:       { label: 'Ativa',        color: 'var(--green)' },
  pausada:     { label: 'Pausada',      color: 'var(--orange, #f97316)' },
  finalizada:  { label: 'Finalizada',   color: 'var(--text-muted)' },
};

const CAMP_OBJETIVO = {
  reconhecimento: 'Reconhecimento',
  trafego:        'Tráfego',
  leads:          'Leads',
  conversoes:     'Conversões',
  engagement:     'Engagement',
};

let _campState = { tab: 'todas', items: [], avatares: [] };

async function renderCampanhas(container) {
  let campanhas = [];
  let avatares  = [];

  if (DB.ready()) {
    const [cRes, aRes] = await Promise.all([
      DB.getCampanhas(),
      DB.getAvatares(),
    ]);
    campanhas = cRes.data || [];
    avatares  = aRes.data || [];
  }

  _campState.items    = campanhas;
  _campState.avatares = avatares;

  // KPIs
  const ativas       = campanhas.filter(c => c.status === 'ativa');
  const budgetTotal  = campanhas.reduce((s, c) => s + parseFloat(c.budget_total || 0), 0);
  const budgetGasto  = campanhas.reduce((s, c) => s + parseFloat(c.budget_gasto  || 0), 0);
  const totalImpressoes = campanhas.reduce((s, c) => s + (c.impressoes || 0), 0);
  const totalCliques    = campanhas.reduce((s, c) => s + (c.cliques    || 0), 0);
  const ctr = totalImpressoes > 0 ? ((totalCliques / totalImpressoes) * 100).toFixed(2) : '—';

  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Campanhas</div>
        <div class="section-subtitle">Publicidade &amp; promoções dos teus avatares</div>
      </div>
      <div class="flex gap-1">
        <button class="btn btn-secondary" onclick="openCampanhaForm()">
          <i class="fa-solid fa-plus"></i> Nova Campanha
        </button>
        <button class="btn btn-primary" onclick="openAiCampanhaWizard()">
          <i class="fa-solid fa-wand-magic-sparkles"></i> Gerar com IA
        </button>
      </div>
    </div>

    <!-- KPIs -->
    <div class="grid-3 mb-3">
      <div class="card" style="text-align:center">
        <div class="text-muted text-sm mb-1">Campanhas ativas</div>
        <div style="font-size:1.8rem;font-weight:800;color:var(--green)">${ativas.length}</div>
        <div class="text-muted text-sm">${campanhas.length} total</div>
      </div>
      <div class="card" style="text-align:center">
        <div class="text-muted text-sm mb-1">Budget total / gasto</div>
        <div style="font-size:1.8rem;font-weight:800;color:var(--accent)">€${budgetGasto.toFixed(0)}</div>
        <div class="text-muted text-sm">de €${budgetTotal.toFixed(0)} alocados</div>
      </div>
      <div class="card" style="text-align:center">
        <div class="text-muted text-sm mb-1">CTR médio</div>
        <div style="font-size:1.8rem;font-weight:800;color:var(--blue,#4f8ef7)">${ctr}${ctr !== '—' ? '%' : ''}</div>
        <div class="text-muted text-sm">${app.formatNumber(totalCliques)} cliques · ${app.formatNumber(totalImpressoes)} impressões</div>
      </div>
    </div>

    <!-- Tabs + filtros -->
    <div class="card mb-3" style="padding:0">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border)">
        <div class="tabs" style="border-bottom:none;gap:4px">
          ${['todas','ativa','pausada','planeamento','finalizada'].map(t => {
            const labels = { todas:'Todas', ativa:'Ativas', pausada:'Pausadas', planeamento:'Planeamento', finalizada:'Finalizadas' };
            const count = t === 'todas' ? campanhas.length : campanhas.filter(c => c.status === t).length;
            return `<button class="tab-btn ${_campState.tab === t ? 'active' : ''}"
              onclick="_campSetTab('${t}')">${labels[t]} <span class="badge" style="margin-left:4px;font-size:.7rem">${count}</span></button>`;
          }).join('')}
        </div>
        <div class="flex gap-1">
          <select class="form-control" style="width:auto;font-size:.8rem" id="camp-filter-avatar" onchange="_campFilter()">
            <option value="">Todos os avatares</option>
            ${avatares.map(a => `<option value="${a.id}">${a.emoji || ''} ${a.nome}</option>`).join('')}
          </select>
          <select class="form-control" style="width:auto;font-size:.8rem" id="camp-filter-plat" onchange="_campFilter()">
            <option value="">Todas as plataformas</option>
            ${['instagram','tiktok','facebook','youtube','twitter','linkedin'].map(p =>
              `<option value="${p}">${p.charAt(0).toUpperCase()+p.slice(1)}</option>`
            ).join('')}
          </select>
        </div>
      </div>
      <div id="camp-list" style="padding:12px 16px"></div>
    </div>`;

  _campFilter();
}

function _campSetTab(tab) {
  _campState.tab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.textContent.trim().toLowerCase().startsWith(
      { todas:'todas', ativa:'ativas', pausada:'pausadas', planeamento:'planea', finalizada:'finali' }[tab]
    ));
  });
  _campFilter();
}

function _campFilter() {
  const tab         = _campState.tab;
  const avatarFilter = document.getElementById('camp-filter-avatar')?.value || '';
  const platFilter   = document.getElementById('camp-filter-plat')?.value   || '';

  let list = _campState.items;
  if (tab !== 'todas')    list = list.filter(c => c.status === tab);
  if (avatarFilter)       list = list.filter(c => c.avatar_id === avatarFilter);
  if (platFilter)         list = list.filter(c => (c.plataformas || []).includes(platFilter));

  _campRenderList(list);
}

function _campRenderList(campanhas) {
  const el = document.getElementById('camp-list');
  if (!el) return;

  if (!campanhas.length) {
    el.innerHTML = `<div class="empty-state">
      <i class="fa-solid fa-bullhorn"></i>
      <p>Sem campanhas nesta vista</p>
      <button class="btn btn-primary btn-sm" onclick="openCampanhaForm()">
        <i class="fa-solid fa-plus"></i> Nova campanha
      </button>
    </div>`;
    return;
  }

  el.innerHTML = `<div style="display:flex;flex-direction:column;gap:12px">
    ${campanhas.map(c => _campCard(c)).join('')}
  </div>`;
}

function _campCard(c) {
  const st       = CAMP_STATUS[c.status] || CAMP_STATUS.planeamento;
  const avatar   = _campState.avatares.find(a => a.id === c.avatar_id);
  const pctGasto = c.budget_total > 0 ? Math.min(100, Math.round((c.budget_gasto / c.budget_total) * 100)) : 0;
  const ctr      = c.impressoes > 0 ? ((c.cliques / c.impressoes) * 100).toFixed(1) : '—';
  const cpc      = c.cliques > 0 ? (c.budget_gasto / c.cliques).toFixed(2) : '—';

  const plats = (c.plataformas || []).map(p => app.platformIcon ? app.platformIcon(p) : `<span class="badge">${p}</span>`).join(' ');

  return `
    <div style="background:var(--bg-elevated);border-radius:10px;padding:14px 16px;border:1px solid var(--border)">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
            <span style="font-weight:700;font-size:.95rem">${c.nome}</span>
            <span class="badge" style="background:${st.color}20;color:${st.color};font-size:.7rem">${st.label}</span>
            <span class="badge" style="background:var(--accent)15;color:var(--accent);font-size:.7rem">${CAMP_OBJETIVO[c.objetivo] || c.objetivo}</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;font-size:.78rem;color:var(--text-muted)">
            ${avatar ? `<span><i class="fa-solid fa-user-circle"></i> ${avatar.emoji || ''} ${avatar.nome}</span>` : ''}
            <span><i class="fa-regular fa-calendar"></i> ${c.data_inicio}${c.data_fim ? ' → ' + c.data_fim : ''}</span>
            ${plats ? `<span>${plats}</span>` : ''}
          </div>
          ${c.descricao ? `<div style="font-size:.8rem;color:var(--text-muted);margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.descricao}</div>` : ''}
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="btn btn-sm btn-secondary" onclick="campTogglePosts('${c.id}')" title="Ver posts desta campanha">
            <i class="fa-solid fa-layer-group"></i> Posts
          </button>
          <button class="btn btn-sm btn-secondary btn-icon" onclick="editCampanha('${c.id}')" title="Editar">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn btn-sm btn-danger btn-icon" onclick="deleteCampanha('${c.id}')" title="Apagar">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>

      <!-- Posts da campanha (expandível) -->
      <div id="camp-posts-${c.id}" style="display:none;margin-top:12px;border-top:1px solid var(--border);padding-top:10px">
        <div class="spinner" style="margin:8px auto"></div>
      </div>

      <!-- Budget bar -->
      <div style="margin-top:12px">
        <div style="display:flex;justify-content:space-between;font-size:.76rem;color:var(--text-muted);margin-bottom:4px">
          <span>Budget: €${parseFloat(c.budget_gasto||0).toFixed(0)} / €${parseFloat(c.budget_total||0).toFixed(0)}</span>
          <span>${pctGasto}% utilizado</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${pctGasto}%;background:${pctGasto >= 90 ? 'var(--red)' : pctGasto >= 70 ? 'var(--yellow)' : 'var(--accent)'}"></div>
        </div>
      </div>

      <!-- Métricas -->
      <div style="display:flex;gap:16px;margin-top:10px;flex-wrap:wrap">
        <div style="text-align:center">
          <div style="font-size:.7rem;color:var(--text-muted)">Impressões</div>
          <div style="font-weight:700;font-size:.88rem">${app.formatNumber(c.impressoes || 0)}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:.7rem;color:var(--text-muted)">Cliques</div>
          <div style="font-weight:700;font-size:.88rem">${app.formatNumber(c.cliques || 0)}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:.7rem;color:var(--text-muted)">CTR</div>
          <div style="font-weight:700;font-size:.88rem">${ctr}${ctr !== '—' ? '%' : ''}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:.7rem;color:var(--text-muted)">Conversões</div>
          <div style="font-weight:700;font-size:.88rem">${app.formatNumber(c.conversoes || 0)}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:.7rem;color:var(--text-muted)">CPC</div>
          <div style="font-weight:700;font-size:.88rem">${cpc !== '—' ? '€'+cpc : '—'}</div>
        </div>
      </div>
    </div>`;
}

/* ── Forms / Modal ── */
function openCampanhaForm(existing) {
  const avatares = _campState.avatares;
  const hoje = new Date().toISOString().slice(0, 10);
  const PLATS = ['instagram','tiktok','facebook','youtube','twitter','linkedin'];
  const selPlats = existing?.plataformas || [];

  const body = `
    <div class="form-group">
      <label class="form-label">Nome da campanha *</label>
      <input id="camp-nome" class="form-control" value="${existing?.nome || ''}" placeholder="Ex: Lançamento Verão 2026">
    </div>
    <div class="form-group">
      <label class="form-label">Descrição</label>
      <textarea id="camp-desc" class="form-control" rows="2" placeholder="Objetivo e notas da campanha">${existing?.descricao || ''}</textarea>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Objetivo</label>
        <select id="camp-obj" class="form-control">
          ${Object.entries(CAMP_OBJETIVO).map(([k, v]) =>
            `<option value="${k}" ${(existing?.objetivo || 'reconhecimento') === k ? 'selected' : ''}>${v}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select id="camp-status" class="form-control">
          ${Object.entries(CAMP_STATUS).map(([k, v]) =>
            `<option value="${k}" ${(existing?.status || 'planeamento') === k ? 'selected' : ''}>${v.label}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Avatar</label>
        <select id="camp-avatar" class="form-control">
          <option value="">— Nenhum —</option>
          ${avatares.map(a => `<option value="${a.id}" ${existing?.avatar_id === a.id ? 'selected' : ''}>${a.emoji || ''} ${a.nome}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Plataformas</label>
        <div style="display:flex;flex-wrap:wrap;gap:6px;padding:6px 0">
          ${PLATS.map(p => `
            <label style="display:flex;align-items:center;gap:4px;font-size:.82rem;cursor:pointer">
              <input type="checkbox" value="${p}" class="camp-plat-check" ${selPlats.includes(p) ? 'checked' : ''}> ${p}
            </label>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Budget total (€)</label>
        <input id="camp-budget-total" class="form-control" type="number" min="0" step="1" value="${existing?.budget_total || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Budget gasto (€)</label>
        <input id="camp-budget-gasto" class="form-control" type="number" min="0" step="0.01" value="${existing?.budget_gasto || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Data início *</label>
        <input id="camp-inicio" class="form-control" type="date" value="${existing?.data_inicio || hoje}">
      </div>
      <div class="form-group">
        <label class="form-label">Data fim</label>
        <input id="camp-fim" class="form-control" type="date" value="${existing?.data_fim || ''}">
      </div>
    </div>

    <div style="border-top:1px solid var(--border);padding-top:12px;margin-top:4px">
      <div class="section-subtitle" style="margin-bottom:8px">Métricas (actualização manual)</div>
      <div class="grid-3">
        <div class="form-group mb-0">
          <label class="form-label">Impressões</label>
          <input id="camp-impressoes" class="form-control" type="number" min="0" value="${existing?.impressoes || 0}">
        </div>
        <div class="form-group mb-0">
          <label class="form-label">Cliques</label>
          <input id="camp-cliques" class="form-control" type="number" min="0" value="${existing?.cliques || 0}">
        </div>
        <div class="form-group mb-0">
          <label class="form-label">Conversões</label>
          <input id="camp-conversoes" class="form-control" type="number" min="0" value="${existing?.conversoes || 0}">
        </div>
      </div>
    </div>
    <div class="form-group" style="margin-top:12px">
      <label class="form-label">Notas</label>
      <textarea id="camp-notas" class="form-control" rows="2" placeholder="Observações adicionais">${existing?.notas || ''}</textarea>
    </div>`;

  const footer = `
    <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveCampanha('${existing?.id || ''}')">
      <i class="fa-solid fa-floppy-disk"></i> Guardar
    </button>`;

  app.openModal(existing ? 'Editar campanha' : 'Nova campanha', body, footer);
  setTimeout(() => document.getElementById('camp-nome')?.focus(), 100);
}

function editCampanha(id) {
  const c = (_campState.items || []).find(x => String(x.id) === String(id));
  if (c) openCampanhaForm(c);
}

async function saveCampanha(id) {
  const nome    = document.getElementById('camp-nome')?.value.trim();
  const inicio  = document.getElementById('camp-inicio')?.value;

  if (!nome)   { app.toast('Nome é obrigatório', 'warning'); return; }
  if (!inicio) { app.toast('Data de início é obrigatória', 'warning'); return; }

  const plataformas = [...document.querySelectorAll('.camp-plat-check:checked')].map(c => c.value);

  const campanha = {
    nome,
    descricao:    document.getElementById('camp-desc')?.value.trim() || null,
    objetivo:     document.getElementById('camp-obj')?.value || 'reconhecimento',
    status:       document.getElementById('camp-status')?.value || 'planeamento',
    avatar_id:    document.getElementById('camp-avatar')?.value || null,
    plataformas,
    budget_total: parseFloat(document.getElementById('camp-budget-total')?.value || '0') || 0,
    budget_gasto: parseFloat(document.getElementById('camp-budget-gasto')?.value || '0') || 0,
    data_inicio:  inicio,
    data_fim:     document.getElementById('camp-fim')?.value || null,
    impressoes:   parseInt(document.getElementById('camp-impressoes')?.value || '0') || 0,
    cliques:      parseInt(document.getElementById('camp-cliques')?.value || '0') || 0,
    conversoes:   parseInt(document.getElementById('camp-conversoes')?.value || '0') || 0,
    notas:        document.getElementById('camp-notas')?.value.trim() || null,
    atualizado_em: new Date().toISOString(),
  };
  if (id) campanha.id = id;

  if (DB.ready()) {
    const { data: saved, error } = await DB.upsertCampanha(campanha);
    if (error) { app.toast('Erro ao guardar: ' + app.fmtErr(error), 'error'); return; }
    if (id) {
      _campState.items = _campState.items.map(c => String(c.id) === String(id) ? { ...c, ...campanha } : c);
    } else {
      _campState.items = [saved || { id: Date.now(), ...campanha }, ..._campState.items];
    }
  }

  app.toast('Campanha guardada!', 'success');
  app.closeModal();
  _campFilter();
}

async function deleteCampanha(id) {
  if (!confirm('Apagar esta campanha?')) return;
  if (DB.ready()) {
    const { error } = await DB.deleteCampanha(id);
    if (error) { app.toast('Erro: ' + (error.message || error), 'error'); return; }
  }
  _campState.items = _campState.items.filter(c => String(c.id) !== String(id));
  app.toast('Campanha apagada', 'success');
  _campFilter();
}

/* ═══════════════════════════════════════════════════════════
   POSTS DA CAMPANHA (expandível no card)
═══════════════════════════════════════════════════════════ */
async function campTogglePosts(campId) {
  const el = document.getElementById(`camp-posts-${campId}`);
  if (!el) return;
  const open = el.style.display !== 'none';
  el.style.display = open ? 'none' : '';
  if (open) return;

  el.innerHTML = '<div class="spinner" style="margin:8px auto"></div>';

  const { data: posts } = await DB.getCampanhaPosts(campId);
  if (!posts?.length) {
    el.innerHTML = `
      <div class="text-sm text-muted" style="text-align:center;padding:8px">
        Sem posts nesta campanha.
        <button class="btn btn-sm btn-primary" style="margin-left:8px" onclick="openAiCampanhaWizard('${campId}')">
          <i class="fa-solid fa-plus"></i> Gerar posts
        </button>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div style="font-size:.78rem;font-weight:700;color:var(--text-muted);margin-bottom:8px">
      ${posts.length} post(s) nesta campanha
    </div>
    <div style="display:flex;flex-direction:column;gap:6px">
      ${posts.map(p => {
        const icon = p.tipo_conteudo === 'video' ? 'fa-film' : 'fa-image';
        const date = p.agendado_para
          ? new Date(p.agendado_para).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
          : '—';
        return `
          <div style="display:flex;align-items:center;gap:10px;background:var(--bg);border-radius:6px;padding:8px 10px">
            ${p.imagem_url
              ? `<img src="${p.imagem_url}" style="width:36px;height:36px;object-fit:cover;border-radius:4px;flex-shrink:0">`
              : `<div style="width:36px;height:36px;background:var(--bg-elevated);border-radius:4px;display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fa-solid ${icon} text-muted" style="font-size:.8rem"></i></div>`}
            <div style="flex:1;min-width:0">
              <div style="font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml((p.legenda || '').slice(0,80))}</div>
              <div style="font-size:.72rem;color:var(--text-muted)">${date} · ${(p.plataformas || []).join(', ')} · ${app.statusBadge(p.status)}</div>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

/* ═══════════════════════════════════════════════════════════
   WIZARD: GERAR CAMPANHA COM IA
═══════════════════════════════════════════════════════════ */
let _aiCampWizard = { step: 1, config: {}, generatedPosts: [] };

function openAiCampanhaWizard(existingCampId) {
  const avatares = _campState.avatares;
  const hoje     = new Date().toISOString().slice(0, 10);
  const PLATS    = ['instagram', 'tiktok', 'youtube', 'facebook'];

  _aiCampWizard = { step: 1, config: {}, generatedPosts: [], existingCampId: existingCampId || null };

  const body = `
    <!-- Prompt -->
    <div class="form-group">
      <label class="form-label">Prompt da campanha *</label>
      <textarea id="wiz-prompt" class="form-control" rows="3"
        placeholder="Descreve o tema, objetivo e tom da campanha…
Ex: Semana de yoga matinal para iniciantes — criar um hábito saudável com energia positiva"></textarea>
      <div class="form-hint">Quanto mais detalhe deres, mais coerente será a série de posts gerada.</div>
    </div>

    <div class="grid-2">
      <!-- Avatar -->
      <div class="form-group">
        <label class="form-label">Avatar *</label>
        <select id="wiz-avatar" class="form-control">
          <option value="">— Selecciona —</option>
          ${avatares.map(a => {
            const isActive = app.getActiveAvatar()?.id === a.id;
            return `<option value="${a.id}" ${isActive ? 'selected' : ''}>${a.emoji || ''} ${a.nome}</option>`;
          }).join('')}
        </select>
      </div>

      <!-- Nome (opcional) -->
      <div class="form-group">
        <label class="form-label">Nome da campanha <span class="text-muted text-sm">(opcional)</span></label>
        <input id="wiz-nome" class="form-control" placeholder="Gerado pela IA se vazio">
      </div>

      <!-- Data início -->
      <div class="form-group">
        <label class="form-label">Data de início</label>
        <input id="wiz-inicio" class="form-control" type="date" value="${hoje}">
      </div>

      <!-- Duração -->
      <div class="form-group">
        <label class="form-label">Duração</label>
        <select id="wiz-duracao" class="form-control">
          <option value="7" selected>7 dias (1 semana)</option>
          <option value="14">14 dias (2 semanas)</option>
          <option value="30">30 dias (1 mês)</option>
        </select>
      </div>

      <!-- Nº de posts -->
      <div class="form-group">
        <label class="form-label">Nº de posts</label>
        <select id="wiz-count" class="form-control">
          <option value="3">3 posts</option>
          <option value="5" selected>5 posts</option>
          <option value="7">7 posts</option>
        </select>
      </div>

      <!-- Horário -->
      <div class="form-group">
        <label class="form-label">Horário de publicação</label>
        <input id="wiz-hora" class="form-control" type="time" value="10:00">
      </div>

      <!-- Tipo -->
      <div class="form-group">
        <label class="form-label">Tipo de conteúdo</label>
        <select id="wiz-tipo" class="form-control">
          <option value="imagem" selected>Imagem</option>
          <option value="video">Vídeo curto</option>
        </select>
      </div>

      <!-- Objetivo -->
      <div class="form-group">
        <label class="form-label">Objetivo</label>
        <select id="wiz-obj" class="form-control">
          ${Object.entries(CAMP_OBJETIVO).map(([k, v]) =>
            `<option value="${k}" ${k === 'engagement' ? 'selected' : ''}>${v}</option>`
          ).join('')}
        </select>
      </div>
    </div>

    <!-- Plataformas -->
    <div class="form-group">
      <label class="form-label">Publicar em</label>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${PLATS.map(p => `
          <label style="display:flex;align-items:center;gap:5px;font-size:.85rem;cursor:pointer">
            <input type="checkbox" value="${p}" class="wiz-plat-check" checked> ${app.platformIcon(p)} ${p}
          </label>`).join('')}
      </div>
    </div>

    <div id="wiz-error" style="color:var(--red);font-size:.85rem;display:none;margin-top:4px"></div>`;

  const footer = `
    <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
    <button class="btn btn-primary" id="wiz-gen-btn" onclick="_wizGenerate()">
      <i class="fa-solid fa-wand-magic-sparkles"></i> Gerar posts com IA
    </button>`;

  app.openModal('Gerar Campanha com IA', body, footer);
  setTimeout(() => document.getElementById('wiz-prompt')?.focus(), 100);
}

async function _wizGenerate() {
  const prompt   = document.getElementById('wiz-prompt')?.value.trim();
  const avatarId = document.getElementById('wiz-avatar')?.value;
  const errEl    = document.getElementById('wiz-error');
  const btn      = document.getElementById('wiz-gen-btn');

  if (!prompt)   { errEl.textContent = 'O prompt é obrigatório.'; errEl.style.display = ''; return; }
  if (!avatarId) { errEl.textContent = 'Selecciona um avatar.';   errEl.style.display = ''; return; }
  errEl.style.display = 'none';

  const avatar    = _campState.avatares.find(a => a.id === avatarId);
  const count     = parseInt(document.getElementById('wiz-count')?.value    || '5', 10);
  const duracao   = parseInt(document.getElementById('wiz-duracao')?.value  || '7', 10);
  const inicio    = document.getElementById('wiz-inicio')?.value;
  const hora      = document.getElementById('wiz-hora')?.value || '10:00';
  const tipo      = document.getElementById('wiz-tipo')?.value || 'imagem';
  const obj       = document.getElementById('wiz-obj')?.value  || 'engagement';
  const nome      = document.getElementById('wiz-nome')?.value.trim();
  const plats     = [...document.querySelectorAll('.wiz-plat-check:checked')].map(e => e.value);

  _aiCampWizard.config = { prompt, avatar, count, duracao, inicio, hora, tipo, obj, nome, plats };

  btn.disabled  = true;
  btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:6px"></div> A gerar…';

  try {
    // Carregar posts anteriores do avatar como contexto de estilo
    let prevPosts = [];
    if (DB.ready()) {
      const { data } = await DB.getPosts({ avatar_id: avatarId, limit: 5 });
      prevPosts = data || [];
    }

    const posts = await AI.generateCampaignPosts(avatar, prompt, { count, contentType: tipo, prevPosts });
    _aiCampWizard.generatedPosts = posts;

    // Calcular datas distribuídas ao longo da duração
    const startDate  = new Date(`${inicio}T${hora}:00`);
    const intervalMs = (duracao / count) * 24 * 60 * 60 * 1000;
    posts.forEach((p, i) => {
      const d = new Date(startDate.getTime() + i * intervalMs);
      p._scheduledAt = d.toISOString().slice(0, 16);
    });

    _wizShowReview();
  } catch (e) {
    errEl.textContent = 'Erro ao gerar: ' + e.message;
    errEl.style.display = '';
  } finally {
    btn.disabled  = false;
    btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Gerar posts com IA';
  }
}

function _wizShowReview() {
  const posts  = _aiCampWizard.generatedPosts;
  const config = _aiCampWizard.config;
  const isVideo = config.tipo === 'video';

  const body = `
    <div style="margin-bottom:12px;padding:10px;background:var(--bg-elevated);border-radius:var(--radius-sm)">
      <div style="font-size:.85rem;font-weight:600">
        <i class="fa-solid fa-wand-magic-sparkles" style="color:var(--accent)"></i>
        ${posts.length} posts gerados para ${config.duracao} dias · ${config.avatar?.nome}
      </div>
      <div class="text-sm text-muted">Revê e edita cada post abaixo. Os campos são editáveis.</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px;max-height:60vh;overflow-y:auto;padding-right:4px">
      ${posts.map((p, i) => `
        <div style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px" id="wiz-post-${i}">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
            <span class="badge" style="background:var(--accent);color:#fff">Dia ${p.dia || i+1}</span>
            <span style="font-weight:600;font-size:.88rem">${escHtml(p.titulo || '')}</span>
            <span style="margin-left:auto;font-size:.75rem;color:var(--text-muted)">${p._scheduledAt || ''}</span>
          </div>
          <div class="form-group mb-2">
            <label class="form-label" style="font-size:.75rem">Legenda</label>
            <textarea class="form-control wiz-legenda" data-idx="${i}" rows="3">${escHtml(p.legenda || '')}</textarea>
          </div>
          <div class="form-group mb-2">
            <label class="form-label" style="font-size:.75rem">Hashtags</label>
            <textarea class="form-control wiz-hashtags" data-idx="${i}" rows="2">${escHtml(p.hashtags || '')}</textarea>
          </div>
          <div class="form-group mb-2">
            <label class="form-label" style="font-size:.75rem">Prompt ${isVideo ? 'de vídeo' : 'de imagem'}</label>
            <textarea class="form-control wiz-media" data-idx="${i}" rows="2">${escHtml(p.prompt_media || '')}</textarea>
          </div>
          <div class="form-group mb-0">
            <label class="form-label" style="font-size:.75rem">Data / hora agendada</label>
            <input class="form-control wiz-schedule" data-idx="${i}" type="datetime-local" value="${p._scheduledAt || ''}">
          </div>
        </div>`).join('')}
    </div>
    <div id="wiz-save-error" style="color:var(--red);font-size:.85rem;display:none;margin-top:8px"></div>`;

  const footer = `
    <button class="btn btn-secondary" onclick="openAiCampanhaWizard()">← Voltar</button>
    <button class="btn btn-primary" id="wiz-save-btn" onclick="_wizSaveAll()">
      <i class="fa-solid fa-calendar-plus"></i> Confirmar e Agendar
    </button>`;

  app.openModal('Rever e Agendar Campanha', body, footer);
}

async function _wizSaveAll() {
  const config = _aiCampWizard.config;
  const btn    = document.getElementById('wiz-save-btn');
  const errEl  = document.getElementById('wiz-save-error');

  // Ler edições dos campos
  const posts = _aiCampWizard.generatedPosts.map((p, i) => ({
    ...p,
    legenda:      document.querySelector(`.wiz-legenda[data-idx="${i}"]`)?.value.trim()    || p.legenda,
    hashtags:     document.querySelector(`.wiz-hashtags[data-idx="${i}"]`)?.value.trim()   || p.hashtags,
    prompt_media: document.querySelector(`.wiz-media[data-idx="${i}"]`)?.value.trim()      || p.prompt_media,
    _scheduledAt: document.querySelector(`.wiz-schedule[data-idx="${i}"]`)?.value          || p._scheduledAt,
  }));

  if (!DB.ready()) { errEl.textContent = 'BD não conectada.'; errEl.style.display = ''; return; }

  btn.disabled  = true;
  btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:6px"></div> A guardar…';

  try {
    // 1. Criar campanha
    const fim = new Date(config.inicio);
    fim.setDate(fim.getDate() + config.duracao);

    const campObj = {
      nome:        config.nome || `Campanha IA — ${config.prompt.slice(0, 40)}`,
      descricao:   config.prompt,
      objetivo:    config.obj,
      status:      'planeamento',
      avatar_id:   config.avatar?.id || null,
      plataformas: config.plats,
      data_inicio: config.inicio,
      data_fim:    fim.toISOString().slice(0, 10),
    };
    if (_aiCampWizard.existingCampId) campObj.id = _aiCampWizard.existingCampId;

    const { data: savedCamp, error: campErr } = await DB.upsertCampanha(campObj);
    if (campErr) throw new Error('Erro ao criar campanha: ' + (campErr.message || campErr));

    const campId = savedCamp?.id || _aiCampWizard.existingCampId;

    // 2. Criar posts ligados à campanha
    const isVideo = config.tipo === 'video';
    let saved = 0;
    for (const p of posts) {
      const postObj = {
        avatar_id:     config.avatar?.id,
        legenda:       p.legenda,
        hashtags:      p.hashtags || '',
        plataformas:   config.plats,
        tipo_conteudo: config.tipo,
        campanha_id:   campId,
        status:        'agendado',
        agendado_para: p._scheduledAt ? new Date(p._scheduledAt).toISOString() : null,
      };
      if (isVideo) postObj.modelo_video = config.avatar?.nicho || null;

      const { error: postErr } = await DB.upsertPost(postObj);
      if (postErr) throw new Error(`Erro no post ${p.dia}: ${postErr.message || postErr}`);
      saved++;
    }

    // 3. Actualizar estado local
    if (!_aiCampWizard.existingCampId) {
      _campState.items = [savedCamp || { id: campId, ...campObj }, ..._campState.items];
    }

    app.closeModal();
    app.toast(`Campanha criada com ${saved} posts agendados! Prompts de ${isVideo ? 'vídeo' : 'imagem'} guardados — gera as imagens na Fila.`, 'success');
    _campFilter();
  } catch (e) {
    errEl.textContent = e.message;
    errEl.style.display = '';
    btn.disabled  = false;
    btn.innerHTML = '<i class="fa-solid fa-calendar-plus"></i> Confirmar e Agendar';
  }
}
