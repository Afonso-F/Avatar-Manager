/* ============================================================
   sections/monetizacao.js — Visão geral de monetização
   ============================================================ */

async function renderMonetizacao(container) {
  let avatares = [], canais = [], musicos = [], fanslyStats = [];

  if (DB.ready()) {
    const [avRes, ytRes, muRes] = await Promise.all([
      DB.getAvatares(),
      DB.getYoutubeChannels(),
      DB.getMusicos(),
    ]);
    avatares = avRes.data || [];
    canais   = ytRes.data || [];
    musicos  = muRes.data || [];
    app.setAvatares(avatares); // permite que openAvatarFanslyModal faça lookup

    // Carregar Fansly stats do mês atual para todos os avatares
    const mesAtual = new Date().toISOString().slice(0,7) + '-01';
    const fRes = await DB.getFanslyStats(null, mesAtual);
    fanslyStats = fRes.data || [];
  }

  _despesasCache = [];  // reset

  // Calcular receitas
  const receitaFansly  = fanslyStats.reduce((s,f) => s + (parseFloat(f.receita)||0) + (parseFloat(f.tips)||0), 0);
  const receitaYoutube = canais.reduce((s,c) => s + (parseFloat(c.receita_mes)||0), 0);
  const receitaMusicos = musicos.reduce((s,m) => s + (parseFloat(m.receita_mes)||0), 0);
  const totalReceita   = receitaFansly + receitaYoutube + receitaMusicos;

  const subsTotal    = fanslyStats.reduce((s,f) => s + (f.subscribers||0), 0);
  const ytViews      = canais.reduce((s,c) => s + (c.total_views||0), 0);
  const musicStreams  = musicos.reduce((s,m) => s + (m.total_streams||0), 0);

  const hoje = new Date();
  const mesNome = hoje.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });

  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Monetização</div>
        <div class="section-subtitle">Receitas de todos os conteúdos — ${mesNome}</div>
      </div>
      <div class="flex gap-1">
        <button class="btn btn-secondary" onclick="exportReceitasCsv()">
          <i class="fa-solid fa-file-csv"></i> Exportar CSV
        </button>
      </div>
    </div>

    <!-- Total destaque -->
    <div class="card mb-3" style="background:linear-gradient(135deg,var(--bg-elevated),var(--bg-surface));border:1px solid var(--border-light)">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px">
        <div style="display:flex;gap:32px;flex-wrap:wrap">
          <div>
            <div class="text-muted text-sm" style="margin-bottom:4px">Receita total (mês atual)</div>
            <div style="font-size:2.5rem;font-weight:800;color:var(--green)">€${totalReceita.toFixed(2)}</div>
          </div>
          <div>
            <div class="text-muted text-sm" style="margin-bottom:4px">Lucro líquido</div>
            <div id="lucro-liquido-val" style="font-size:2.5rem;font-weight:800;color:var(--accent)">€—</div>
          </div>
        </div>
        <div style="display:flex;gap:20px;flex-wrap:wrap">
          <div style="text-align:center">
            <div style="font-size:1.3rem;font-weight:700;color:var(--pink)">${subsTotal.toLocaleString()}</div>
            <div class="text-muted text-sm">Subscritores Fansly</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:1.3rem;font-weight:700;color:var(--red)">${app.formatNumber(ytViews)}</div>
            <div class="text-muted text-sm">Views YouTube</div>
          </div>
          <div style="font-size:1.3rem;font-weight:700;color:var(--accent);text-align:center">
            <div>${app.formatNumber(musicStreams)}</div>
            <div class="text-muted text-sm">Streams Música</div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid-3 mb-3">
      <!-- Fansly / Avatares -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title" style="display:flex;align-items:center;gap:8px">
              <i class="fa-solid fa-masks-theater" style="color:var(--pink)"></i>
              Fansly (Avatares)
            </div>
            <div class="card-subtitle">${avatares.length} avatar${avatares.length !== 1 ? 'es' : ''}</div>
          </div>
        </div>
        <div class="kpi-block" style="text-align:center;padding:16px 0">
          <div style="font-size:1.8rem;font-weight:800;color:var(--pink)">€${receitaFansly.toFixed(2)}</div>
          <div class="text-muted text-sm">Receita + Tips</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${avatares.length ? avatares.map(a => {
            const stat      = fanslyStats.find(f => String(f.avatar_id) === String(a.id));
            const rec       = stat ? (parseFloat(stat.receita||0) + parseFloat(stat.tips||0)) : 0;
            const subs      = stat?.subscribers || 0;
            const refs      = a.imagens_referencia || [];
            const avatarSrc = refs[0] || a.imagem_url || null;
            return `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px;background:var(--bg-elevated);border-radius:8px">
                <div style="display:flex;align-items:center;gap:8px">
                  <div style="width:32px;height:32px;border-radius:50%;overflow:hidden;flex-shrink:0;background:var(--bg-hover);display:flex;align-items:center;justify-content:center">
                    ${avatarSrc
                      ? `<img src="${avatarSrc}" style="width:100%;height:100%;object-fit:cover">`
                      : `<span style="font-size:1.1rem">${a.emoji||'🎭'}</span>`}
                  </div>
                  <div>
                    <div style="font-size:.85rem;font-weight:600">${a.nome}</div>
                    <div style="font-size:.75rem;color:var(--text-muted)">${subs.toLocaleString()} subs</div>
                  </div>
                </div>
                <div style="text-align:right">
                  <div style="font-weight:700;color:var(--pink)">€${rec.toFixed(2)}</div>
                  <button class="btn btn-sm btn-secondary" style="font-size:.7rem;padding:2px 8px;margin-top:4px" onclick="openAvatarFanslyModal('${a.id}')">
                    <i class="fa-solid fa-pen"></i> Editar
                  </button>
                </div>
              </div>`;
          }).join('') : `<div class="text-muted text-sm text-center" style="padding:20px">
            <p>Sem avatares.<br><a href="#avatares" onclick="app.navigate('avatares')" style="color:var(--accent)">Criar avatar</a></p>
          </div>`}
        </div>
      </div>

      <!-- YouTube -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title" style="display:flex;align-items:center;gap:8px">
              <i class="fa-brands fa-youtube" style="color:var(--red)"></i>
              YouTube AdSense
            </div>
            <div class="card-subtitle">${canais.length} canal${canais.length !== 1 ? 'is' : ''}</div>
          </div>
        </div>
        <div class="kpi-block" style="text-align:center;padding:16px 0">
          <div style="font-size:1.8rem;font-weight:800;color:var(--red)">€${receitaYoutube.toFixed(2)}</div>
          <div class="text-muted text-sm">Receita estimada</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${canais.length ? canais.map(c => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px;background:var(--bg-elevated);border-radius:8px">
              <div>
                <div style="font-size:.85rem;font-weight:600">${c.nome}</div>
                <div style="font-size:.75rem;color:var(--text-muted)">${app.formatNumber(c.seguidores)} subs · ${app.formatNumber(c.total_views)} views</div>
              </div>
              <div style="font-weight:700;color:var(--red)">€${parseFloat(c.receita_mes||0).toFixed(2)}</div>
            </div>`).join('') : `<div class="text-muted text-sm text-center" style="padding:20px">
              <p>Sem canais.<br><a href="#youtube" onclick="app.navigate('youtube')" style="color:var(--accent)">Adicionar canal</a></p>
            </div>`}
        </div>
      </div>

      <!-- Música -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title" style="display:flex;align-items:center;gap:8px">
              <i class="fa-solid fa-music" style="color:var(--accent)"></i>
              Streaming Musical
            </div>
            <div class="card-subtitle">${musicos.length} artista${musicos.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <div class="kpi-block" style="text-align:center;padding:16px 0">
          <div style="font-size:1.8rem;font-weight:800;color:var(--accent)">€${receitaMusicos.toFixed(2)}</div>
          <div class="text-muted text-sm">Royalties estimadas</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${musicos.length ? musicos.map(m => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px;background:var(--bg-elevated);border-radius:8px">
              <div>
                <div style="font-size:.85rem;font-weight:600">${m.nome}</div>
                <div style="font-size:.75rem;color:var(--text-muted)">${app.formatNumber(m.ouvintes_mensais)} ouvintes · ${app.formatNumber(m.total_streams)} streams</div>
              </div>
              <div style="font-weight:700;color:var(--accent)">€${parseFloat(m.receita_mes||0).toFixed(2)}</div>
            </div>`).join('') : `<div class="text-muted text-sm text-center" style="padding:20px">
              <p>Sem artistas.<br><a href="#musicos" onclick="app.navigate('musicos')" style="color:var(--accent)">Adicionar artista</a></p>
            </div>`}
        </div>
      </div>
    </div>

    <!-- Metas de receita -->
    <div class="card mb-3" id="meta-receita-card">
      ${renderMetaReceita(totalReceita)}
    </div>

    <!-- Despesas -->
    <div class="card mb-3" id="despesas-card">
      <div class="card-header">
        <div class="card-title"><i class="fa-solid fa-receipt" style="color:var(--red)"></i> Despesas</div>
        <button class="btn btn-sm btn-secondary" onclick="openDespesaForm()">
          <i class="fa-solid fa-plus"></i> Adicionar
        </button>
      </div>
      <div id="despesas-list">
        <div class="spinner-block"><div class="spinner"></div></div>
      </div>
    </div>

    <!-- Distribuição por tipo -->
    <div class="card mb-3">
      <div class="card-header">
        <div class="card-title">Distribuição de receita</div>
        <div class="card-subtitle">Por tipo de conteúdo</div>
      </div>
      ${renderRevenueDistribution(receitaFansly, receitaYoutube, receitaMusicos, totalReceita)}
    </div>

    <!-- Dicas -->
    <div class="card">
      <div class="card-header"><div class="card-title"><i class="fa-solid fa-lightbulb" style="color:var(--yellow)"></i> Dicas de monetização</div></div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${[
          { icon:'fa-masks-theater', color:'var(--pink)', tip:'Fansly: Publica conteúdo exclusivo regularmente para reter subscritores. Considera tiers de subscrição com diferentes preços.' },
          { icon:'fa-youtube', color:'var(--red)', tip:'YouTube: Ativa o YPP (YouTube Partner Program) com mínimo 1000 subscritores e 4000h de watch time. O RPM médio é €1-€5.' },
          { icon:'fa-music', color:'var(--accent)', tip:'Música: O Spotify paga €0.003-€0.005 por stream. Distribui através de DistroKid, TuneCore ou CD Baby para chegar a todas as plataformas.' },
        ].map(d => `
          <div style="display:flex;gap:12px;padding:12px;background:var(--bg-elevated);border-radius:8px">
            <i class="fa-solid ${d.icon}" style="color:${d.color};font-size:1.1rem;flex-shrink:0;margin-top:2px"></i>
            <p class="text-sm" style="color:var(--text-secondary);line-height:1.6">${d.tip}</p>
          </div>`).join('')}
      </div>
    </div>
  `;

  // Carregar despesas após render
  loadDespesas();
}

function renderRevenueDistribution(fansly, youtube, musicos, total) {
  if (total === 0) {
    return '<div class="text-muted text-sm text-center" style="padding:20px">Sem receitas registadas este mês</div>';
  }

  const items = [
    { label: 'Fansly (Avatares)', value: fansly, color: 'var(--pink)' },
    { label: 'YouTube AdSense',   value: youtube, color: 'var(--red)' },
    { label: 'Streaming Musical', value: musicos, color: 'var(--accent)' },
  ].filter(i => i.value > 0);

  return `
    <div style="display:flex;flex-direction:column;gap:12px">
      ${items.map(item => {
        const pct = Math.round((item.value / total) * 100);
        return `
          <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
              <span class="text-sm" style="color:${item.color}">${item.label}</span>
              <span class="text-sm" style="font-weight:700">€${item.value.toFixed(2)} <span style="color:var(--text-muted)">(${pct}%)</span></span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width:${pct}%;background:${item.color}"></div>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

/* ── Metas de receita ── */
function renderMetaReceita(totalReceita) {
  const meta  = parseFloat(localStorage.getItem('as_meta_receita') || '0');
  const pct   = meta > 0 ? Math.min(100, Math.round((totalReceita / meta) * 100)) : 0;
  const color = pct >= 100 ? 'var(--green)' : pct >= 60 ? 'var(--yellow)' : 'var(--accent)';

  return `
    <div class="card-header">
      <div class="card-title"><i class="fa-solid fa-bullseye" style="color:var(--accent)"></i> Meta de receita mensal</div>
      <button class="btn btn-sm btn-ghost" onclick="openMetaReceita()"><i class="fa-solid fa-pen"></i> Editar</button>
    </div>
    ${meta > 0 ? `
      <div style="margin-top:8px">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span class="text-sm" style="color:${color}">€${totalReceita.toFixed(2)} / €${meta.toFixed(2)}</span>
          <span class="text-sm;font-weight:700" style="color:${color}">${pct}%</span>
        </div>
        <div class="progress-bar" style="height:12px;border-radius:6px">
          <div class="progress-fill" style="width:${pct}%;background:${color};border-radius:6px;transition:width 0.6s ease"></div>
        </div>
        <div class="text-sm text-muted mt-2">
          ${pct >= 100
            ? '<i class="fa-solid fa-trophy" style="color:var(--yellow)"></i> Meta atingida! Parabéns!'
            : `Faltam €${(meta - totalReceita).toFixed(2)} para atingir a meta`}
        </div>
      </div>` : `
      <div class="text-sm text-muted mt-2">
        Sem meta definida. <button class="btn btn-sm btn-ghost" onclick="openMetaReceita()">Definir meta</button>
      </div>`}`;
}

function openMetaReceita() {
  const atual = localStorage.getItem('as_meta_receita') || '';
  const body  = `
    <div class="form-group mb-0">
      <label class="form-label">Meta mensal (€)</label>
      <input id="meta-val" class="form-control" type="number" min="0" step="0.01" value="${atual}" placeholder="Ex: 5000">
    </div>`;
  const footer = `
    <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveMetaReceita()"><i class="fa-solid fa-floppy-disk"></i> Guardar</button>`;
  app.openModal('Meta de receita mensal', body, footer);
  setTimeout(() => document.getElementById('meta-val')?.focus(), 100);
}

function saveMetaReceita() {
  const val = parseFloat(document.getElementById('meta-val')?.value || '0');
  if (isNaN(val) || val < 0) { app.toast('Valor inválido', 'warning'); return; }
  localStorage.setItem('as_meta_receita', val.toString());
  app.toast('Meta guardada!', 'success');
  app.closeModal();
  // Re-render o card
  const card = document.getElementById('meta-receita-card');
  if (card) {
    const totalEl = document.querySelector('[style*="font-size:2.5rem"]');
    const totalStr = totalEl?.textContent.replace('€','').trim() || '0';
    card.innerHTML = renderMetaReceita(parseFloat(totalStr));
  }
}

/* ── Despesas ── */
let _despesasCache = [];

async function loadDespesas() {
  const el = document.getElementById('despesas-list');
  if (!el) return;

  if (DB.ready()) {
    const { data } = await DB.getDespesas();
    _despesasCache = data || [];
  }

  renderDespesasList();
}

function renderDespesasList() {
  const el = document.getElementById('despesas-list');
  if (!el) return;

  const total = _despesasCache.reduce((s, d) => s + parseFloat(d.valor || 0), 0);

  // Atualizar lucro líquido (receita total vem do elemento já renderizado)
  const lucroEl = document.getElementById('lucro-liquido-val');
  if (lucroEl) {
    const receitaEl = document.querySelector('[style*="font-size:2.5rem"][style*="color:var(--green)"]');
    const receitaStr = receitaEl?.textContent?.replace('€', '').trim() || '0';
    const receita = parseFloat(receitaStr) || 0;
    const lucro = receita - total;
    lucroEl.textContent = `€${lucro.toFixed(2)}`;
    lucroEl.style.color = lucro >= 0 ? 'var(--green)' : 'var(--red)';
  }

  if (!_despesasCache.length) {
    el.innerHTML = `<div class="text-muted text-sm text-center" style="padding:20px">
      Sem despesas registadas. <button class="btn btn-sm btn-ghost" onclick="openDespesaForm()">Adicionar</button>
    </div>`;
    return;
  }

  const categColors = {
    producao:    'var(--accent)',
    ads:         'var(--yellow)',
    software:    'var(--blue)',
    equipamento: 'var(--pink)',
    outro:       'var(--text-muted)',
  };

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px">
      ${_despesasCache.map(d => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px;background:var(--bg-elevated);border-radius:8px">
          <div style="display:flex;align-items:center;gap:10px">
            <span class="badge" style="background:${categColors[d.categoria]||'var(--text-muted)'}20;color:${categColors[d.categoria]||'var(--text-muted)'}">
              ${d.categoria || 'outro'}
            </span>
            <div>
              <div style="font-size:.85rem;font-weight:600">${d.descricao}</div>
              <div style="font-size:.75rem;color:var(--text-muted)">${d.data || ''}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-weight:700;color:var(--red)">-€${parseFloat(d.valor).toFixed(2)}</span>
            <button class="btn btn-sm btn-danger btn-icon" onclick="deleteDespesa('${d.id}')" title="Apagar"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>`).join('')}
      <div style="border-top:1px solid var(--border);padding-top:8px;text-align:right">
        <span class="text-sm text-muted">Total despesas: </span>
        <span style="font-weight:700;color:var(--red)">€${total.toFixed(2)}</span>
      </div>
    </div>`;
}

function openDespesaForm(existing) {
  const body = `
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Descrição</label>
        <input id="desp-desc" class="form-control" value="${existing?.descricao || ''}" placeholder="Ex: Adobe CC, Meta Ads…">
      </div>
      <div class="form-group">
        <label class="form-label">Valor (€)</label>
        <input id="desp-valor" class="form-control" type="number" min="0" step="0.01" value="${existing?.valor || ''}">
      </div>
      <div class="form-group mb-0">
        <label class="form-label">Categoria</label>
        <select id="desp-cat" class="form-control">
          ${['producao','ads','software','equipamento','outro'].map(c =>
            `<option value="${c}" ${(existing?.categoria || 'outro') === c ? 'selected' : ''}>${c}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group mb-0">
        <label class="form-label">Data</label>
        <input id="desp-data" class="form-control" type="date" value="${existing?.data || new Date().toISOString().slice(0,10)}">
      </div>
    </div>`;
  const footer = `
    <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveDespesa('${existing?.id || ''}')">
      <i class="fa-solid fa-floppy-disk"></i> Guardar
    </button>`;
  app.openModal(existing ? 'Editar despesa' : 'Adicionar despesa', body, footer);
  setTimeout(() => document.getElementById('desp-desc')?.focus(), 100);
}

async function saveDespesa(id) {
  const descricao  = document.getElementById('desp-desc')?.value.trim();
  const valor      = parseFloat(document.getElementById('desp-valor')?.value || '0');
  const categoria  = document.getElementById('desp-cat')?.value || 'outro';
  const data       = document.getElementById('desp-data')?.value;

  if (!descricao) { app.toast('Adiciona uma descrição', 'warning'); return; }
  if (isNaN(valor) || valor <= 0) { app.toast('Valor inválido', 'warning'); return; }

  const despesa = { descricao, valor, categoria, data };
  if (id) despesa.id = id;

  if (DB.ready()) {
    const { data: saved, error } = await DB.upsertDespesa(despesa);
    if (error) { app.toast('Erro ao guardar: ' + error, 'error'); return; }
    if (id) {
      _despesasCache = _despesasCache.map(d => String(d.id) === String(id) ? { ...d, ...despesa } : d);
    } else {
      _despesasCache = [saved || despesa, ..._despesasCache];
    }
  } else {
    if (id) {
      _despesasCache = _despesasCache.map(d => String(d.id) === String(id) ? { ...d, ...despesa } : d);
    } else {
      _despesasCache = [{ id: Date.now(), ...despesa }, ..._despesasCache];
    }
  }

  app.toast('Despesa guardada!', 'success');
  app.closeModal();
  renderDespesasList();
}

async function deleteDespesa(id) {
  if (!confirm('Apagar esta despesa?')) return;
  if (DB.ready()) {
    const { error } = await DB.deleteDespesa(id);
    if (error) { app.toast('Erro: ' + error, 'error'); return; }
  }
  _despesasCache = _despesasCache.filter(d => String(d.id) !== String(id));
  renderDespesasList();
  app.toast('Despesa apagada', 'success');
}

/* ── Exportar CSV de receitas ── */
function exportReceitasCsv() {
  const rows = [
    ['Tipo', 'Nome', 'Receita (€)'],
  ];

  // Adicionar despesas ao CSV também
  const despesas = _despesasCache || [];

  // Construir CSV simples
  const csvContent = [
    'data:text/csv;charset=utf-8,',
    'Tipo,Nome,Valor (€),Categoria\n',
    ...despesas.map(d => `Despesa,"${d.descricao}","-${parseFloat(d.valor).toFixed(2)}","${d.categoria || ''}"\n`),
  ].join('');

  const link = document.createElement('a');
  link.href = encodeURI(csvContent);
  link.download = `despesas_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  app.toast('CSV exportado!', 'success');
}

// openAvatarFanslyModal está definido em avatares.js e é partilhado globalmente
