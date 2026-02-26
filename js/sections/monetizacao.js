/* ============================================================
   sections/monetizacao.js — Visão geral de monetização
   ============================================================ */

async function renderMonetizacao(container) {
  let avatares = [], canais = [], musicos = [], fanslyStats = [];
  let onlyfansStats = [], patreonStats = [], twitchStats = [];
  let afiliados = [], vendasDiretas = [];
  const mesAtual = new Date().toISOString().slice(0,7) + '-01';

  if (DB.ready()) {
    const [avRes, ytRes, muRes, ofRes, patRes, twRes, afilRes, vendRes] = await Promise.all([
      DB.getAvatares(),
      DB.getYoutubeChannels(),
      DB.getMusicos(),
      DB.getOnlyfansStats(null, mesAtual),
      DB.getPatreonStats(mesAtual),
      DB.getTwitchStats(mesAtual),
      DB.getAfiliados(),
      DB.getVendasDiretas(),
    ]);
    avatares      = avRes.data || [];
    canais        = ytRes.data || [];
    musicos       = muRes.data || [];
    onlyfansStats = ofRes.data || [];
    patreonStats  = patRes.data || [];
    twitchStats   = twRes.data || [];
    afiliados     = afilRes.data || [];
    vendasDiretas = vendRes.data || [];
    app.setAvatares(avatares);

    const fRes = await DB.getFanslyStats(null, mesAtual);
    fanslyStats = fRes.data || [];
  }

  _despesasCache = [];

  // Receitas por plataforma
  const receitaFansly    = fanslyStats.reduce((s,f) => s + (parseFloat(f.receita)||0) + (parseFloat(f.tips)||0), 0);
  const receitaOnlyfans  = onlyfansStats.reduce((s,f) => s + (parseFloat(f.receita)||0) + (parseFloat(f.tips)||0) + (parseFloat(f.ppv_receita)||0), 0);
  const receitaYoutube   = canais.reduce((s,c) => s + (parseFloat(c.receita_mes)||0), 0);
  const receitaMusicos   = musicos.reduce((s,m) => s + (parseFloat(m.receita_mes)||0), 0);
  const patreonMes       = patreonStats[0] ? parseFloat(patreonStats[0].receita||0) : 0;
  const twitchMes        = twitchStats[0]
    ? (parseFloat(twitchStats[0].bits_receita||0) + parseFloat(twitchStats[0].donations_receita||0) + parseFloat(twitchStats[0].ad_receita||0))
    : 0;
  const receitaAfiliados = afiliados.reduce((s,a) => s + (parseFloat(a.receita)||0), 0);

  // Vendas do mês atual
  const mesAtualStr = mesAtual.slice(0,7);
  const receitaVendas = vendasDiretas
    .filter(v => (v.data||'').startsWith(mesAtualStr))
    .reduce((s,v) => s + (parseFloat(v.receita_total)||0), 0);

  const totalReceita = receitaFansly + receitaOnlyfans + receitaYoutube + receitaMusicos
                     + patreonMes + twitchMes + receitaAfiliados + receitaVendas;

  const subsTotal    = fanslyStats.reduce((s,f) => s + (f.subscribers||0), 0);
  const ofSubsTotal  = onlyfansStats.reduce((s,f) => s + (f.subscribers||0), 0);
  const ytViews      = canais.reduce((s,c) => s + (c.total_views||0), 0);
  const musicStreams  = musicos.reduce((s,m) => s + (m.total_streams||0), 0);

  const hoje    = new Date();
  const mesNome = hoje.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });

  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Monetização</div>
        <div class="section-subtitle">Receitas de todos os conteúdos — ${mesNome}</div>
      </div>
      <div class="flex gap-1">
        <button class="btn btn-secondary" onclick="openRevenueSimulator()">
          <i class="fa-solid fa-calculator"></i> Simulador
        </button>
        <button class="btn btn-secondary" onclick="exportFiscalReport()">
          <i class="fa-solid fa-file-invoice"></i> Relatório Fiscal
        </button>
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
            <div class="text-muted text-sm">Subs Fansly</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:1.3rem;font-weight:700;color:var(--blue)">${ofSubsTotal.toLocaleString()}</div>
            <div class="text-muted text-sm">Subs OnlyFans</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:1.3rem;font-weight:700;color:var(--red)">${app.formatNumber(ytViews)}</div>
            <div class="text-muted text-sm">Views YouTube</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:1.3rem;font-weight:700;color:var(--accent)">${app.formatNumber(musicStreams)}</div>
            <div class="text-muted text-sm">Streams Música</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Plataformas principais: Fansly + OnlyFans + YouTube -->
    <div class="grid-3 mb-3">
      ${renderFanslyCard(avatares, fanslyStats, receitaFansly)}
      ${renderOnlyfansCard(avatares, onlyfansStats, receitaOnlyfans)}
      ${renderYoutubeCard(canais, receitaYoutube)}
    </div>

    <!-- Música + Patreon + Twitch -->
    <div class="grid-3 mb-3">
      ${renderMusicaCard(musicos, receitaMusicos)}
      ${renderPatreonCard(patreonStats[0], patreonMes)}
      ${renderTwitchCard(twitchStats[0], twitchMes)}
    </div>

    <!-- Afiliados + Vendas Diretas -->
    <div class="grid-2 mb-3">
      ${renderAfiliadosCard(afiliados, receitaAfiliados)}
      ${renderVendasCard(vendasDiretas, receitaVendas, mesAtualStr)}
    </div>

    <!-- Meta de receita -->
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
      ${renderRevenueDistribution(receitaFansly, receitaOnlyfans, receitaYoutube, receitaMusicos, patreonMes, twitchMes, receitaAfiliados, receitaVendas, totalReceita)}
    </div>

    <!-- Dicas -->
    <div class="card">
      <div class="card-header"><div class="card-title"><i class="fa-solid fa-lightbulb" style="color:var(--yellow)"></i> Dicas de monetização</div></div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${[
          { icon:'fa-masks-theater', color:'var(--pink)',   tip:'Fansly: Publica conteúdo exclusivo regularmente para reter subscritores. Considera tiers de subscrição com diferentes preços.' },
          { icon:'fa-heart',         color:'var(--blue)',   tip:'OnlyFans: O PPV (pay-per-view) pode aumentar significativamente a receita. Promove no Fansly e redes sociais cruzadamente.' },
          { icon:'fa-youtube',       color:'var(--red)',    tip:'YouTube: Ativa o YPP com mínimo 1000 subscritores e 4000h de watch time. O RPM médio é €1-€5 por 1000 views.' },
          { icon:'fa-music',         color:'var(--accent)', tip:'Música: O Spotify paga €0.003-€0.005 por stream. Distribui via DistroKid, TuneCore ou CD Baby para todas as plataformas.' },
          { icon:'fa-hand-holding-heart', color:'var(--purple)', tip:'Patreon: Cria 3 tiers de recompensas (€5, €15, €30). Conteúdo exclusivo, acesso antecipado e comunidade fechada.' },
          { icon:'fa-twitch',        color:'#9146ff',       tip:'Twitch: O programa de afiliados começa com 50 seguidores. Os bits valem ~€0.01 cada. Subscritores pagam €4.99/mês.' },
          { icon:'fa-link',          color:'var(--yellow)', tip:'Afiliados: Amazon Associates, Impact, Partnerstack. Foca em produtos que usas e recomendam naturalmente ao teu nicho.' },
          { icon:'fa-store',         color:'var(--green)',  tip:'Vendas diretas: Vende presets, templates, ebooks, cursos ou merchandise via Gumroad, Shopify ou Etsy.' },
        ].map(d => `
          <div style="display:flex;gap:12px;padding:12px;background:var(--bg-elevated);border-radius:8px">
            <i class="fa-solid ${d.icon}" style="color:${d.color};font-size:1.1rem;flex-shrink:0;margin-top:2px"></i>
            <p class="text-sm" style="color:var(--text-secondary);line-height:1.6">${d.tip}</p>
          </div>`).join('')}
      </div>
    </div>

    <!-- Tabela de preços de parceria -->
    <div class="card mt-3" id="partnership-prices-card">
      <div class="card-header">
        <div class="card-title"><i class="fa-solid fa-handshake" style="color:var(--blue)"></i> Tabela de preços de parceria</div>
        <button class="btn btn-sm btn-secondary" onclick="openPartnershipPriceForm()"><i class="fa-solid fa-plus"></i> Adicionar</button>
      </div>
      <div id="partnership-prices-list"><div class="spinner-block"><div class="spinner"></div></div></div>
    </div>

    <!-- Tracking de links de afiliados -->
    <div class="card mt-3" id="affiliate-links-card">
      <div class="card-header">
        <div class="card-title"><i class="fa-solid fa-link" style="color:var(--yellow)"></i> Links de afiliados</div>
        <button class="btn btn-sm btn-secondary" onclick="openAffiliateLinkForm()"><i class="fa-solid fa-plus"></i> Adicionar</button>
      </div>
      <div id="affiliate-links-list"><div class="spinner-block"><div class="spinner"></div></div></div>
    </div>

    <!-- Modais -->
    <div id="monetizacao-modals"></div>
  `;

  loadDespesas();
  loadPartnershipPrices();
  loadAffiliateLinks();
}

/* ── Cards por plataforma ──────────────────────────────── */

function renderFanslyCard(avatares, fanslyStats, receitaFansly) {
  return `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title" style="display:flex;align-items:center;gap:8px">
            <i class="fa-solid fa-masks-theater" style="color:var(--pink)"></i> Fansly
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
          Sem avatares. <a href="#avatares" onclick="app.navigate('avatares')" style="color:var(--accent)">Criar avatar</a>
        </div>`}
      </div>
    </div>`;
}

