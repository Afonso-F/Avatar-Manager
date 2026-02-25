/* ============================================================
   sections/criar-post.js
   ============================================================ */
let _criarState = {
  imageDataUrl:    null,
  imagePromptUsed: null,
  videoDataUrl:    null,
  videoExternalUrl:null, // URL externa do fal.ai
  contentType:     'image', // 'image' | 'video'
  platformCaptions: {},   // { instagram: '...', tiktok: '...', ... }
};

async function renderCriarPost(container) {
  let avatares = app.getAvatares();
  if (!avatares.length && DB.ready()) {
    const { data } = await DB.getAvatares();
    avatares = data || [];
    app.setAvatares(avatares);
  }
  if (!avatares.length) avatares = [{ id: 'local', nome: 'Avatar genérico', nicho: 'Geral', emoji: '🎭', plataformas: ['instagram'] }];

  const activeAvatar = app.getActiveAvatar() || avatares[0];
  _criarState.imageDataUrl     = null;
  _criarState.videoDataUrl     = null;
  _criarState.videoExternalUrl = null;
  _criarState.contentType      = 'image';
  _criarState.platformCaptions = {};

  // Carregar templates disponíveis
  let templates = [];
  if (DB.ready()) {
    const { data } = await DB.getPostTemplates();
    templates = data || [];
  }

  const hasFalAi = !!Config.get('FAL_AI');

  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Criar Post</div>
        <div class="section-subtitle">Gera conteúdo com IA e agenda para as tuas plataformas</div>
      </div>
      <div class="flex gap-1">
        ${templates.length ? `
        <button class="btn btn-secondary" onclick="openTemplatesPicker()">
          <i class="fa-solid fa-bookmark"></i> Templates
        </button>` : ''}
        <button class="btn btn-secondary" onclick="openSaveTemplate()">
          <i class="fa-regular fa-bookmark"></i> Guardar template
        </button>
      </div>
    </div>

    <div class="two-col-layout">
      <!-- Esquerda: form -->
      <div style="display:flex;flex-direction:column;gap:16px">

        <!-- Avatar selector -->
        <div class="card">
          <div class="card-title mb-2">Avatar</div>
          <div class="flex gap-1 flex-wrap">
            ${avatares.map(a => `
              <div class="platform-toggle${String(a.id) === String(activeAvatar?.id) ? ' active instagram' : ''}"
                   id="av-sel-${a.id}" data-avid="${a.id}" onclick="selectAvatar('${a.id}')">
                ${a.emoji || '🎭'} ${a.nome}
              </div>`).join('')}
          </div>
        </div>

        <!-- Tema -->
        <div class="card">
          <div class="card-title mb-2">Tema do post</div>
          <div class="form-group mb-1">
            <input id="cp-topic" class="form-control" placeholder="Ex: 5 dicas para dormir melhor…">
          </div>
          <div class="flex gap-1">
            <button class="btn btn-secondary btn-sm flex-1" onclick="generateAll()">
              <i class="fa-solid fa-wand-magic-sparkles"></i> Gerar tudo com IA
            </button>
            <button class="btn btn-ghost btn-sm" onclick="generatePlatformCaptions()" title="Gerar legenda específica por plataforma">
              <i class="fa-solid fa-layer-group"></i> Por plataforma
            </button>
          </div>
        </div>

        <!-- Legenda -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Legenda</div>
            <button class="btn btn-sm btn-ghost" onclick="generateCaption()"><i class="fa-solid fa-rotate"></i> Gerar</button>
          </div>
          <textarea id="cp-caption" class="form-control mt-0" rows="5" placeholder="A legenda do post aparece aqui…"></textarea>
          <div id="cp-caption-count" class="text-sm text-muted mt-1">0 caracteres</div>

          <!-- Tabs por plataforma (aparecem após gerar por plataforma) -->
          <div id="cp-platform-captions" style="display:none;margin-top:12px">
            <div class="card-title mb-2" style="font-size:.8rem">Legendas por plataforma</div>
            <div class="tabs" id="cp-plat-tabs" style="margin-bottom:8px">
              ${['instagram','tiktok','youtube','facebook'].map((p,i) =>
                `<button class="tab-btn${i===0?' active':''}" onclick="switchPlatformCaption('${p}',this)">${app.platformIcon(p)} ${p}</button>`
              ).join('')}
            </div>
            <div id="cp-plat-caption-box" style="background:var(--bg-elevated);border-radius:var(--radius-sm);padding:10px;font-size:.85rem;line-height:1.6;cursor:pointer" title="Clica para usar esta legenda" onclick="usePlatformCaption()"></div>
            <div class="text-sm text-muted mt-1"><i class="fa-solid fa-arrow-up-left"></i> Clica na legenda para a usar acima</div>
          </div>
        </div>

        <!-- Hashtags -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Hashtags</div>
            <div class="flex gap-1">
              <button class="btn btn-sm btn-ghost" onclick="generateHashtags()"><i class="fa-solid fa-rotate"></i> Gerar</button>
              <button class="btn btn-sm btn-ghost" id="cp-hashtag-img-btn" onclick="suggestHashtagsFromImage()" title="Sugerir baseado na imagem" style="display:none">
                <i class="fa-solid fa-image"></i> Da imagem
              </button>
            </div>
          </div>
          <textarea id="cp-hashtags" class="form-control mt-0" rows="3" placeholder="#hashtag1 #hashtag2 …"></textarea>
        </div>

        <!-- Plataformas -->
        <div class="card">
          <div class="card-title mb-2">Publicar em</div>
          <div class="platform-toggles" id="cp-platforms">
            ${['instagram','tiktok','facebook','youtube'].map(p => {
              const active = (activeAvatar?.plataformas || []).includes(p);
              return `<div class="platform-toggle${active ? ' active ' + p : ''}" data-p="${p}" onclick="toggleCriarPlatform(this)">
                ${app.platformIcon(p)} ${p}
              </div>`;
            }).join('')}
          </div>
        </div>

        <!-- Agendar -->
        <div class="card">
          <div class="card-title mb-2">Agendar</div>
          <div class="grid-2">
            <div class="form-group mb-0">
              <label class="form-label">Data e hora</label>
              <input id="cp-schedule" type="datetime-local" class="form-control" value="${defaultSchedule()}">
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Status</label>
              <select id="cp-status" class="form-control">
                <option value="rascunho">Rascunho</option>
                <option value="agendado" selected>Agendado</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Ações -->
        <div class="flex gap-1">
          <button class="btn btn-secondary flex-1" onclick="savePost('rascunho')">
            <i class="fa-regular fa-floppy-disk"></i> Guardar rascunho
          </button>
          <button class="btn btn-primary flex-1" onclick="savePost()">
            <i class="fa-solid fa-calendar-plus"></i> Agendar post
          </button>
        </div>
      </div>

      <!-- Direita: media -->
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <!-- Toggle Imagem / Vídeo -->
          <div class="content-type-toggle mb-3">
            <button class="type-btn active" id="cp-type-img" onclick="setContentType('image')">
              <i class="fa-regular fa-image"></i> Imagem
            </button>
            <button class="type-btn" id="cp-type-vid" onclick="setContentType('video')">
              <i class="fa-solid fa-film"></i> Vídeo
            </button>
          </div>

          <!-- Painel imagem -->
          <div id="cp-img-panel">
            <div class="card-header" style="padding:0;margin-bottom:12px">
              <div class="card-title">Imagem</div>
              <button class="btn btn-sm btn-ghost" onclick="generateImage()"><i class="fa-solid fa-rotate"></i> Gerar</button>
            </div>
            <div class="image-preview-box" id="cp-img-preview">
              <i class="fa-regular fa-image"></i>
              <span>Clica em "Gerar" ou carrega uma imagem</span>
            </div>
            <div class="form-group mt-2 mb-1">
              <label class="form-label">Prompt de imagem</label>
              <textarea id="cp-img-prompt" class="form-control" rows="3" placeholder="Descreve a imagem que queres gerar…"></textarea>
            </div>
            <div class="flex gap-1">
              <button class="btn btn-primary btn-sm flex-1" id="cp-gen-img-btn" onclick="generateImage()">
                <i class="fa-solid fa-image"></i> Gerar imagem
              </button>
              <label class="btn btn-secondary btn-sm" style="cursor:pointer">
                <i class="fa-solid fa-upload"></i> Upload
                <input type="file" accept="image/*" style="display:none" onchange="uploadImage(this)">
              </label>
            </div>
            <div id="cp-img-status" class="text-sm text-muted mt-1"></div>
          </div>

          <!-- Painel vídeo -->
          <div id="cp-vid-panel" style="display:none">
            <div class="card-header" style="padding:0;margin-bottom:12px">
              <div class="card-title">Vídeo ${hasFalAi ? '<span class="badge-model">fal.ai</span>' : '<span class="badge-model veo">Veo 2</span>'}</div>
              <button class="btn btn-sm btn-ghost" onclick="generateVidPrompt()"><i class="fa-solid fa-wand-magic-sparkles"></i> Gerar prompt</button>
            </div>
            <div class="video-preview-box" id="cp-vid-preview">
              <i class="fa-solid fa-film"></i>
              <span>Clica em "Gerar vídeo" ou faz upload</span>
            </div>
            <div class="form-group mt-2 mb-1">
              <label class="form-label">Prompt de vídeo</label>
              <textarea id="cp-vid-prompt" class="form-control" rows="3" placeholder="Descreve o vídeo que queres gerar…"></textarea>
            </div>
            <div class="form-group mb-1">
              <label class="form-label">Formato</label>
              <select id="cp-vid-ratio" class="form-control">
                <option value="9:16">9:16 — TikTok / Reels (vertical)</option>
                <option value="16:9">16:9 — YouTube (horizontal)</option>
                <option value="1:1">1:1 — Feed (quadrado)</option>
              </select>
            </div>
            <div class="flex gap-1">
              <button class="btn btn-primary btn-sm flex-1" id="cp-gen-vid-btn" onclick="generateVideoPost()">
                <i class="fa-solid fa-film"></i> Gerar vídeo com IA
              </button>
              <label class="btn btn-secondary btn-sm" style="cursor:pointer">
                <i class="fa-solid fa-upload"></i> Upload
                <input type="file" accept="video/*" style="display:none" onchange="uploadVideo(this)">
              </label>
            </div>
            <div id="cp-vid-status" class="text-sm text-muted mt-1"></div>
          </div>
        </div>

        <!-- Pré-visualização -->
        <div class="card">
          <div class="card-title mb-2">Pré-visualização</div>
          <div style="background:var(--bg-elevated);border-radius:var(--radius);overflow:hidden">
            <div id="cp-preview-img" style="width:100%;aspect-ratio:1;background:var(--bg-hover);display:flex;align-items:center;justify-content:center;color:var(--text-muted)"><i class="fa-regular fa-image" style="font-size:2rem"></i></div>
            <div style="padding:12px">
              <div style="font-size:.82rem;font-weight:700;margin-bottom:4px" id="cp-preview-name">${activeAvatar?.nome || 'Avatar'}</div>
              <div style="font-size:.82rem;line-height:1.5;color:var(--text-secondary)" id="cp-preview-caption">A legenda aparece aqui…</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  // Live preview
  document.getElementById('cp-caption').addEventListener('input', e => {
    document.getElementById('cp-preview-caption').textContent = e.target.value || 'A legenda aparece aqui…';
    document.getElementById('cp-caption-count').textContent = `${e.target.value.length} caracteres`;
  });
}

