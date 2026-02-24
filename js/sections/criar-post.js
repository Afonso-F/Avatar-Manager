/* ============================================================
   sections/criar-post.js
   ============================================================ */
let _criarState = {
  imageDataUrl: null,
  imagePromptUsed: null,
};

async function renderCriarPost(container) {
  // Load avatares
  let avatares = app.getAvatares();
  if (!avatares.length && DB.ready()) {
    const { data } = await DB.getAvatares();
    avatares = data || [];
    app.setAvatares(avatares);
  }
  if (!avatares.length) avatares = [{ id: 'local', nome: 'Avatar genérico', nicho: 'Geral', emoji: '🎭', plataformas: ['instagram'] }];

  const activeAvatar = app.getActiveAvatar() || avatares[0];
  _criarState.imageDataUrl = null;

  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Criar Post</div>
        <div class="section-subtitle">Gera conteúdo com IA e agenda para as tuas plataformas</div>
      </div>
    </div>

    <div class="two-col-layout">
      <!-- Left: form -->
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

        <!-- Topic -->
        <div class="card">
          <div class="card-title mb-2">Tema do post</div>
          <div class="form-group mb-1">
            <input id="cp-topic" class="form-control" placeholder="Ex: 5 dicas para dormir melhor…">
          </div>
          <button class="btn btn-secondary btn-sm" onclick="generateAll()">
            <i class="fa-solid fa-wand-magic-sparkles"></i> Gerar tudo com IA
          </button>
        </div>

        <!-- Caption -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Legenda</div>
            <button class="btn btn-sm btn-ghost" onclick="generateCaption()"><i class="fa-solid fa-rotate"></i> Gerar</button>
          </div>
          <textarea id="cp-caption" class="form-control mt-0" rows="5" placeholder="A legenda do post aparece aqui…"></textarea>
          <div id="cp-caption-count" class="text-sm text-muted mt-1">0 caracteres</div>
        </div>

        <!-- Hashtags -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Hashtags</div>
            <button class="btn btn-sm btn-ghost" onclick="generateHashtags()"><i class="fa-solid fa-rotate"></i> Gerar</button>
          </div>
          <textarea id="cp-hashtags" class="form-control mt-0" rows="3" placeholder="#hashtag1 #hashtag2 …"></textarea>
        </div>

        <!-- Platforms -->
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

        <!-- Schedule -->
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

        <!-- Actions -->
        <div class="flex gap-1">
          <button class="btn btn-secondary flex-1" onclick="savePost('rascunho')">
            <i class="fa-regular fa-floppy-disk"></i> Guardar rascunho
          </button>
          <button class="btn btn-primary flex-1" onclick="savePost()">
            <i class="fa-solid fa-calendar-plus"></i> Agendar post
          </button>
        </div>
      </div>

      <!-- Right: image panel -->
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <div class="card-header">
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

        <!-- Preview card -->
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

  // Live preview listeners
  document.getElementById('cp-caption').addEventListener('input', e => {
    document.getElementById('cp-preview-caption').textContent = e.target.value || 'A legenda aparece aqui…';
    document.getElementById('cp-caption-count').textContent = `${e.target.value.length} caracteres`;
  });
}

function defaultSchedule() {
  const d = new Date();
  d.setHours(d.getHours() + 2, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

function getSelectedAvatarId() {
  const el = document.querySelector('#cp-platforms')?.closest('.content')?.querySelector('[id^="av-sel-"].active');
  // fallback
  return app.getActiveAvatar()?.id;
}

function selectAvatar(id) {
  document.querySelectorAll('[id^="av-sel-"]').forEach(el => {
    el.classList.remove('active', 'instagram');
  });
  const el = document.getElementById(`av-sel-${id}`);
  if (el) { el.classList.add('active', 'instagram'); }

  Config.set('ACTIVE_AVATAR', id);
  const a = app.getAvatares().find(x => String(x.id) === String(id));
  if (!a) return;

  // Update preview name
  const pname = document.getElementById('cp-preview-name');
  if (pname) pname.textContent = a.nome;

  // Update platform toggles
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
  const btn    = document.querySelector('[onclick="generateCaption()"]');
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:14px;height:14px"></div>'; }
  try {
    const text = await Gemini.generateCaption(avatar, topic);
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
    app.toast('Imagem carregada!', 'success');
  };
  reader.readAsDataURL(file);
}

function setPreviewImage(src) {
  const box   = document.getElementById('cp-img-preview');
  const prev  = document.getElementById('cp-preview-img');
  box.className = 'image-preview-box has-image';
  box.innerHTML = `<img src="${src}" alt="preview">`;
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

  // Upload imagem para Supabase Storage se existir
  let imageUrl = null;
  if (_criarState.imageDataUrl && DB.ready()) {
    const statusEl = document.getElementById('cp-img-status');
    if (statusEl) statusEl.textContent = 'A guardar imagem…';
    const { url, error: uploadErr } = await DB.uploadPostImage(_criarState.imageDataUrl, `post-${Date.now()}`);
    if (uploadErr) {
      app.toast('Aviso: imagem não guardada no Storage', 'warning');
    } else {
      imageUrl = url;
    }
    if (statusEl) statusEl.textContent = '';
  }

  const post = {
    avatar_id:     avatar?.id || null,
    legenda:       caption,
    hashtags:      hashtags,
    plataformas:   platforms,
    status:        status,
    agendado_para: schedule ? new Date(schedule).toISOString() : null,
    imagem_url:    imageUrl,
    criado_em:     new Date().toISOString(),
  };

  if (DB.ready()) {
    const { error } = await DB.upsertPost(post);
    if (error) { app.toast('Erro ao guardar: ' + error, 'error'); return; }
  }

  app.toast(status === 'rascunho' ? 'Rascunho guardado!' : 'Post agendado!', 'success');
  setTimeout(() => app.navigate('fila'), 800);
}