function renderOnlyfansCard(avatares, onlyfansStats, receitaOnlyfans) {
  return `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title" style="display:flex;align-items:center;gap:8px">
            <i class="fa-solid fa-heart" style="color:var(--blue)"></i> OnlyFans
          </div>
          <div class="card-subtitle">${onlyfansStats.length} registo${onlyfansStats.length !== 1 ? 's' : ''}</div>
        </div>
        <button class="btn btn-sm btn-secondary" onclick="openOnlyfansModal()">
          <i class="fa-solid fa-plus"></i>
        </button>
      </div>
      <div class="kpi-block" style="text-align:center;padding:16px 0">
        <div style="font-size:1.8rem;font-weight:800;color:var(--blue)">€${receitaOnlyfans.toFixed(2)}</div>
        <div class="text-muted text-sm">Receita + Tips + PPV</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${onlyfansStats.length ? onlyfansStats.map(s => {
          const av  = avatares.find(a => String(a.id) === String(s.avatar_id));
          const rec = parseFloat(s.receita||0) + parseFloat(s.tips||0) + parseFloat(s.ppv_receita||0);
          return `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px;background:var(--bg-elevated);border-radius:8px">
              <div>
                <div style="font-size:.85rem;font-weight:600">${av?.nome || 'Avatar'}</div>
                <div style="font-size:.75rem;color:var(--text-muted)">${(s.subscribers||0).toLocaleString()} subs · PPV €${parseFloat(s.ppv_receita||0).toFixed(2)}</div>
              </div>
              <div style="text-align:right">
                <div style="font-weight:700;color:var(--blue)">€${rec.toFixed(2)}</div>
                <button class="btn btn-sm btn-secondary" style="font-size:.7rem;padding:2px 8px;margin-top:4px" onclick="openOnlyfansModal('${s.id}')">
                  <i class="fa-solid fa-pen"></i>
                </button>
              </div>
            </div>`;
        }).join('') : `<div class="text-muted text-sm text-center" style="padding:20px">
          Sem dados. <button class="btn btn-sm btn-ghost" onclick="openOnlyfansModal()">Adicionar</button>
        </div>`}
      </div>
    </div>`;
}

function renderYoutubeCard(canais, receitaYoutube) {
  return `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title" style="display:flex;align-items:center;gap:8px">
            <i class="fa-brands fa-youtube" style="color:var(--red)"></i> YouTube AdSense
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
            Sem canais. <a onclick="app.navigate('youtube')" style="color:var(--accent);cursor:pointer">Adicionar canal</a>
          </div>`}
      </div>
    </div>`;
}

function renderMusicaCard(musicos, receitaMusicos) {
  return `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title" style="display:flex;align-items:center;gap:8px">
            <i class="fa-solid fa-music" style="color:var(--accent)"></i> Streaming Musical
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
            Sem artistas. <a onclick="app.navigate('musicos')" style="color:var(--accent);cursor:pointer">Adicionar</a>
          </div>`}
      </div>
    </div>`;
}

function renderPatreonCard(patreonStat, patreonMes) {
  const patrons = patreonStat?.patrons || 0;
  return `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title" style="display:flex;align-items:center;gap:8px">
            <i class="fa-brands fa-patreon" style="color:#f96854"></i> Patreon
          </div>
          <div class="card-subtitle">${patrons} patron${patrons !== 1 ? 's' : ''}</div>
        </div>
        <button class="btn btn-sm btn-secondary" onclick="openPatreonModal()">
          <i class="fa-solid fa-pen"></i>
        </button>
      </div>
      <div class="kpi-block" style="text-align:center;padding:16px 0">
        <div style="font-size:1.8rem;font-weight:800;color:#f96854">€${patreonMes.toFixed(2)}</div>
        <div class="text-muted text-sm">Pledges este mês</div>
      </div>
      ${patreonStat ? `
        <div style="display:flex;flex-direction:column;gap:6px">
          ${[
            { label: 'Tier 1', val: patreonStat.tier1_patrons || 0, color: '#f96854' },
            { label: 'Tier 2', val: patreonStat.tier2_patrons || 0, color: '#e74c3c' },
            { label: 'Tier 3', val: patreonStat.tier3_patrons || 0, color: '#c0392b' },
          ].map(t => `
            <div style="display:flex;justify-content:space-between;padding:6px 8px;background:var(--bg-elevated);border-radius:6px">
              <span class="text-sm">${t.label}</span>
              <span class="text-sm;font-weight:600" style="color:${t.color}">${t.val} patron${t.val !== 1 ? 's' : ''}</span>
            </div>`).join('')}
        </div>` : `<div class="text-muted text-sm text-center" style="padding:16px">
          Sem dados. <button class="btn btn-sm btn-ghost" onclick="openPatreonModal()">Registar</button>
        </div>`}
    </div>`;
}

