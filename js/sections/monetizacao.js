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

    // Carregar Fansly stats do mês atual para todos os avatares
    const mesAtual = new Date().toISOString().slice(0,7) + '-01';
    const fRes = await DB.getFanslyStats(null, mesAtual);
    fanslyStats = fRes.data || [];
  }

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
    </div>

    <!-- Total destaque -->
    <div class="card mb-3" style="background:linear-gradient(135deg,var(--bg-elevated),var(--bg-surface));border:1px solid var(--border-light)">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px">
        <div>
          <div class="text-muted text-sm" style="margin-bottom:4px">Receita total (mês atual)</div>
          <div style="font-size:2.5rem;font-weight:800;color:var(--green)">€${totalReceita.toFixed(2)}</div>
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
            const stat = fanslyStats.find(f => String(f.avatar_id) === String(a.id));
            const rec  = stat ? (parseFloat(stat.receita||0) + parseFloat(stat.tips||0)) : 0;
            const subs = stat?.subscribers || 0;
            return `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px;background:var(--bg-elevated);border-radius:8px">
                <div style="display:flex;align-items:center;gap:8px">
                  <span style="font-size:1.2rem">${a.emoji || '🎭'}</span>
                  <div>
                    <div style="font-size:.85rem;font-weight:600">${a.nome}</div>
                    <div style="font-size:.75rem;color:var(--text-muted)">${subs.toLocaleString()} subs</div>
                  </div>
                </div>
                <div style="text-align:right">
                  <div style="font-weight:700;color:var(--pink)">€${rec.toFixed(2)}</div>
                  <button class="btn btn-sm btn-secondary" style="font-size:.7rem;padding:2px 8px;margin-top:4px" onclick="openFanslyModal('${a.id}','${(a.nome||'').replace(/'/g,"\\'")}')">
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

    <!-- Distribuição por tipo -->
    <div class="card mb-3">
      <div class="card-header">
        <div class="card-title">Distribuição de receita</div>
        <div class="card-subtitle">Por tipo de conteúdo</div>
      </div>
      ${renderRevenueDistribution(receitaFansly, receitaYoutube, receitaMusicos, totalReceita)}
    </div>

    <!-- Dicas de otimização -->
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

/* ── Modal Fansly Stats ── */
async function openFanslyModal(avatarId, avatarNome) {
  const hoje    = new Date();
  const mesAtual = hoje.toISOString().slice(0,7) + '-01';

  let stat = null;
  if (DB.ready()) {
    const { data } = await DB.getFanslyStats(avatarId, mesAtual);
    stat = data?.[0] || null;
  }

  const body = `
    <div style="background:var(--bg-elevated);border-radius:10px;padding:14px;margin-bottom:16px">
      <div style="font-size:.85rem;color:var(--text-muted);margin-bottom:4px">A editar dados de</div>
      <div style="font-weight:700;font-size:1rem">${hoje.toLocaleDateString('pt-PT',{month:'long',year:'numeric'})}</div>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Subscritores totais</label>
        <input id="fl-subs" class="form-control" type="number" min="0" value="${stat?.subscribers||0}">
      </div>
      <div class="form-group">
        <label class="form-label">Novos subscritores</label>
        <input id="fl-novos" class="form-control" type="number" min="0" value="${stat?.novos_subs||0}">
      </div>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Receita de subscrições (€)</label>
        <input id="fl-receita" class="form-control" type="number" min="0" step="0.01" value="${stat?.receita||0}">
      </div>
      <div class="form-group">
        <label class="form-label">Tips recebidas (€)</label>
        <input id="fl-tips" class="form-control" type="number" min="0" step="0.01" value="${stat?.tips||0}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Views de conteúdo</label>
      <input id="fl-views" class="form-control" type="number" min="0" value="${stat?.views||0}">
    </div>
    <div class="form-group mb-0">
      <label class="form-label">Notas</label>
      <textarea id="fl-notas" class="form-control" rows="2" placeholder="Observações sobre este mês…">${stat?.notas||''}</textarea>
    </div>`;

  const footer = `
    <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveFanslyStats('${avatarId}','${mesAtual}','${stat?.id||''}')">
      <i class="fa-solid fa-floppy-disk"></i> Guardar
    </button>`;

  app.openModal(`Fansly — ${avatarNome}`, body, footer);
}

async function saveFanslyStats(avatarId, mes, existingId) {
  const subscribers = parseInt(document.getElementById('fl-subs')?.value)||0;
  const novos_subs  = parseInt(document.getElementById('fl-novos')?.value)||0;
  const receita     = parseFloat(document.getElementById('fl-receita')?.value)||0;
  const tips        = parseFloat(document.getElementById('fl-tips')?.value)||0;
  const views       = parseInt(document.getElementById('fl-views')?.value)||0;
  const notas       = document.getElementById('fl-notas')?.value.trim();

  const payload = { avatar_id: avatarId, mes, subscribers, novos_subs, receita, tips, views, notas };
  if (existingId) payload.id = existingId;

  if (DB.ready()) {
    const { error } = await DB.upsertFanslyStats(payload);
    if (error) { app.toast('Erro ao guardar: ' + error, 'error'); return; }
  }

  app.toast('Stats Fansly guardadas!', 'success');
  app.closeModal();
  renderMonetizacao(document.getElementById('content'));
}
