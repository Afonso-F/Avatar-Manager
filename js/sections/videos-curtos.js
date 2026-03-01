/* ============================================================
   sections/videos-curtos.js — Criação de vídeos curtos com IA
   Reels, TikToks e YouTube Shorts
   ============================================================ */

/* ── Modelos disponíveis ── */
const VC_MODELS = [
  { id: 'fal-ai/wan/v2.1/t2v-480p',                           label: 'Wan 2.1 — 480p (rápido)'         },
  { id: 'fal-ai/wan/v2.1/t2v-720p',                           label: 'Wan 2.1 — 720p (qualidade)'      },
  { id: 'fal-ai/kling-video/v1.6/standard/text-to-video',     label: 'Kling 1.6 Standard (realista)'   },
  { id: 'fal-ai/kling-video/v1.6/pro/text-to-video',          label: 'Kling 1.6 Pro (melhor qualidade)'},
  { id: 'fal-ai/ltx-video',                                   label: 'LTX Video (criativo)'             },
];

/* ── Estado global da secção ── */
let _vcState = {
  ideas:           [],    // ideias geradas
  selectedIdea:    null,  // { titulo, hook, descricao }
  script:          null,  // { gancho, desenvolvimento, cta }
  videoUrl:        null,
  videoIsExternal: false,
};