function renderTwitchCard(twitchStat, twitchMes) {
  const subs = twitchStat?.subscribers || 0;
  return `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title" style="display:flex;align-items:center;gap:8px">
            <i class="fa-brands fa-twitch" style="color:#9146ff"></i> Twitch
          </div>
          <div class="card-subtitle">${subs} subscritores</div>
        </div>
        <button class="btn btn-sm btn-secondary" onclick="openTwitchModal()">
          <i class="fa-solid fa-pen"></i>
        </button>
      </div>
      <div class="kpi-block" style="text-align:center;padding:16px 0">
        <div style="font-size:1.8rem;font-weight:800;color:#9146ff">€${twitchMes.toFixed(2)}</div>
        <div class="text-muted text-sm">Bits + Doações + Ads</div>
      </div>
      ${twitchStat ? `
        <div style="display:flex;flex-direction:column;gap:6px">
          ${[
            { label: 'Bits',    val: parseFloat(twitchStat.bits_receita||0), icon: 'fa-gem' },
            { label: 'Doações', val: parseFloat(twitchStat.donations_receita||0), icon: 'fa-gift' },
            { label: 'Ads',     val: parseFloat(twitchStat.ad_receita||0), icon: 'fa-rectangle-ad' },
          ].map(r => `
            <div style="display:flex;justify-content:space-between;padding:6px 8px;background:var(--bg-elevated);border-radius:6px">
              <span class="text-sm"><i class="fa-solid ${r.icon}" style="color:#9146ff;margin-right:6px"></i>${r.label}</span>
              <span class="text-sm" style="font-weight:600;color:#9146ff">€${r.val.toFixed(2)}</span>
            </div>`).join('')}
          ${twitchStat.viewers_medio ? `
            <div style="font-size:.75rem;color:var(--text-muted);text-align:center;margin-top:4px">
              ${twitchStat.viewers_medio} viewers médios · ${twitchStat.horas_stream || 0}h stream
            </div>` : ''}
        </div>` : `<div class="text-muted text-sm text-center" style="padding:16px">
          Sem dados. <button class="btn btn-sm btn-ghost" onclick="openTwitchModal()">Registar</button>
        </div>`}
    </div>`;
}