/* ── Templates ── */
async function openTemplatesPicker() {
  let templates = [];
  if (DB.ready()) {
    const { data } = await DB.getPostTemplates();
    templates = data || [];
  }
  if (!templates.length) { app.toast('Nenhum template guardado', 'warning'); return; }

  const body = `
    <div style="display:flex;flex-direction:column;gap:8px">
      ${templates.map(t => `
        <div class="post-card" style="cursor:pointer" onclick="applyTemplate('${t.id}')">
          <div class="post-body">
            <div class="post-caption" style="font-weight:600">${t.nome}</div>
            <div class="text-sm text-muted mt-1">${(t.legenda || '').slice(0, 80)}${(t.legenda||'').length > 80 ? '…' : ''}</div>
          </div>
          <div class="post-actions">
            <button class="btn btn-sm btn-danger btn-icon" onclick="event.stopPropagation();deleteTemplate('${t.id}')" title="Apagar"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>`).join('')}
    </div>`;

  app.openModal('Templates guardados', body, '<button class="btn btn-secondary" onclick="app.closeModal()">Fechar</button>');
  window._templates = templates;
}

async function applyTemplate(id) {
  const tpl = (window._templates || []).find(t => String(t.id) === String(id));
  if (!tpl) return;
  const legEl = document.getElementById('cp-caption');
  const hashEl = document.getElementById('cp-hashtags');
  if (legEl && tpl.legenda) {
    legEl.value = tpl.legenda;
    document.getElementById('cp-preview-caption').textContent = tpl.legenda;
    document.getElementById('cp-caption-count').textContent = `${tpl.legenda.length} caracteres`;
  }
  if (hashEl && tpl.hashtags) hashEl.value = tpl.hashtags;
  app.closeModal();
  app.toast(`Template "${tpl.nome}" aplicado!`, 'success');
}