/* ═══════════════════════════════════════════════════════════
   RENDER PRINCIPAL
═══════════════════════════════════════════════════════════ */
async function renderVideosCurtos(container) {
  let avatares = app.getAvatares();
  if (!avatares.length && DB.ready()) {
    const { data } = await DB.getAvatares();
    avatares = data || [];
    app.setAvatares(avatares);
  }
  if (!avatares.length) {
    avatares = [{ id: 'local', nome: 'Avatar genérico', nicho: 'Geral', emoji: '🎭' }];
  }

  const hasFalAi  = !!Config.get('FAL_AI');
  const activeAv  = app.getActiveAvatar() || avatares[0];
  _vcState        = { ideas: [], selectedIdea: null, script: null, videoUrl: null, videoIsExternal: false };

  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Vídeos Curtos</div>
        <div class="section-subtitle">Cria Reels, TikToks e YouTube Shorts com IA — do conceito ao agendamento</div>
      </div>
      ${!hasFalAi ? `<div class="badge" style="background:var(--yellow);color:#000;padding:6px 12px;border-radius:var(--radius-sm)"><i class="fa-solid fa-triangle-exclamation"></i> Configura a chave fal.ai em Configurações para gerar vídeos</div>` : ''}
    </div>

    <div class="two-col-layout" style="gap:20px">

      <!-- ─── COLUNA ESQUERDA: Gerador de ideias + lista ─── -->
      <div style="display:flex;flex-direction:column;gap:16px">

        <!-- Avatar -->
        <div class="card">
          <div class="card-title mb-2">Avatar</div>
          <div class="flex gap-1 flex-wrap" id="vc-avatar-list">
            ${avatares.map(a => `
              <div class="platform-toggle${String(a.id) === String(activeAv?.id) ? ' active instagram' : ''}"
                   id="vc-av-${a.id}" data-avid="${a.id}" onclick="vcSelectAvatar('${a.id}')">
                ${a.emoji || '🎭'} ${a.nome}
              </div>`).join('')}
          </div>
        </div>

        <!-- Gerador de ideias -->
        <div class="card" style="border-left:3px solid var(--accent)">
          <div class="card-title mb-2" style="display:flex;align-items:center;gap:8px">
            <i class="fa-solid fa-lightbulb" style="color:var(--accent)"></i>
            Gerar Ideias de Vídeos
          </div>
          <div class="form-group mb-2">
            <label class="form-label">Tema ou nicho</label>
            <input id="vc-topic" class="form-control"
              placeholder="Ex: yoga para iniciantes, finanças pessoais, receitas rápidas…"
              value="${escHtml(activeAv?.nicho || '')}">
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <select id="vc-idea-count" class="form-control" style="max-width:100px">
              <option value="3">3 ideias</option>
              <option value="5" selected>5 ideias</option>
              <option value="7">7 ideias</option>
            </select>
            <button class="btn btn-primary flex-1" id="vc-gen-ideas-btn" onclick="vcGenerateIdeas()">
              <i class="fa-solid fa-wand-magic-sparkles"></i> Gerar Ideias
            </button>
          </div>
          <div id="vc-ideas-status" class="text-sm text-muted mt-2" style="min-height:16px"></div>
        </div>

        <!-- Lista de ideias -->
        <div id="vc-ideas-list" style="display:flex;flex-direction:column;gap:8px">
          <div class="card" style="opacity:.5;border:1px dashed var(--border)">
            <div class="text-sm text-muted" style="text-align:center;padding:8px">
              <i class="fa-solid fa-lightbulb" style="font-size:1.4rem;margin-bottom:6px;display:block;opacity:.5"></i>
              As ideias geradas aparecem aqui
            </div>
          </div>
        </div>

        <!-- Fila de vídeos recentes -->
        <div class="card">
          <div class="card-header" style="cursor:pointer" onclick="vcToggleQueue()">
            <div class="card-title" style="display:flex;align-items:center;gap:8px">
              <i class="fa-solid fa-calendar-days" style="color:var(--accent)"></i>
              Vídeos Agendados
            </div>
            <i class="fa-solid fa-chevron-down text-muted" id="vc-queue-chevron"></i>
          </div>
          <div id="vc-queue-body" style="display:none;padding-top:12px">
            <div class="spinner" style="margin:12px auto"></div>
          </div>
        </div>

      </div>

      <!-- ─── COLUNA DIREITA: Painel de criação ─── -->
      <div id="vc-creation-panel" style="display:flex;flex-direction:column;gap:16px">

        <!-- Estado vazio -->
        <div class="card" id="vc-empty-panel">
          <div style="text-align:center;padding:40px 20px;color:var(--text-muted)">
            <i class="fa-solid fa-film" style="font-size:3rem;margin-bottom:12px;opacity:.3;display:block"></i>
            <div style="font-size:1rem;font-weight:600;margin-bottom:6px">Nenhuma ideia seleccionada</div>
            <div class="text-sm">Gera ideias à esquerda e clica em "Criar" para começar</div>
          </div>
        </div>

      </div>

    </div>`;
}

/* ═══════════════════════════════════════════════════════════
   AVATAR
═══════════════════════════════════════════════════════════ */
function vcSelectAvatar(id) {
  document.querySelectorAll('[id^="vc-av-"]').forEach(el =>
    el.classList.remove('active', 'instagram')
  );
  const el = document.getElementById(`vc-av-${id}`);
  if (el) el.classList.add('active', 'instagram');
  Config.set('ACTIVE_AVATAR', id);
  // Reset criação se estiver em curso
  _vcState.selectedIdea = null;
  _renderCreationPanel();
}

/* ═══════════════════════════════════════════════════════════
   GERADOR DE IDEIAS
═══════════════════════════════════════════════════════════ */
async function vcGenerateIdeas() {
  const topic  = document.getElementById('vc-topic')?.value.trim();
  const count  = parseInt(document.getElementById('vc-idea-count')?.value || '5', 10);
  const avatar = app.getActiveAvatar();
  const status = document.getElementById('vc-ideas-status');
  const btn    = document.getElementById('vc-gen-ideas-btn');

  if (!topic)  { app.toast('Escreve um tema ou nicho', 'warning'); return; }
  if (!avatar) { app.toast('Seleciona um avatar', 'warning'); return; }

  btn.disabled  = true;
  btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:6px"></div> A gerar…';
  if (status) status.textContent = 'A consultar IA…';

  try {
    const ideas = await AI.generateVideoIdeas(avatar, topic, count);
    _vcState.ideas = ideas;
    _renderIdeasList(ideas);
    if (status) status.textContent = `${ideas.length} ideia(s) gerada(s)! Clica em "Criar" para desenvolver.`;
  } catch (e) {
    app.toast('Erro ao gerar ideias: ' + e.message, 'error');
    if (status) status.textContent = 'Erro: ' + e.message;
  } finally {
    btn.disabled  = false;
    btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Gerar Ideias';
  }
}

function _renderIdeasList(ideas) {
  const el = document.getElementById('vc-ideas-list');
  if (!el) return;
  if (!ideas.length) {
    el.innerHTML = '<div class="text-sm text-muted" style="text-align:center">Sem ideias geradas.</div>';
    return;
  }
  el.innerHTML = ideas.map((idea, i) => `
    <div class="card" style="cursor:pointer;border:1px solid var(--border);transition:border-color .15s"
         id="vc-idea-card-${i}"
         onmouseenter="this.style.borderColor='var(--accent)'"
         onmouseleave="this.style.borderColor=''">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
        <div style="flex:1">
          <div style="font-weight:700;font-size:.9rem;margin-bottom:4px">
            <i class="fa-solid fa-clapperboard" style="color:var(--accent);margin-right:6px"></i>${escHtml(idea.titulo)}
          </div>
          <div class="text-sm" style="color:var(--accent);font-style:italic;margin-bottom:3px">
            "…${escHtml(idea.hook)}"
          </div>
          <div class="text-sm text-muted">${escHtml(idea.descricao || '')}</div>
        </div>
        <button class="btn btn-sm btn-primary" onclick="vcSelectIdea(${i})" style="white-space:nowrap">
          <i class="fa-solid fa-pen-to-square"></i> Criar
        </button>
      </div>
    </div>`).join('');
}

/* ═══════════════════════════════════════════════════════════
   SELECCIONAR IDEIA → PAINEL DE CRIAÇÃO
═══════════════════════════════════════════════════════════ */
function vcSelectIdea(idx) {
  _vcState.selectedIdea = _vcState.ideas[idx];
  _vcState.script       = null;
  _vcState.videoUrl     = null;
  _vcState.videoIsExternal = false;

  // Highlight card
  document.querySelectorAll('[id^="vc-idea-card-"]').forEach(c =>
    c.style.borderColor = ''
  );
  const card = document.getElementById(`vc-idea-card-${idx}`);
  if (card) card.style.borderColor = 'var(--accent)';

  _renderCreationPanel();
}

function _renderCreationPanel() {
  const container = document.getElementById('vc-creation-panel');
  if (!container) return;

  const idea   = _vcState.selectedIdea;
  const avatar = app.getActiveAvatar();

  if (!idea) {
    container.innerHTML = `
      <div class="card" id="vc-empty-panel">
        <div style="text-align:center;padding:40px 20px;color:var(--text-muted)">
          <i class="fa-solid fa-film" style="font-size:3rem;margin-bottom:12px;opacity:.3;display:block"></i>
          <div style="font-size:1rem;font-weight:600;margin-bottom:6px">Nenhuma ideia seleccionada</div>
          <div class="text-sm">Gera ideias à esquerda e clica em "Criar" para começar</div>
        </div>
      </div>`;
    return;
  }

  const hasFalAi   = !!Config.get('FAL_AI');
  const savedModel = Config.get('VIDEO_MODEL') || VC_MODELS[0].id;
  const modelOpts  = VC_MODELS.map(m =>
    `<option value="${m.id}"${m.id === savedModel ? ' selected' : ''}>${m.label}</option>`
  ).join('');

  const avatarPlats = (avatar?.plataformas || []);
  const shortPlats  = ['tiktok', 'instagram', 'youtube'];

  container.innerHTML = `
    <!-- Cabeçalho da ideia -->
    <div class="card" style="border-left:3px solid var(--accent)">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
        <div>
          <div class="card-title mb-1">${escHtml(idea.titulo)}</div>
          <div class="text-sm" style="color:var(--accent);font-style:italic">"${escHtml(idea.hook)}"</div>
          <div class="text-sm text-muted mt-1">${escHtml(idea.descricao || '')}</div>
        </div>
        <button class="btn btn-sm btn-ghost" onclick="vcSelectIdea(null);_vcState.selectedIdea=null;_renderCreationPanel()" title="Limpar">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>

    <!-- Gancho de abertura -->
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fa-solid fa-bolt" style="color:var(--accent)"></i> Gancho de Abertura</div>
        <button class="btn btn-sm btn-ghost" onclick="vcGenerateHook()"><i class="fa-solid fa-rotate"></i> Gerar</button>
      </div>
      <textarea id="vc-hook" class="form-control mt-0" rows="2"
        placeholder="A primeira frase que prende o espectador…">${escHtml(idea.hook || '')}</textarea>
      <div class="form-hint">Estas são as primeiras palavras do teu vídeo — determinam se as pessoas ficam ou saem.</div>
    </div>

    <!-- Script estruturado -->
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fa-solid fa-scroll" style="color:var(--accent)"></i> Script (30–60 seg)</div>
        <button class="btn btn-sm btn-ghost" onclick="vcGenerateScript()"><i class="fa-solid fa-wand-magic-sparkles"></i> Gerar script</button>
      </div>
      <div id="vc-script-display">
        <div class="text-sm text-muted">Clica em "Gerar script" para criar a estrutura do teu vídeo.</div>
      </div>
    </div>

    <!-- Prompt de vídeo -->
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fa-solid fa-film" style="color:var(--accent)"></i> Prompt de Vídeo</div>
        <button class="btn btn-sm btn-ghost" onclick="vcGenerateVideoPrompt()"><i class="fa-solid fa-rotate"></i> Gerar</button>
      </div>
      <textarea id="vc-vid-prompt" class="form-control mt-0" rows="3"
        placeholder="Prompt em inglês para o modelo de IA gerar o vídeo…"></textarea>
    </div>

    <!-- Opções de geração -->
    <div class="card">
      <div class="card-title mb-2"><i class="fa-solid fa-sliders" style="color:var(--accent)"></i> Opções</div>
      <div class="grid-2" style="gap:12px">
        <div class="form-group mb-0">
          <label class="form-label">Modelo de IA</label>
          <select id="vc-model" class="form-control" onchange="Config.set('VIDEO_MODEL',this.value)">
            ${modelOpts}
          </select>
        </div>
        <div class="form-group mb-0">
          <label class="form-label">Formato</label>
          <select id="vc-ratio" class="form-control">
            <option value="9:16" selected>9:16 — TikTok / Reels (vertical)</option>
            <option value="16:9">16:9 — YouTube (horizontal)</option>
            <option value="1:1">1:1 — Feed (quadrado)</option>
          </select>
        </div>
      </div>
      ${!hasFalAi ? `<div class="form-hint mt-2" style="color:var(--yellow)"><i class="fa-solid fa-triangle-exclamation"></i> Configura a chave fal.ai nas <a href="#configuracoes" onclick="app.navigate('configuracoes')" style="color:var(--accent)">Configurações</a> para gerar vídeos com IA.</div>` : ''}
    </div>

    <!-- Plataformas -->
    <div class="card">
      <div class="card-title mb-2">Publicar em</div>
      <div class="platform-toggles" id="vc-platforms">
        ${shortPlats.map(p => {
          const active = avatarPlats.includes(p);
          return `<div class="platform-toggle${active ? ' active ' + p : ''}" data-p="${p}" onclick="vcTogglePlatform(this)">
            ${app.platformIcon(p)} ${p === 'youtube' ? 'YouTube Shorts' : p === 'instagram' ? 'Reels' : 'TikTok'}
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- Legenda e hashtags -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">Legenda</div>
        <button class="btn btn-sm btn-ghost" onclick="vcGenerateCaption()"><i class="fa-solid fa-rotate"></i> Gerar</button>
      </div>
      <textarea id="vc-caption" class="form-control mt-0" rows="3"
        placeholder="Legenda do post…"></textarea>
    </div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">Hashtags</div>
        <button class="btn btn-sm btn-ghost" onclick="vcGenerateHashtags()"><i class="fa-solid fa-rotate"></i> Gerar</button>
      </div>
      <textarea id="vc-hashtags" class="form-control mt-0" rows="2"
        placeholder="#hashtag1 #hashtag2 …"></textarea>
    </div>

    <!-- Pré-visualização do vídeo -->
    <div class="card">
      <div class="card-title mb-2"><i class="fa-solid fa-eye" style="color:var(--accent)"></i> Pré-visualização</div>
      <div id="vc-vid-preview" style="background:var(--bg-elevated);border-radius:var(--radius);aspect-ratio:9/16;max-height:400px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);overflow:hidden">
        <div style="text-align:center">
          <i class="fa-solid fa-film" style="font-size:2.5rem;opacity:.3;display:block;margin-bottom:8px"></i>
          <span class="text-sm">O vídeo gerado aparece aqui</span>
        </div>
      </div>
      <div id="vc-vid-status" class="text-sm text-muted mt-2" style="text-align:center;min-height:18px"></div>
    </div>

    <!-- Botões de acção -->
    <div style="display:flex;flex-direction:column;gap:10px">
      <button class="btn btn-primary" id="vc-gen-vid-btn" onclick="vcGenerateVideo()" style="width:100%;padding:12px">
        <i class="fa-solid fa-film"></i> Gerar Vídeo com IA
      </button>
      <div class="grid-2" style="gap:10px">
        <label class="btn btn-secondary" style="cursor:pointer;justify-content:center">
          <i class="fa-solid fa-upload"></i> Upload de vídeo
          <input type="file" accept="video/*" style="display:none" onchange="vcUploadVideo(this)">
        </label>
        <button class="btn btn-secondary" onclick="vcGenerateAll()" id="vc-gen-all-btn">
          <i class="fa-solid fa-wand-magic-sparkles"></i> Gerar tudo
        </button>
      </div>
    </div>

    <!-- Agendar -->
    <div class="card">
      <div class="card-title mb-2">Agendar</div>
      <div class="grid-2">
        <div class="form-group mb-0">
          <label class="form-label">Data e hora</label>
          <input id="vc-schedule" type="datetime-local" class="form-control" value="${_vcDefaultSchedule()}">
        </div>
        <div class="form-group mb-0">
          <label class="form-label">Status</label>
          <select id="vc-status" class="form-control">
            <option value="rascunho">Rascunho</option>
            <option value="agendado" selected>Agendado</option>
          </select>
        </div>
      </div>
    </div>
    <div class="flex gap-1">
      <button class="btn btn-secondary flex-1" onclick="vcSavePost('rascunho')">
        <i class="fa-regular fa-floppy-disk"></i> Guardar rascunho
      </button>
      <button class="btn btn-primary flex-1" onclick="vcSavePost()">
        <i class="fa-solid fa-calendar-plus"></i> Agendar
      </button>
    </div>
  `;
}

/* ═══════════════════════════════════════════════════════════
   GERADORES IA
═══════════════════════════════════════════════════════════ */
async function vcGenerateHook() {
  const idea   = _vcState.selectedIdea;
  const avatar = app.getActiveAvatar();
  if (!idea || !avatar) return;
  try {
    const hook = await AI.generateVideoHook(avatar, idea.titulo);
    const el   = document.getElementById('vc-hook');
    if (el) el.value = hook;
    app.toast('Gancho gerado!', 'success');
  } catch (e) {
    app.toast('Erro: ' + e.message, 'error');
  }
}

async function vcGenerateScript() {
  const idea   = _vcState.selectedIdea;
  const avatar = app.getActiveAvatar();
  const hook   = document.getElementById('vc-hook')?.value.trim();
  if (!idea || !avatar) return;

  const btn = document.querySelector('[onclick="vcGenerateScript()"]');
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:12px;height:12px"></div>'; }

  try {
    const script  = await AI.generateShortScript(avatar, idea.titulo, hook);
    _vcState.script = script;
    _renderScriptDisplay(script);
    app.toast('Script gerado!', 'success');
  } catch (e) {
    app.toast('Erro: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Gerar script'; }
  }
}

function _renderScriptDisplay(script) {
  const el = document.getElementById('vc-script-display');
  if (!el || !script) return;
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:4px">
      <div style="background:var(--bg-elevated);border-radius:var(--radius-sm);padding:10px">
        <div class="text-sm" style="color:var(--accent);font-weight:700;margin-bottom:4px">🎣 Gancho (5–10 seg)</div>
        <div class="text-sm">${escHtml(script.gancho || '')}</div>
      </div>
      <div style="background:var(--bg-elevated);border-radius:var(--radius-sm);padding:10px">
        <div class="text-sm" style="color:var(--accent);font-weight:700;margin-bottom:4px">📚 Desenvolvimento (20–40 seg)</div>
        <div class="text-sm" style="white-space:pre-line">${escHtml(script.desenvolvimento || '')}</div>
      </div>
      <div style="background:var(--bg-elevated);border-radius:var(--radius-sm);padding:10px">
        <div class="text-sm" style="color:var(--accent);font-weight:700;margin-bottom:4px">🎯 CTA final (5–10 seg)</div>
        <div class="text-sm">${escHtml(script.cta || '')}</div>
      </div>
    </div>`;
}

async function vcGenerateVideoPrompt() {
  const idea   = _vcState.selectedIdea;
  const avatar = app.getActiveAvatar();
  if (!idea || !avatar) return;
  try {
    const prompt = await AI.generateVideoPrompt(avatar, idea.titulo);
    const el     = document.getElementById('vc-vid-prompt');
    if (el) el.value = prompt;
    app.toast('Prompt de vídeo gerado!', 'success');
  } catch (e) {
    app.toast('Erro: ' + e.message, 'error');
  }
}

async function vcGenerateCaption() {
  const idea   = _vcState.selectedIdea;
  const avatar = app.getActiveAvatar();
  if (!idea || !avatar) return;
  try {
    const text = await AI.generateCaption(avatar, idea.titulo);
    const el   = document.getElementById('vc-caption');
    if (el) el.value = text;
    app.toast('Legenda gerada!', 'success');
  } catch (e) {
    app.toast('Erro: ' + e.message, 'error');
  }
}

async function vcGenerateHashtags() {
  const idea   = _vcState.selectedIdea;
  const avatar = app.getActiveAvatar();
  if (!idea || !avatar) return;
  try {
    const text = await AI.generateHashtags(avatar.nicho || 'geral', idea.titulo);
    const el   = document.getElementById('vc-hashtags');
    if (el) el.value = text;
    app.toast('Hashtags geradas!', 'success');
  } catch (e) {
    app.toast('Erro: ' + e.message, 'error');
  }
}

/* Gerar tudo de uma vez */
async function vcGenerateAll() {
  const btn = document.getElementById('vc-gen-all-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:14px;height:14px"></div>'; }
  try {
    await Promise.all([
      vcGenerateHook(),
      vcGenerateVideoPrompt(),
      vcGenerateCaption(),
      vcGenerateHashtags(),
    ]);
    await vcGenerateScript();
    app.toast('Tudo gerado! Revê o conteúdo e gera o vídeo quando estiveres pronto.', 'success');
  } catch (e) {
    app.toast('Erro durante geração: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Gerar tudo'; }
  }
}

/* ═══════════════════════════════════════════════════════════
   GERAÇÃO DE VÍDEO
═══════════════════════════════════════════════════════════ */
async function vcGenerateVideo() {
  const prompt = document.getElementById('vc-vid-prompt')?.value.trim();
  if (!prompt) { app.toast('Gera ou escreve um prompt de vídeo primeiro.', 'warning'); return; }

  const model  = document.getElementById('vc-model')?.value || VC_MODELS[0].id;
  const ratio  = document.getElementById('vc-ratio')?.value || '9:16';
  const btn    = document.getElementById('vc-gen-vid-btn');
  const status = document.getElementById('vc-vid-status');

  Config.set('VIDEO_MODEL', model);

  btn.disabled  = true;
  btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:6px"></div> A gerar…';

  const modelLabel = VC_MODELS.find(m => m.id === model)?.label || model;
  let   dots = 0;
  const ticker = setInterval(() => {
    dots = (dots % 3) + 1;
    if (status) status.textContent = `A gerar com ${modelLabel}${'…'.slice(0, dots)} (pode demorar 1–3 minutos)`;
  }, 800);

  try {
    const result = await AI.generateVideo(prompt, {
      aspectRatio: ratio,
      onProgress: (step, total) => {
        if (status) status.textContent = `A processar… ${Math.round((step / total) * 100)}%`;
      }
    });

    clearInterval(ticker);
    if (result.isExternal) {
      _vcState.videoUrl        = result.url;
      _vcState.videoIsExternal = true;
    } else {
      _vcState.videoUrl        = result.url;
      _vcState.videoIsExternal = false;
    }

    // Preview
    const preview = document.getElementById('vc-vid-preview');
    if (preview) {
      preview.innerHTML = `<video src="${result.url}" autoplay muted loop playsinline
        style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius)"></video>`;
    }
    if (status) status.textContent = 'Vídeo gerado com sucesso! ✓';
    app.toast('Vídeo gerado!', 'success');
  } catch (e) {
    clearInterval(ticker);
    if (status) status.textContent = 'Erro: ' + e.message;
    app.toast('Erro ao gerar vídeo: ' + e.message, 'error');
  } finally {
    btn.disabled  = false;
    btn.innerHTML = '<i class="fa-solid fa-film"></i> Gerar Vídeo com IA';
  }
}