function renderAfiliadosCard(afiliados, receitaAfiliados) {
  const ativos = afiliados.filter(a => a.ativo);
  return `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title" style="display:flex;align-items:center;gap:8px">
            <i class="fa-solid fa-link" style="color:var(--yellow)"></i> Afiliados
          </div>
          <div class="card-subtitle">${ativos.length} programa${ativos.length !== 1 ? 's' : ''} ativos</div>
        </div>
        <button class="btn btn-sm btn-secondary" onclick="openAfiliadoModal()">
          <i class="fa-solid fa-plus"></i> Novo
        </button>
      </div>
      <div class="kpi-block" style="text-align:center;padding:16px 0">
        <div style="font-size:1.8rem;font-weight:800;color:var(--yellow)">€${receitaAfiliados.toFixed(2)}</div>
        <div class="text-muted text-sm">Comissões acumuladas</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px" id="afiliados-list">
        ${afiliados.length ? afiliados.map(a => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px;background:var(--bg-elevated);border-radius:8px">
            <div style="flex:1;min-width:0">
              <div style="font-size:.85rem;font-weight:600;display:flex;align-items:center;gap:6px">
                ${a.nome}
                <span class="badge" style="background:${a.ativo ? 'var(--green)' : 'var(--text-muted)'}20;color:${a.ativo ? 'var(--green)' : 'var(--text-muted)'}">
                  ${a.ativo ? 'ativo' : 'inativo'}
                </span>
              </div>
              <div style="font-size:.75rem;color:var(--text-muted)">${a.plataforma} · ${a.comissao_pct}% · ${(a.cliques||0).toLocaleString()} cliques</div>
            </div>
            <div style="text-align:right;flex-shrink:0;margin-left:8px">
              <div style="font-weight:700;color:var(--yellow)">€${parseFloat(a.receita||0).toFixed(2)}</div>
              <div style="display:flex;gap:4px;margin-top:4px">
                <button class="btn btn-sm btn-secondary btn-icon" onclick="openAfiliadoModal('${a.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm btn-danger btn-icon" onclick="deleteAfiliado('${a.id}')" title="Apagar"><i class="fa-solid fa-trash"></i></button>
              </div>
            </div>
          </div>`).join('') : `<div class="text-muted text-sm text-center" style="padding:20px">
          Sem programas de afiliados.
        </div>`}
      </div>
    </div>`;
}

function renderVendasCard(vendasDiretas, receitaVendas, mesAtualStr) {
  const vendasMes = vendasDiretas.filter(v => (v.data||'').startsWith(mesAtualStr));
  return `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title" style="display:flex;align-items:center;gap:8px">
            <i class="fa-solid fa-store" style="color:var(--green)"></i> Vendas Diretas
          </div>
          <div class="card-subtitle">${vendasMes.length} venda${vendasMes.length !== 1 ? 's' : ''} este mês</div>
        </div>
        <button class="btn btn-sm btn-secondary" onclick="openVendaModal()">
          <i class="fa-solid fa-plus"></i> Nova
        </button>
      </div>
      <div class="kpi-block" style="text-align:center;padding:16px 0">
        <div style="font-size:1.8rem;font-weight:800;color:var(--green)">€${receitaVendas.toFixed(2)}</div>
        <div class="text-muted text-sm">Receita este mês</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px" id="vendas-list">
        ${vendasDiretas.slice(0,6).map(v => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px;background:var(--bg-elevated);border-radius:8px">
            <div style="flex:1;min-width:0">
              <div style="font-size:.85rem;font-weight:600">${v.produto}</div>
              <div style="font-size:.75rem;color:var(--text-muted)">${v.plataforma} · ${v.tipo} · ${v.quantidade}x €${parseFloat(v.preco_unitario||0).toFixed(2)}</div>
            </div>
            <div style="text-align:right;flex-shrink:0;margin-left:8px">
              <div style="font-weight:700;color:var(--green)">€${parseFloat(v.receita_total||0).toFixed(2)}</div>
              <div style="display:flex;gap:4px;margin-top:4px">
                <button class="btn btn-sm btn-danger btn-icon" onclick="deleteVendaDireta('${v.id}')" title="Apagar"><i class="fa-solid fa-trash"></i></button>
              </div>
            </div>
          </div>`).join('')}
        ${vendasDiretas.length === 0 ? `<div class="text-muted text-sm text-center" style="padding:20px">Sem vendas registadas.</div>` : ''}
        ${vendasDiretas.length > 6 ? `<div class="text-sm text-muted text-center">+${vendasDiretas.length - 6} vendas anteriores</div>` : ''}
      </div>
    </div>`;
}

/* ── Distribuição de receita ───────────────────────────── */

function renderRevenueDistribution(fansly, onlyfans, youtube, musicos, patreon, twitch, afiliados, vendas, total) {
  if (total === 0) {
    return '<div class="text-muted text-sm text-center" style="padding:20px">Sem receitas registadas este mês</div>';
  }
  const items = [
    { label: 'Fansly',          value: fansly,    color: 'var(--pink)' },
    { label: 'OnlyFans',        value: onlyfans,  color: 'var(--blue)' },
    { label: 'YouTube AdSense', value: youtube,   color: 'var(--red)' },
    { label: 'Streaming Música',value: musicos,   color: 'var(--accent)' },
    { label: 'Patreon',         value: patreon,   color: '#f96854' },
    { label: 'Twitch',          value: twitch,    color: '#9146ff' },
    { label: 'Afiliados',       value: afiliados, color: 'var(--yellow)' },
    { label: 'Vendas Diretas',  value: vendas,    color: 'var(--green)' },
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

/* ── Metas de receita ──────────────────────────────────── */

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
          <span class="text-sm" style="font-weight:700;color:${color}">${pct}%</span>
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
  const atual  = localStorage.getItem('as_meta_receita') || '';
  const body   = `
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
  const card = document.getElementById('meta-receita-card');
  if (card) {
    const receitaEl = document.querySelector('[style*="font-size:2.5rem"][style*="color:var(--green)"]');
    const totalStr  = receitaEl?.textContent?.replace('€','').trim() || '0';
    card.innerHTML  = renderMetaReceita(parseFloat(totalStr));
  }
}

/* ── OnlyFans Modal ────────────────────────────────────── */

let _onlyfansCache = [];

async function openOnlyfansModal(id) {
  let avatares = app.getAvatares ? app.getAvatares() : [];
  if (!avatares.length && DB.ready()) {
    const r = await DB.getAvatares();
    avatares = r.data || [];
  }
  const existing = _onlyfansCache.find(s => String(s.id) === String(id)) || null;
  const mesAtual = new Date().toISOString().slice(0,7) + '-01';

  const body = `
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Avatar</label>
        <select id="of-avatar" class="form-control">
          <option value="">Selecionar avatar…</option>
          ${avatares.map(a => `<option value="${a.id}" ${existing?.avatar_id === a.id ? 'selected' : ''}>${a.nome}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Mês</label>
        <input id="of-mes" class="form-control" type="month" value="${(existing?.mes||mesAtual).slice(0,7)}">
      </div>
      <div class="form-group">
        <label class="form-label">Subscritores</label>
        <input id="of-subs" class="form-control" type="number" min="0" value="${existing?.subscribers||0}">
      </div>
      <div class="form-group">
        <label class="form-label">Receita subscrições (€)</label>
        <input id="of-receita" class="form-control" type="number" min="0" step="0.01" value="${existing?.receita||0}">
      </div>
      <div class="form-group">
        <label class="form-label">Tips (€)</label>
        <input id="of-tips" class="form-control" type="number" min="0" step="0.01" value="${existing?.tips||0}">
      </div>
      <div class="form-group mb-0">
        <label class="form-label">PPV — Pay Per View (€)</label>
        <input id="of-ppv" class="form-control" type="number" min="0" step="0.01" value="${existing?.ppv_receita||0}">
      </div>
    </div>`;
  const footer = `
    <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveOnlyfansStats('${id||''}')"><i class="fa-solid fa-floppy-disk"></i> Guardar</button>`;
  app.openModal('OnlyFans — Estatísticas mensais', body, footer);
}

async function saveOnlyfansStats(id) {
  const avatar_id    = document.getElementById('of-avatar')?.value;
  const mesVal       = document.getElementById('of-mes')?.value;
  const subscribers  = parseInt(document.getElementById('of-subs')?.value || '0');
  const receita      = parseFloat(document.getElementById('of-receita')?.value || '0');
  const tips         = parseFloat(document.getElementById('of-tips')?.value || '0');
  const ppv_receita  = parseFloat(document.getElementById('of-ppv')?.value || '0');

  if (!avatar_id) { app.toast('Seleciona um avatar', 'warning'); return; }
  if (!mesVal)    { app.toast('Define o mês', 'warning'); return; }

  const mes  = mesVal + '-01';
  const stat = { avatar_id, mes, subscribers, receita, tips, ppv_receita };
  if (id) stat.id = id;

  if (DB.ready()) {
    const { data: saved, error } = await DB.upsertOnlyfansStats(stat);
    if (error) { app.toast('Erro: ' + error, 'error'); return; }
  }
  app.toast('OnlyFans guardado!', 'success');
  app.closeModal();
  app.navigate('monetizacao');
}

/* ── Patreon Modal ─────────────────────────────────────── */

async function openPatreonModal() {
  const mesAtual = new Date().toISOString().slice(0,7) + '-01';
  let existing = null;
  if (DB.ready()) {
    const r = await DB.getPatreonStats(mesAtual);
    existing = r.data?.[0] || null;
  }

  const body = `
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Mês</label>
        <input id="pat-mes" class="form-control" type="month" value="${(existing?.mes||mesAtual).slice(0,7)}">
      </div>
      <div class="form-group">
        <label class="form-label">Total de patrons</label>
        <input id="pat-patrons" class="form-control" type="number" min="0" value="${existing?.patrons||0}">
      </div>
      <div class="form-group">
        <label class="form-label">Receita total (€)</label>
        <input id="pat-receita" class="form-control" type="number" min="0" step="0.01" value="${existing?.receita||0}">
      </div>
      <div class="form-group">
        <label class="form-label">Tier 1</label>
        <input id="pat-t1" class="form-control" type="number" min="0" value="${existing?.tier1_patrons||0}">
      </div>
      <div class="form-group">
        <label class="form-label">Tier 2</label>
        <input id="pat-t2" class="form-control" type="number" min="0" value="${existing?.tier2_patrons||0}">
      </div>
      <div class="form-group mb-0">
        <label class="form-label">Tier 3</label>
        <input id="pat-t3" class="form-control" type="number" min="0" value="${existing?.tier3_patrons||0}">
      </div>
    </div>`;
  const footer = `
    <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="savePatreonStats('${existing?.id||''}')"><i class="fa-solid fa-floppy-disk"></i> Guardar</button>`;
  app.openModal('Patreon — Estatísticas mensais', body, footer);
}

async function savePatreonStats(id) {
  const mesVal          = document.getElementById('pat-mes')?.value;
  const patrons         = parseInt(document.getElementById('pat-patrons')?.value || '0');
  const receita         = parseFloat(document.getElementById('pat-receita')?.value || '0');
  const tier1_patrons   = parseInt(document.getElementById('pat-t1')?.value || '0');
  const tier2_patrons   = parseInt(document.getElementById('pat-t2')?.value || '0');
  const tier3_patrons   = parseInt(document.getElementById('pat-t3')?.value || '0');

  if (!mesVal) { app.toast('Define o mês', 'warning'); return; }
  const mes  = mesVal + '-01';
  const stat = { mes, patrons, receita, tier1_patrons, tier2_patrons, tier3_patrons };
  if (id) stat.id = id;

  if (DB.ready()) {
    const { error } = await DB.upsertPatreonStats(stat);
    if (error) { app.toast('Erro: ' + error, 'error'); return; }
  }
  app.toast('Patreon guardado!', 'success');
  app.closeModal();
  app.navigate('monetizacao');
}

/* ── Twitch Modal ──────────────────────────────────────── */

async function openTwitchModal() {
  const mesAtual = new Date().toISOString().slice(0,7) + '-01';
  let existing = null;
  if (DB.ready()) {
    const r = await DB.getTwitchStats(mesAtual);
    existing = r.data?.[0] || null;
  }

  const body = `
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Mês</label>
        <input id="tw-mes" class="form-control" type="month" value="${(existing?.mes||mesAtual).slice(0,7)}">
      </div>
      <div class="form-group">
        <label class="form-label">Subscritores</label>
        <input id="tw-subs" class="form-control" type="number" min="0" value="${existing?.subscribers||0}">
      </div>
      <div class="form-group">
        <label class="form-label">Receita Bits (€)</label>
        <input id="tw-bits" class="form-control" type="number" min="0" step="0.01" value="${existing?.bits_receita||0}">
      </div>
      <div class="form-group">
        <label class="form-label">Doações (€)</label>
        <input id="tw-donations" class="form-control" type="number" min="0" step="0.01" value="${existing?.donations_receita||0}">
      </div>
      <div class="form-group">
        <label class="form-label">Receita Ads (€)</label>
        <input id="tw-ads" class="form-control" type="number" min="0" step="0.01" value="${existing?.ad_receita||0}">
      </div>
      <div class="form-group">
        <label class="form-label">Viewers médios</label>
        <input id="tw-viewers" class="form-control" type="number" min="0" value="${existing?.viewers_medio||0}">
      </div>
      <div class="form-group mb-0">
        <label class="form-label">Horas de stream</label>
        <input id="tw-horas" class="form-control" type="number" min="0" value="${existing?.horas_stream||0}">
      </div>
    </div>`;
  const footer = `
    <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveTwitchStats('${existing?.id||''}')"><i class="fa-solid fa-floppy-disk"></i> Guardar</button>`;
  app.openModal('Twitch — Estatísticas mensais', body, footer);
}

async function saveTwitchStats(id) {
  const mesVal             = document.getElementById('tw-mes')?.value;
  const subscribers        = parseInt(document.getElementById('tw-subs')?.value || '0');
  const bits_receita       = parseFloat(document.getElementById('tw-bits')?.value || '0');
  const donations_receita  = parseFloat(document.getElementById('tw-donations')?.value || '0');
  const ad_receita         = parseFloat(document.getElementById('tw-ads')?.value || '0');
  const viewers_medio      = parseInt(document.getElementById('tw-viewers')?.value || '0');
  const horas_stream       = parseInt(document.getElementById('tw-horas')?.value || '0');

  if (!mesVal) { app.toast('Define o mês', 'warning'); return; }
  const mes  = mesVal + '-01';
  const stat = { mes, subscribers, bits_receita, donations_receita, ad_receita, viewers_medio, horas_stream };
  if (id) stat.id = id;

  if (DB.ready()) {
    const { error } = await DB.upsertTwitchStats(stat);
    if (error) { app.toast('Erro: ' + error, 'error'); return; }
  }
  app.toast('Twitch guardado!', 'success');
  app.closeModal();
  app.navigate('monetizacao');
}

/* ── Afiliados Modal ───────────────────────────────────── */

let _afiliadosCache = [];

async function openAfiliadoModal(id) {
  const existing = _afiliadosCache.find(a => String(a.id) === String(id)) || null;
  const body = `
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Nome do programa</label>
        <input id="af-nome" class="form-control" value="${existing?.nome||''}" placeholder="Ex: Amazon Associates">
      </div>
      <div class="form-group">
        <label class="form-label">Plataforma / Rede</label>
        <input id="af-plataforma" class="form-control" value="${existing?.plataforma||''}" placeholder="Ex: Amazon, Impact, ShareASale">
      </div>
      <div class="form-group">
        <label class="form-label">Código de afiliado</label>
        <input id="af-codigo" class="form-control" value="${existing?.codigo||''}" placeholder="Ex: ref=mycode123">
      </div>
      <div class="form-group">
        <label class="form-label">Comissão (%)</label>
        <input id="af-comissao" class="form-control" type="number" min="0" max="100" step="0.01" value="${existing?.comissao_pct||0}">
      </div>
      <div class="form-group">
        <label class="form-label">Cliques</label>
        <input id="af-cliques" class="form-control" type="number" min="0" value="${existing?.cliques||0}">
      </div>
      <div class="form-group">
        <label class="form-label">Conversões</label>
        <input id="af-conversoes" class="form-control" type="number" min="0" value="${existing?.conversoes||0}">
      </div>
      <div class="form-group">
        <label class="form-label">Receita total (€)</label>
        <input id="af-receita" class="form-control" type="number" min="0" step="0.01" value="${existing?.receita||0}">
      </div>
      <div class="form-group mb-0">
        <label class="form-label">Estado</label>
        <select id="af-ativo" class="form-control">
          <option value="true" ${(existing?.ativo !== false) ? 'selected' : ''}>Ativo</option>
          <option value="false" ${(existing?.ativo === false) ? 'selected' : ''}>Inativo</option>
        </select>
      </div>
    </div>`;
  const footer = `
    <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveAfiliado('${id||''}')"><i class="fa-solid fa-floppy-disk"></i> Guardar</button>`;
  app.openModal(existing ? 'Editar afiliado' : 'Novo programa de afiliados', body, footer);
  setTimeout(() => document.getElementById('af-nome')?.focus(), 100);
}

async function saveAfiliado(id) {
  const nome         = document.getElementById('af-nome')?.value.trim();
  const plataforma   = document.getElementById('af-plataforma')?.value.trim();
  const codigo       = document.getElementById('af-codigo')?.value.trim();
  const comissao_pct = parseFloat(document.getElementById('af-comissao')?.value || '0');
  const cliques      = parseInt(document.getElementById('af-cliques')?.value || '0');
  const conversoes   = parseInt(document.getElementById('af-conversoes')?.value || '0');
  const receita      = parseFloat(document.getElementById('af-receita')?.value || '0');
  const ativo        = document.getElementById('af-ativo')?.value === 'true';

  if (!nome)      { app.toast('Nome obrigatório', 'warning'); return; }
  if (!plataforma){ app.toast('Plataforma obrigatória', 'warning'); return; }

  const afiliado = { nome, plataforma, codigo, comissao_pct, cliques, conversoes, receita, ativo };
  if (id) afiliado.id = id;

  if (DB.ready()) {
    const { data: saved, error } = await DB.upsertAfiliado(afiliado);
    if (error) { app.toast('Erro: ' + error, 'error'); return; }
    if (id) {
      _afiliadosCache = _afiliadosCache.map(a => String(a.id) === String(id) ? { ...a, ...afiliado } : a);
    } else {
      _afiliadosCache = [saved || afiliado, ..._afiliadosCache];
    }
  }
  app.toast('Afiliado guardado!', 'success');
  app.closeModal();
  app.navigate('monetizacao');
}

async function deleteAfiliado(id) {
  if (!confirm('Apagar este programa de afiliados?')) return;
  if (DB.ready()) {
    const { error } = await DB.deleteAfiliado(id);
    if (error) { app.toast('Erro: ' + error, 'error'); return; }
  }
  app.toast('Afiliado apagado', 'success');
  app.navigate('monetizacao');
}

/* ── Vendas Diretas Modal ──────────────────────────────── */

async function openVendaModal() {
  const body = `
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Produto / Serviço</label>
        <input id="vd-produto" class="form-control" placeholder="Ex: Preset Pack Lightroom, Ebook…">
      </div>
      <div class="form-group">
        <label class="form-label">Tipo</label>
        <select id="vd-tipo" class="form-control">
          <option value="digital">Digital</option>
          <option value="fisico">Físico</option>
          <option value="servico">Serviço</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Plataforma</label>
        <select id="vd-plataforma" class="form-control">
          <option value="gumroad">Gumroad</option>
          <option value="shopify">Shopify</option>
          <option value="etsy">Etsy</option>
          <option value="proprio">Site próprio</option>
          <option value="outro">Outro</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Quantidade</label>
        <input id="vd-qtd" class="form-control" type="number" min="1" value="1">
      </div>
      <div class="form-group">
        <label class="form-label">Preço unitário (€)</label>
        <input id="vd-preco" class="form-control" type="number" min="0" step="0.01" value="0">
      </div>
      <div class="form-group">
        <label class="form-label">Receita total (€)</label>
        <input id="vd-receita" class="form-control" type="number" min="0" step="0.01" value="0">
      </div>
      <div class="form-group mb-0">
        <label class="form-label">Data</label>
        <input id="vd-data" class="form-control" type="date" value="${new Date().toISOString().slice(0,10)}">
      </div>
    </div>`;
  const footer = `
    <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveVendaDireta()"><i class="fa-solid fa-floppy-disk"></i> Guardar</button>`;
  app.openModal('Nova venda direta', body, footer);
  setTimeout(() => document.getElementById('vd-produto')?.focus(), 100);
}

async function saveVendaDireta() {
  const produto       = document.getElementById('vd-produto')?.value.trim();
  const tipo          = document.getElementById('vd-tipo')?.value;
  const plataforma    = document.getElementById('vd-plataforma')?.value;
  const quantidade    = parseInt(document.getElementById('vd-qtd')?.value || '1');
  const preco_unitario= parseFloat(document.getElementById('vd-preco')?.value || '0');
  const receita_total = parseFloat(document.getElementById('vd-receita')?.value || '0');
  const data          = document.getElementById('vd-data')?.value;

  if (!produto) { app.toast('Nome do produto obrigatório', 'warning'); return; }

  const venda = { produto, tipo, plataforma, quantidade, preco_unitario, receita_total, data };
  if (DB.ready()) {
    const { error } = await DB.upsertVendaDireta(venda);
    if (error) { app.toast('Erro: ' + error, 'error'); return; }
  }
  app.toast('Venda registada!', 'success');
  app.closeModal();
  app.navigate('monetizacao');
}

async function deleteVendaDireta(id) {
  if (!confirm('Apagar esta venda?')) return;
  if (DB.ready()) {
    const { error } = await DB.deleteVendaDireta(id);
    if (error) { app.toast('Erro: ' + error, 'error'); return; }
  }
  app.toast('Venda apagada', 'success');
  app.navigate('monetizacao');
}

/* ── Despesas ──────────────────────────────────────────── */

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

  const lucroEl = document.getElementById('lucro-liquido-val');
  if (lucroEl) {
    const receitaEl = document.querySelector('[style*="font-size:2.5rem"][style*="color:var(--green)"]');
    const receitaStr = receitaEl?.textContent?.replace('€', '').trim() || '0';
    const receita = parseFloat(receitaStr) || 0;
    const lucro   = receita - total;
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
  const descricao = document.getElementById('desp-desc')?.value.trim();
  const valor     = parseFloat(document.getElementById('desp-valor')?.value || '0');
  const categoria = document.getElementById('desp-cat')?.value || 'outro';
  const data      = document.getElementById('desp-data')?.value;

  if (!descricao)            { app.toast('Adiciona uma descrição', 'warning'); return; }
  if (isNaN(valor) || valor <= 0) { app.toast('Valor inválido', 'warning'); return; }

  const despesa = { descricao, valor, categoria, data };
  if (id) despesa.id = id;

  if (DB.ready()) {
    const { data: saved, error } = await DB.upsertDespesa(despesa);
    if (error) { app.toast('Erro ao guardar: ' + app.fmtErr(error), 'error'); return; }
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

/* ── Exportar CSV de receitas ──────────────────────────── */

function exportReceitasCsv() {
  const despesas = _despesasCache || [];
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

/* ── Simulador de receita ── */
function openRevenueSimulator() {
  const body = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group">
        <label class="form-label">Subscritores Fansly</label>
        <input id="sim-fansly-subs" class="form-control" type="number" value="100" min="0" oninput="calcSimulator()">
      </div>
      <div class="form-group">
        <label class="form-label">Preço sub Fansly (€)</label>
        <input id="sim-fansly-price" class="form-control" type="number" value="9.99" min="0" step="0.01" oninput="calcSimulator()">
      </div>
      <div class="form-group">
        <label class="form-label">Subscritores OnlyFans</label>
        <input id="sim-of-subs" class="form-control" type="number" value="50" min="0" oninput="calcSimulator()">
      </div>
      <div class="form-group">
        <label class="form-label">Preço sub OnlyFans (€)</label>
        <input id="sim-of-price" class="form-control" type="number" value="14.99" min="0" step="0.01" oninput="calcSimulator()">
      </div>
      <div class="form-group">
        <label class="form-label">Views YouTube/mês</label>
        <input id="sim-yt-views" class="form-control" type="number" value="10000" min="0" oninput="calcSimulator()">
      </div>
      <div class="form-group">
        <label class="form-label">RPM YouTube (€)</label>
        <input id="sim-yt-rpm" class="form-control" type="number" value="2.5" min="0" step="0.1" oninput="calcSimulator()">
      </div>
      <div class="form-group">
        <label class="form-label">Streams música/mês</label>
        <input id="sim-streams" class="form-control" type="number" value="5000" min="0" oninput="calcSimulator()">
      </div>
      <div class="form-group">
        <label class="form-label">Taxa plataforma (%)</label>
        <input id="sim-platform-fee" class="form-control" type="number" value="20" min="0" max="100" oninput="calcSimulator()">
      </div>
    </div>
    <div id="sim-results" style="margin-top:16px;padding:16px;background:var(--bg-elevated);border-radius:8px">
      <div style="font-size:1.1rem;font-weight:600;margin-bottom:8px">Resultado estimado</div>
      <div id="sim-output"></div>
    </div>`;
  app.openModal('Simulador de receita', body, `<button class="btn btn-primary" onclick="app.closeModal()">Fechar</button>`);
  setTimeout(calcSimulator, 100);
}

function calcSimulator() {
  const fanlySubs   = parseFloat(document.getElementById('sim-fansly-subs')?.value || 0);
  const fanlyPrice  = parseFloat(document.getElementById('sim-fansly-price')?.value || 0);
  const ofSubs      = parseFloat(document.getElementById('sim-of-subs')?.value || 0);
  const ofPrice     = parseFloat(document.getElementById('sim-of-price')?.value || 0);
  const ytViews     = parseFloat(document.getElementById('sim-yt-views')?.value || 0);
  const ytRpm       = parseFloat(document.getElementById('sim-yt-rpm')?.value || 0);
  const streams     = parseFloat(document.getElementById('sim-streams')?.value || 0);
  const fee         = parseFloat(document.getElementById('sim-platform-fee')?.value || 20) / 100;
  const feeMulti    = 1 - fee;

  const fanslyRec   = fanlySubs * fanlyPrice * feeMulti;
  const ofRec       = ofSubs * ofPrice * feeMulti;
  const ytRec       = (ytViews / 1000) * ytRpm;
  const musicRec    = streams * 0.004;
  const total       = fanslyRec + ofRec + ytRec + musicRec;

  const el = document.getElementById('sim-output');
  if (!el) return;
  el.innerHTML = [
    { label: 'Fansly', val: fanslyRec, color: 'var(--pink)' },
    { label: 'OnlyFans', val: ofRec, color: 'var(--blue)' },
    { label: 'YouTube', val: ytRec, color: 'var(--red)' },
    { label: 'Música', val: musicRec, color: 'var(--accent)' },
  ].map(r => `
    <div class="metric-row"><span class="metric-label">${r.label}</span><span class="metric-value" style="color:${r.color}">€${r.val.toFixed(2)}</span></div>
  `).join('') + `<div class="metric-row" style="margin-top:8px;border-top:1px solid var(--border);padding-top:8px">
    <span class="metric-label" style="font-weight:700">TOTAL</span>
    <span class="metric-value" style="color:var(--green);font-size:1.2rem;font-weight:800">€${total.toFixed(2)}/mês</span>
  </div>
  <div class="text-muted text-sm" style="margin-top:8px">Anual: <strong style="color:var(--green)">€${(total*12).toFixed(0)}</strong></div>`;
}

/* ── Relatório Fiscal ── */
function exportFiscalReport() {
  const despesas = typeof _despesasCache !== 'undefined' ? _despesasCache : [];
  const year = new Date().getFullYear();
  const lines = [
    `RELATÓRIO FISCAL ${year}`,
    `Gerado em: ${new Date().toLocaleString('pt-PT')}`,
    '',
    '=== DESPESAS ===',
    'Data,Descrição,Categoria,Valor (€)',
    ...despesas.map(d => `${d.data || ''},${d.descricao || ''},"${d.categoria || ''}","-${parseFloat(d.valor||0).toFixed(2)}"`),
    '',
    `TOTAL DESPESAS:,,,"-€${despesas.reduce((s,d) => s + parseFloat(d.valor||0), 0).toFixed(2)}"`,
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `relatorio_fiscal_${year}.csv`;
  link.click();
  app.toast('Relatório fiscal exportado!', 'success');
}

/* ── Tabela de preços de parceria ── */
let _partnershipPrices = [];

async function loadPartnershipPrices() {
  const el = document.getElementById('partnership-prices-list');
  if (!el) return;
  if (DB.ready()) {
    const { data } = await DB.getPartnershipPrices();
    _partnershipPrices = data || [];
  }
  renderPartnershipPrices();
}

function renderPartnershipPrices() {
  const el = document.getElementById('partnership-prices-list');
  if (!el) return;
  if (!_partnershipPrices.length) {
    el.innerHTML = '<div class="text-muted text-sm text-center" style="padding:16px">Sem preços configurados. Adiciona os teus preços de parceria.</div>';
    return;
  }
  el.innerHTML = `<table style="width:100%;border-collapse:collapse">
    <thead><tr style="border-bottom:1px solid var(--border)">
      <th style="text-align:left;padding:8px;font-size:.8rem;color:var(--text-muted)">Tipo</th>
      <th style="text-align:left;padding:8px;font-size:.8rem;color:var(--text-muted)">Descrição</th>
      <th style="text-align:right;padding:8px;font-size:.8rem;color:var(--text-muted)">Preço (€)</th>
      <th style="padding:8px"></th>
    </tr></thead>
    <tbody>${_partnershipPrices.map(p => `
      <tr style="border-bottom:1px solid var(--border)">
        <td style="padding:8px;font-size:.85rem">${p.tipo || '—'}</td>
        <td style="padding:8px;font-size:.85rem;color:var(--text-secondary)">${p.descricao || '—'}</td>
        <td style="padding:8px;font-size:.85rem;text-align:right;color:var(--green);font-weight:700">€${parseFloat(p.preco||0).toFixed(2)}</td>
        <td style="padding:8px;text-align:right">
          <button class="btn btn-sm btn-danger btn-icon" onclick="deletePartnershipPrice('${p.id}')"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`).join('')}
    </tbody></table>`;
}

function openPartnershipPriceForm() {
  const body = `
    <div class="form-group">
      <label class="form-label">Tipo</label>
      <select id="pp-tipo" class="form-control">
        ${['Post Instagram','Story Instagram','Reel','TikTok','YouTube Video','YouTube Shorts','Menção Stories','Pack Mensal'].map(t => `<option>${t}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Descrição (opcional)</label>
      <input id="pp-desc" class="form-control" placeholder="Detalhes adicionais…">
    </div>
    <div class="form-group mb-0">
      <label class="form-label">Preço (€)</label>
      <input id="pp-preco" class="form-control" type="number" min="0" step="0.01" placeholder="0.00">
    </div>`;
  const footer = `
    <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="savePartnershipPrice()"><i class="fa-solid fa-floppy-disk"></i> Guardar</button>`;
  app.openModal('Adicionar preço de parceria', body, footer);
}

async function savePartnershipPrice() {
  const tipo    = document.getElementById('pp-tipo')?.value;
  const desc    = document.getElementById('pp-desc')?.value.trim();
  const preco   = parseFloat(document.getElementById('pp-preco')?.value || '0');
  if (isNaN(preco) || preco <= 0) { app.toast('Preço inválido', 'warning'); return; }
  const price   = { tipo, descricao: desc, preco };
  if (DB.ready()) {
    const { data, error } = await DB.upsertPartnershipPrice(price);
    if (error) { app.toast('Erro: ' + app.fmtErr(error), 'error'); return; }
    if (data?.[0]) _partnershipPrices = [..._partnershipPrices, data[0]];
  } else {
    _partnershipPrices = [..._partnershipPrices, { id: Date.now(), ...price }];
  }
  app.toast('Preço guardado!', 'success');
  app.closeModal();
  renderPartnershipPrices();
}

async function deletePartnershipPrice(id) {
  if (!confirm('Apagar este preço?')) return;
  if (DB.ready()) {
    const { error } = await DB.deletePartnershipPrice(id);
    if (error) { app.toast('Erro: ' + app.fmtErr(error), 'error'); return; }
  }
  _partnershipPrices = _partnershipPrices.filter(p => String(p.id) !== String(id));
  renderPartnershipPrices();
  app.toast('Preço removido', 'success');
}

/* ── Affiliate Links ── */
let _affiliateLinks = [];

async function loadAffiliateLinks() {
  const el = document.getElementById('affiliate-links-list');
  if (!el) return;
  if (DB.ready()) {
    const { data } = await DB.getAffiliateLinks();
    _affiliateLinks = data || [];
  }
  renderAffiliateLinks();
}

function renderAffiliateLinks() {
  const el = document.getElementById('affiliate-links-list');
  if (!el) return;
  if (!_affiliateLinks.length) {
    el.innerHTML = '<div class="text-muted text-sm text-center" style="padding:16px">Sem links de afiliados. Adiciona os teus links para rastrear cliques.</div>';
    return;
  }
  el.innerHTML = `<table style="width:100%;border-collapse:collapse">
    <thead><tr style="border-bottom:1px solid var(--border)">
      <th style="text-align:left;padding:8px;font-size:.8rem;color:var(--text-muted)">Nome</th>
      <th style="text-align:left;padding:8px;font-size:.8rem;color:var(--text-muted)">URL</th>
      <th style="text-align:right;padding:8px;font-size:.8rem;color:var(--text-muted)">Cliques</th>
      <th style="text-align:right;padding:8px;font-size:.8rem;color:var(--text-muted)">Receita</th>
      <th style="padding:8px"></th>
    </tr></thead>
    <tbody>${_affiliateLinks.map(l => `
      <tr style="border-bottom:1px solid var(--border)">
        <td style="padding:8px;font-size:.85rem;font-weight:600">${l.nome || '—'}</td>
        <td style="padding:8px;font-size:.75rem;color:var(--text-muted);max-width:160px;overflow:hidden;text-overflow:ellipsis">
          <a href="${l.url || '#'}" target="_blank" style="color:var(--accent)">${l.url || '—'}</a>
        </td>
        <td style="padding:8px;text-align:right;font-size:.85rem">${l.cliques || 0}</td>
        <td style="padding:8px;text-align:right;font-size:.85rem;color:var(--green);font-weight:700">€${parseFloat(l.receita||0).toFixed(2)}</td>
        <td style="padding:8px;text-align:right;display:flex;gap:4px;justify-content:flex-end">
          <button class="btn btn-sm btn-secondary btn-icon" onclick="copyAffiliateLink('${l.url||''}','${l.id}')" title="Copiar e registar clique"><i class="fa-solid fa-copy"></i></button>
          <button class="btn btn-sm btn-danger btn-icon" onclick="deleteAffiliateLink('${l.id}')"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`).join('')}
    </tbody></table>`;
}

function openAffiliateLinkForm() {
  const body = `
    <div class="form-group">
      <label class="form-label">Nome / Programa</label>
      <input id="aff-nome" class="form-control" placeholder="Ex: Amazon Associates">
    </div>
    <div class="form-group">
      <label class="form-label">URL de afiliado</label>
      <input id="aff-url" class="form-control" type="url" placeholder="https://…">
    </div>
    <div class="form-group mb-0">
      <label class="form-label">Receita inicial (€)</label>
      <input id="aff-receita" class="form-control" type="number" min="0" step="0.01" value="0">
    </div>`;
  const footer = `
    <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveAffiliateLink()"><i class="fa-solid fa-floppy-disk"></i> Guardar</button>`;
  app.openModal('Adicionar link de afiliado', body, footer);
}

async function saveAffiliateLink() {
  const nome    = document.getElementById('aff-nome')?.value.trim();
  const url     = document.getElementById('aff-url')?.value.trim();
  const receita = parseFloat(document.getElementById('aff-receita')?.value || '0');
  if (!nome || !url) { app.toast('Nome e URL são obrigatórios', 'warning'); return; }
  const link = { nome, url, receita, cliques: 0 };
  if (DB.ready()) {
    const { data, error } = await DB.upsertAffiliateLink(link);
    if (error) { app.toast('Erro: ' + app.fmtErr(error), 'error'); return; }
    if (data?.[0]) _affiliateLinks = [..._affiliateLinks, data[0]];
  } else {
    _affiliateLinks = [..._affiliateLinks, { id: Date.now(), ...link }];
  }
  app.toast('Link guardado!', 'success');
  app.closeModal();
  renderAffiliateLinks();
}

async function copyAffiliateLink(url, id) {
  if (!url) return;
  try { await navigator.clipboard.writeText(url); } catch {}
  if (DB.ready() && id) await DB.incrementAffiliateLinkClicks(id);
  const link = _affiliateLinks.find(l => String(l.id) === String(id));
  if (link) link.cliques = (link.cliques || 0) + 1;
  renderAffiliateLinks();
  app.toast('Link copiado! Clique registado.', 'success');
}

async function deleteAffiliateLink(id) {
  if (!confirm('Apagar este link?')) return;
  if (DB.ready()) {
    const { error } = await DB.deleteAffiliateLink(id);
    if (error) { app.toast('Erro: ' + app.fmtErr(error), 'error'); return; }
  }
  _affiliateLinks = _affiliateLinks.filter(l => String(l.id) !== String(id));
  renderAffiliateLinks();
  app.toast('Link removido', 'success');
}