async function deleteTemplate(id) {
  if (!confirm('Apagar este template?')) return;
  if (DB.ready()) await DB.deletePostTemplate(id);
  window._templates = (window._templates || []).filter(t => String(t.id) !== String(id));
  app.toast('Template apagado', 'success');
  openTemplatesPicker();
}

function openSaveTemplate() {
  const legenda  = document.getElementById('cp-caption')?.value.trim();
  const hashtags = document.getElementById('cp-hashtags')?.value.trim();
  if (!legenda) { app.toast('Adiciona uma legenda antes de guardar o template', 'warning'); return; }

  const body = `
    <div class="form-group mb-0">
      <label class="form-label">Nome do template</label>
      <input id="tpl-name" class="form-control" placeholder="Ex: Motivacional Lisboa #1" autofocus>
    </div>`;
  const footer = `
    <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveTemplate()"><i class="fa-solid fa-bookmark"></i> Guardar</button>`;

  app.openModal('Guardar como template', body, footer);
  setTimeout(() => document.getElementById('tpl-name')?.focus(), 100);
  window._tplData = { legenda, hashtags, plataformas: getSelectedPlatforms(), avatar_id: getSelectedAvatarId() };
}

async function saveTemplate() {
  const nome = document.getElementById('tpl-name')?.value.trim();
  if (!nome) { app.toast('Dá um nome ao template', 'warning'); return; }
  const tpl = { nome, ...window._tplData };
  if (DB.ready()) {
    const { error } = await DB.upsertPostTemplate(tpl);
    if (error) { app.toast('Erro ao guardar: ' + error, 'error'); return; }
  }
  app.toast(`Template "${nome}" guardado!`, 'success');
  app.closeModal();
}