function vcUploadVideo(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    _vcState.videoUrl        = e.target.result;
    _vcState.videoIsExternal = false;
    const preview = document.getElementById('vc-vid-preview');
    if (preview) {
      preview.innerHTML = `<video src="${e.target.result}" autoplay muted loop playsinline
        style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius)"></video>`;
    }
    app.toast('Vídeo carregado!', 'success');
  };
  reader.readAsDataURL(file);
}

/* ═══════════════════════════════════════════════════════════
   PLATAFORMAS
═══════════════════════════════════════════════════════════ */
function vcTogglePlatform(el) {
  const p       = el.dataset.p;
  const wasActive = el.classList.contains('active');
  el.classList.toggle('active', !wasActive);
  if (!wasActive) el.classList.add(p); else el.classList.remove(p);
}

function vcGetSelectedPlatforms() {
  return [...document.querySelectorAll('#vc-platforms .platform-toggle.active')].map(e => e.dataset.p);
}

/* ═══════════════════════════════════════════════════════════
   GUARDAR POST
═══════════════════════════════════════════════════════════ */
async function vcSavePost(forceStatus) {
  const idea     = _vcState.selectedIdea;
  const avatar   = app.getActiveAvatar();
  const caption  = document.getElementById('vc-caption')?.value.trim();
  const hashtags = document.getElementById('vc-hashtags')?.value.trim();
  const hook     = document.getElementById('vc-hook')?.value.trim();
  const vidPrompt = document.getElementById('vc-vid-prompt')?.value.trim();
  const model    = document.getElementById('vc-model')?.value;
  const ratio    = document.getElementById('vc-ratio')?.value || '9:16';
  const schedule = document.getElementById('vc-schedule')?.value;
  const status   = forceStatus || document.getElementById('vc-status')?.value || 'rascunho';
  const plats    = vcGetSelectedPlatforms();

  if (!caption) { app.toast('Adiciona uma legenda antes de guardar.', 'warning'); return; }
  if (!plats.length) { app.toast('Seleciona pelo menos uma plataforma.', 'warning'); return; }

  const btn = document.querySelector(`[onclick="vcSavePost('${forceStatus || ''}')"]`)
    || document.querySelector('[onclick="vcSavePost()"]');
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:14px;height:14px"></div>'; }

  try {
    let videoPublicUrl = null;

    if (_vcState.videoUrl) {
      if (_vcState.videoIsExternal) {
        const { url, error } = await DB.uploadPostVideoFromUrl(
          _vcState.videoUrl,
          `vc-${Date.now()}`
        );
        if (error) throw new Error(error.message || JSON.stringify(error));
        videoPublicUrl = url;
      } else {
        const { url, error } = await DB.uploadPostVideo(
          _vcState.videoUrl,
          `vc-${Date.now()}`
        );
        if (error) throw new Error(error.message || JSON.stringify(error));
        videoPublicUrl = url;
      }
    }

    const post = {
      avatar_id:     avatar?.id,
      legenda:       caption,
      hashtags:      hashtags || '',
      plataformas:   plats,
      tipo_conteudo: 'video',
      video_url:     videoPublicUrl || null,
      formato_video: ratio,
      modelo_video:  model || null,
      hook:          hook || null,
      status,
      agendado_para: status === 'agendado' && schedule ? new Date(schedule).toISOString() : null,
    };

    const { error } = await DB.upsertPost(post);
    if (error) throw new Error(error.message || JSON.stringify(error));

    app.toast(
      status === 'agendado' ? 'Vídeo agendado com sucesso!' : 'Rascunho guardado!',
      'success'
    );
    app.navigate('fila');
  } catch (e) {
    app.toast('Erro ao guardar: ' + e.message, 'error');
  } finally {
    if (btn) {
      btn.disabled  = false;
      btn.innerHTML = status === 'rascunho'
        ? '<i class="fa-regular fa-floppy-disk"></i> Guardar rascunho'
        : '<i class="fa-solid fa-calendar-plus"></i> Agendar';
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   FILA DE VÍDEOS (mini)
═══════════════════════════════════════════════════════════ */
async function vcToggleQueue() {
  const body    = document.getElementById('vc-queue-body');
  const chevron = document.getElementById('vc-queue-chevron');
  if (!body) return;

  const hidden = body.style.display === 'none';
  body.style.display    = hidden ? '' : 'none';
  if (chevron) chevron.className = `fa-solid fa-chevron-${hidden ? 'up' : 'down'} text-muted`;

  if (hidden) await vcLoadQueue();
}

async function vcLoadQueue() {
  const body   = document.getElementById('vc-queue-body');
  if (!body || !DB.ready()) return;

  try {
    const { data: posts } = await DB.getPosts({ limit: 8 });
    const videos = (posts || []).filter(p => p.tipo_conteudo === 'video');

    if (!videos.length) {
      body.innerHTML = '<div class="text-sm text-muted" style="text-align:center;padding:8px">Sem vídeos na fila.</div>';
      return;
    }

    body.innerHTML = videos.map(p => `
      <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border-muted)">
        ${p.video_url
          ? `<video src="${p.video_url}" muted style="width:40px;height:60px;object-fit:cover;border-radius:4px;flex-shrink:0"></video>`
          : `<div style="width:40px;height:60px;background:var(--bg-elevated);border-radius:4px;display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fa-solid fa-film text-muted" style="font-size:.9rem"></i></div>`}
        <div style="flex:1;min-width:0">
          <div style="font-size:.82rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml((p.legenda || '').slice(0, 60))}</div>
          <div class="text-sm text-muted">${p.plataformas?.join(', ') || '—'} · ${app.statusBadge(p.status)}</div>
          ${p.agendado_para ? `<div class="text-sm text-muted">${app.formatDate(p.agendado_para)}</div>` : ''}
        </div>
      </div>`).join('');
  } catch (e) {
    body.innerHTML = `<div class="text-sm text-muted">Erro: ${e.message}</div>`;
  }
}

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
function _vcDefaultSchedule() {
  const d = new Date();
  d.setHours(d.getHours() + 2, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}