/* ── Legendas por plataforma ── */
async function generatePlatformCaptions() {
  const topic  = document.getElementById('cp-topic')?.value.trim() || 'conteúdo motivacional';
  const avatar = app.getActiveAvatar();
  if (!avatar) { app.toast('Seleciona um avatar', 'warning'); return; }

  const btn = document.querySelector('[onclick="generatePlatformCaptions()"]');
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:14px;height:14px"></div>'; }

  try {
    const captions = await Gemini.generateCaptionsPerPlatform(avatar, topic);
    _criarState.platformCaptions = captions;

    const box = document.getElementById('cp-platform-captions');
    if (box) {
      box.style.display = '';
      // Mostrar a primeira disponível
      const first = ['instagram','tiktok','youtube','facebook'].find(p => captions[p]);
      if (first) showPlatformCaption(first);
    }
    app.toast('Legendas por plataforma geradas!', 'success');
  } catch (e) {
    app.toast('Erro: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-layer-group"></i> Por plataforma'; }
  }
}

function switchPlatformCaption(platform, btn) {
  document.querySelectorAll('#cp-plat-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  showPlatformCaption(platform);
}

function showPlatformCaption(platform) {
  const el = document.getElementById('cp-plat-caption-box');
  if (el) {
    el.textContent = _criarState.platformCaptions[platform] || '(sem legenda para esta plataforma)';
    el.dataset.platform = platform;
  }
}

function usePlatformCaption() {
  const el = document.getElementById('cp-plat-caption-box');
  if (!el) return;
  const text = el.textContent;
  const captionEl = document.getElementById('cp-caption');
  if (captionEl && text && text !== '(sem legenda para esta plataforma)') {
    captionEl.value = text;
    document.getElementById('cp-preview-caption').textContent = text;
    document.getElementById('cp-caption-count').textContent = `${text.length} caracteres`;
    app.toast('Legenda aplicada!', 'success');
  }
}

/* ── Sugestão de hashtags pela imagem ── */
async function suggestHashtagsFromImage() {
  if (!_criarState.imageDataUrl) { app.toast('Gera ou carrega uma imagem primeiro', 'warning'); return; }
  const avatar = app.getActiveAvatar();
  const nicho  = avatar?.nicho || 'geral';
  try {
    const tags = await Gemini.suggestHashtagsFromImage(_criarState.imageDataUrl, nicho);
    document.getElementById('cp-hashtags').value = tags;
    app.toast('Hashtags sugeridas pela imagem!', 'success');
  } catch (e) {
    app.toast('Erro: ' + e.message, 'error');
  }
}

/* ── Helpers existentes ── */
function defaultSchedule() {
  const d = new Date();
  d.setHours(d.getHours() + 2, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

function getSelectedAvatarId() {
  const el = document.querySelector('[id^="av-sel-"].active');
  return el?.dataset.avid || app.getActiveAvatar()?.id;
}

function setContentType(type) {
  _criarState.contentType = type;
  document.getElementById('cp-img-panel').style.display = type === 'image' ? '' : 'none';
  document.getElementById('cp-vid-panel').style.display = type === 'video' ? '' : 'none';
  document.getElementById('cp-type-img').classList.toggle('active', type === 'image');
  document.getElementById('cp-type-vid').classList.toggle('active', type === 'video');
  const prevImg = document.getElementById('cp-preview-img');
  if (prevImg && type === 'video' && (_criarState.videoDataUrl || _criarState.videoExternalUrl)) {
    const src = _criarState.videoExternalUrl || _criarState.videoDataUrl;
    prevImg.innerHTML = `<video src="${src}" autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover"></video>`;
  } else if (prevImg && type === 'image' && _criarState.imageDataUrl) {
    prevImg.innerHTML = `<img src="${_criarState.imageDataUrl}" alt="preview" style="width:100%;height:100%;object-fit:cover">`;
  } else if (prevImg) {
    prevImg.innerHTML = `<i class="fa-regular fa-${type === 'video' ? 'film' : 'image'}" style="font-size:2rem"></i>`;
  }
}

function selectAvatar(id) {
  document.querySelectorAll('[id^="av-sel-"]').forEach(el => el.classList.remove('active', 'instagram'));
  const el = document.getElementById(`av-sel-${id}`);
  if (el) el.classList.add('active', 'instagram');
  Config.set('ACTIVE_AVATAR', id);
  const a = app.getAvatares().find(x => String(x.id) === String(id));
  if (!a) return;
  const pname = document.getElementById('cp-preview-name');
  if (pname) pname.textContent = a.nome;
  const container = document.getElementById('cp-platforms');
  if (container) {
    container.querySelectorAll('.platform-toggle').forEach(el => {
      const p = el.dataset.p;
      const active = (a.plataformas || []).includes(p);
      el.classList.toggle('active', active);
      if (active) el.classList.add(p); else el.classList.remove(p);
    });
  }
}

function toggleCriarPlatform(el) {
  const p = el.dataset.p;
  const wasActive = el.classList.contains('active');
  el.classList.toggle('active', !wasActive);
  if (!wasActive) el.classList.add(p); else el.classList.remove(p);
}

function getSelectedPlatforms() {
  return [...document.querySelectorAll('#cp-platforms .platform-toggle.active')].map(el => el.dataset.p);
}

async function generateAll() {
  const topic = document.getElementById('cp-topic').value.trim();
  if (!topic) { app.toast('Escreve o tema do post primeiro', 'warning'); return; }
  await Promise.all([generateCaption(), generateHashtags(), generateImgPrompt()]);
}

async function generateCaption() {
  const topic  = document.getElementById('cp-topic').value.trim() || 'conteúdo motivacional';
  const avatar = app.getActiveAvatar();
  if (!avatar) { app.toast('Seleciona um avatar', 'warning'); return; }
  const btn = document.querySelector('[onclick="generateCaption()"]');
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:14px;height:14px"></div>'; }
  try {
    const refUrls   = (avatar.imagens_referencia || []).slice(0, 2);
    const refImages = await _loadImagesAsDataUrls(refUrls);
    const text = await Gemini.generateCaption(avatar, topic, refImages);
    document.getElementById('cp-caption').value = text;
    document.getElementById('cp-preview-caption').textContent = text;
    document.getElementById('cp-caption-count').textContent = `${text.length} caracteres`;
    app.toast('Legenda gerada!', 'success');
  } catch (e) {
    app.toast('Erro: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Gerar'; }
  }
}

async function _loadImagesAsDataUrls(urls) {
  if (!urls.length) return [];
  const results = await Promise.allSettled(urls.map(async url => {
    const res  = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }));
  return results.filter(r => r.status === 'fulfilled').map(r => r.value);
}

async function generateHashtags() {
  const topic  = document.getElementById('cp-topic').value.trim() || 'lifestyle';
  const avatar = app.getActiveAvatar();
  const nicho  = avatar?.nicho || 'geral';
  try {
    const text = await Gemini.generateHashtags(nicho, topic);
    document.getElementById('cp-hashtags').value = text;
    app.toast('Hashtags geradas!', 'success');
  } catch (e) {
    app.toast('Erro: ' + e.message, 'error');
  }
}

async function generateVidPrompt() {
  const topic  = document.getElementById('cp-topic').value.trim() || 'lifestyle';
  const avatar = app.getActiveAvatar();
  try {
    const text = await Gemini.generateVideoPrompt(avatar, topic);
    document.getElementById('cp-vid-prompt').value = text;
    app.toast('Prompt de vídeo gerado!', 'success');
  } catch (e) {
    app.toast('Erro: ' + e.message, 'error');
  }
}

async function generateImgPrompt() {
  const topic  = document.getElementById('cp-topic').value.trim() || 'lifestyle';
  const avatar = app.getActiveAvatar();
  try {
    const text = await Gemini.generateImagePrompt(avatar, topic);
    document.getElementById('cp-img-prompt').value = text;
  } catch (e) {
    console.warn('Img prompt error:', e);
  }
}

async function generateImage() {
  const prompt = document.getElementById('cp-img-prompt').value.trim();
  if (!prompt) { app.toast('Escreve um prompt de imagem', 'warning'); return; }
  const btn    = document.getElementById('cp-gen-img-btn');
  const status = document.getElementById('cp-img-status');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:14px;height:14px"></div> A gerar…';
  status.textContent = 'A gerar imagem com Imagen…';
  try {
    const dataUrl = await Gemini.generateImage(prompt);
    _criarState.imageDataUrl = dataUrl;
    setPreviewImage(dataUrl);
    // Mostrar botão de hashtags pela imagem
    const hBtn = document.getElementById('cp-hashtag-img-btn');
    if (hBtn) hBtn.style.display = '';
    app.toast('Imagem gerada!', 'success');
    status.textContent = '';
  } catch (e) {
    app.toast('Erro na imagem: ' + e.message, 'error');
    status.textContent = 'Erro: ' + e.message;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-image"></i> Gerar imagem';
  }
}

function uploadImage(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    _criarState.imageDataUrl = e.target.result;
    setPreviewImage(e.target.result);
    const hBtn = document.getElementById('cp-hashtag-img-btn');
    if (hBtn) hBtn.style.display = '';
    app.toast('Imagem carregada!', 'success');
  };
  reader.readAsDataURL(file);
}

/* Gerar vídeo — usa fal.ai se disponível, senão Veo 2 */
async function generateVideoPost() {
  const prompt      = document.getElementById('cp-vid-prompt').value.trim();
  const aspectRatio = document.getElementById('cp-vid-ratio').value;
  if (!prompt) { app.toast('Escreve um prompt de vídeo', 'warning'); return; }

  const btn    = document.getElementById('cp-gen-vid-btn');
  const status = document.getElementById('cp-vid-status');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:14px;height:14px"></div> A gerar…';

  const hasFalAi  = !!Config.get('FAL_AI');
  const modelName = hasFalAi ? (Config.get('VIDEO_MODEL') || 'Wan 2.6') : 'Veo 2';

  let dots = 0;
  const ticker = setInterval(() => {
    dots = (dots % 3) + 1;
    status.textContent = `A gerar vídeo com ${modelName}${'…'.slice(0, dots)} (pode demorar alguns minutos)`;
  }, 800);

  try {
    const result = await Gemini.generateVideo(prompt, {
      aspectRatio,
      onProgress: (step, total) => {
        const pct = Math.round((step / total) * 100);
        status.textContent = `A processar vídeo… ${pct}%`;
      }
    });

    if (result.isExternal) {
      // URL pública do fal.ai
      _criarState.videoExternalUrl = result.url;
      _criarState.videoDataUrl     = null;
      setPreviewVideo(result.url);
    } else {
      // data URL do Veo 2
      _criarState.videoDataUrl     = result.url;
      _criarState.videoExternalUrl = null;
      setPreviewVideo(result.url);
    }
    app.toast('Vídeo gerado!', 'success');
    status.textContent = '';
  } catch (e) {
    app.toast('Erro no vídeo: ' + e.message, 'error');
    status.textContent = 'Erro: ' + e.message;
  } finally {
    clearInterval(ticker);
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-film"></i> Gerar vídeo com IA';
  }
}

function uploadVideo(input) {
  const file = input.files[0];
  if (!file) return;
  const MAX_MB = 100;
  if (file.size > MAX_MB * 1024 * 1024) {
    app.toast(`Vídeo demasiado grande (máx. ${MAX_MB} MB)`, 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    _criarState.videoDataUrl     = e.target.result;
    _criarState.videoExternalUrl = null;
    setPreviewVideo(e.target.result);
    app.toast('Vídeo carregado!', 'success');
  };
  reader.readAsDataURL(file);
}

function setPreviewVideo(src) {
  const box  = document.getElementById('cp-vid-preview');
  const prev = document.getElementById('cp-preview-img');
  if (box) {
    box.className = 'video-preview-box has-video';
    box.innerHTML = `<video src="${src}" autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover"></video>`;
  }
  if (prev) prev.innerHTML = `<video src="${src}" autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover"></video>`;
}

function setPreviewImage(src) {
  const box  = document.getElementById('cp-img-preview');
  const prev = document.getElementById('cp-preview-img');
  if (box) {
    box.className = 'image-preview-box has-image';
    box.innerHTML = `<img src="${src}" alt="preview">`;
  }
  if (prev) prev.innerHTML = `<img src="${src}" alt="preview" style="width:100%;height:100%;object-fit:cover">`;
}

async function savePost(forceStatus) {
  const caption   = document.getElementById('cp-caption').value.trim();
  const hashtags  = document.getElementById('cp-hashtags').value.trim();
  const schedule  = document.getElementById('cp-schedule').value;
  const status    = forceStatus || document.getElementById('cp-status').value;
  const platforms = getSelectedPlatforms();
  const avatar    = app.getActiveAvatar();

  if (!caption) { app.toast('Adiciona uma legenda ao post', 'warning'); return; }
  if (!platforms.length) { app.toast('Seleciona pelo menos uma plataforma', 'warning'); return; }

  const isVideo = _criarState.contentType === 'video';
  let imageUrl = null;
  let videoUrl = null;

  if (!isVideo && _criarState.imageDataUrl && DB.ready()) {
    const statusEl = document.getElementById('cp-img-status');
    if (statusEl) statusEl.textContent = 'A guardar imagem…';
    const { url, error: uploadErr } = await DB.uploadPostImage(_criarState.imageDataUrl, `post-${Date.now()}`);
    if (uploadErr) app.toast('Aviso: imagem não guardada no Storage', 'warning');
    else imageUrl = url;
    if (statusEl) statusEl.textContent = '';
  }

  if (isVideo && DB.ready()) {
    const statusEl = document.getElementById('cp-vid-status');
    if (_criarState.videoExternalUrl) {
      // Guardar URL do fal.ai directamente (ou fazer upload)
      if (statusEl) statusEl.textContent = 'A guardar vídeo do fal.ai…';
      const { url, error: uploadErr } = await DB.uploadPostVideoFromUrl(_criarState.videoExternalUrl, `post-${Date.now()}`);
      if (uploadErr) {
        // Se upload falhar, usar a URL directa como fallback
        videoUrl = _criarState.videoExternalUrl;
        app.toast('Aviso: vídeo guardado como URL directa', 'warning');
      } else {
        videoUrl = url;
      }
      if (statusEl) statusEl.textContent = '';
    } else if (_criarState.videoDataUrl) {
      if (statusEl) statusEl.textContent = 'A guardar vídeo…';
      const { url, error: uploadErr } = await DB.uploadPostVideo(_criarState.videoDataUrl, `post-${Date.now()}`);
      if (uploadErr) app.toast('Aviso: vídeo não guardado no Storage', 'warning');
      else videoUrl = url;
      if (statusEl) statusEl.textContent = '';
    }
  }

  const post = {
    avatar_id:      avatar?.id || null,
    legenda:        caption,
    hashtags,
    plataformas:    platforms,
    status,
    agendado_para:  schedule ? new Date(schedule).toISOString() : null,
    imagem_url:     imageUrl,
    video_url:      videoUrl,
    tipo_conteudo:  isVideo ? 'video' : 'imagem',
    criado_em:      new Date().toISOString(),
  };

  if (DB.ready()) {
    const { error } = await DB.upsertPost(post);
    if (error) { app.toast('Erro ao guardar: ' + error, 'error'); return; }
  }

  app.toast(status === 'rascunho' ? 'Rascunho guardado!' : 'Post agendado!', 'success');
  setTimeout(() => app.navigate('fila'), 800);
}

function togglePlatformModal(el) {
  const p = el.dataset.p;
  const wasActive = el.classList.contains('active');
  el.classList.toggle('active', !wasActive);
  if (!wasActive) el.classList.add(p); else el.classList.remove(p);
}
