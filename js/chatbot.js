/* ============================================================
   chatbot.js — Assistente IA do ContentHub (via Mistral)
   ============================================================ */
const Chatbot = (() => {
  const SYSTEM = `És o assistente IA integrado no ContentHub, uma plataforma de gestão de conteúdo para criadores digitais.

Ajudas o utilizador a navegar na app, criar conteúdos e responder a perguntas.

Quando precisares de executar uma ação na app, inclui NO FIM da tua resposta um bloco assim:
\`\`\`actions
[{"action": "navigate", "section": "criar"}]
\`\`\`

Secções disponíveis:
- dashboard — visão geral e métricas
- avatares — gerir perfis de criadores
- youtube — canais de vídeo
- musicos — músicos e bandas
- criar — criar novo post com IA
- fila — posts agendados
- publicados — posts já publicados
- biblioteca — biblioteca de media
- campanhas — campanhas de marketing
- analises — análises e relatórios
- monetizacao — receitas e monetização
- despesas — controlo de despesas
- configuracoes — API keys e integrações

Ações disponíveis:
- navigate(section) — navega para uma secção
- toast(message, type) — notificação (type: success/error/info/warning)

Regras:
- Responde SEMPRE em português de Portugal
- Sê conciso (máximo 3 frases)
- Se o utilizador pedir "ir para", "abrir", "mostrar" algo → usa navigate
- Não incluas o bloco actions se não houver ação para executar`;

  let _open = false;
  const _history = [];

  /* ── Init ── */
  function init() {
    _buildUI();
  }

  function _buildUI() {
    // Floating button
    const btn = document.createElement('button');
    btn.id = 'chatbot-btn';
    btn.className = 'chatbot-btn';
    btn.title = 'Assistente IA';
    btn.innerHTML = '<i class="fa-solid fa-robot"></i>';
    btn.onclick = toggle;
    document.body.appendChild(btn);

    // Chat panel
    const panel = document.createElement('div');
    panel.id = 'chatbot-panel';
    panel.className = 'chatbot-panel';
    panel.innerHTML = `
      <div class="chatbot-header">
        <div class="chatbot-title">
          <i class="fa-solid fa-robot"></i>
          <span>Assistente IA</span>
          <span class="chatbot-badge">Mistral</span>
        </div>
        <button class="chatbot-close" onclick="Chatbot.toggle()">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="chatbot-messages" id="chatbot-messages">
        <div class="chatbot-msg assistant">
          <div class="chatbot-bubble">
            Olá! Sou o teu assistente IA.<br>
            Posso ajudar-te a <strong>navegar</strong>, <strong>criar posts</strong> e responder a perguntas sobre o ContentHub.<br><br>
            Exemplos:<br>
            • "Vai para as análises"<br>
            • "Cria um post"<br>
            • "O que posso fazer aqui?"
          </div>
        </div>
      </div>
      <div class="chatbot-suggestions" id="chatbot-suggestions">
        <button class="chatbot-suggestion" onclick="Chatbot.quickSend('Vai para o dashboard')">Dashboard</button>
        <button class="chatbot-suggestion" onclick="Chatbot.quickSend('Cria um novo post')">Criar post</button>
        <button class="chatbot-suggestion" onclick="Chatbot.quickSend('Mostra as análises')">Análises</button>
      </div>
      <div class="chatbot-input-area">
        <input class="chatbot-input" id="chatbot-input" placeholder="Escreve uma mensagem…" autocomplete="off" />
        <button class="chatbot-send" id="chatbot-send" onclick="Chatbot.send()">
          <i class="fa-solid fa-paper-plane"></i>
        </button>
      </div>
    `;
    document.body.appendChild(panel);

    document.getElementById('chatbot-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) send();
    });
  }

  /* ── Toggle panel ── */
  function toggle() {
    _open = !_open;
    const panel = document.getElementById('chatbot-panel');
    const btn   = document.getElementById('chatbot-btn');
    if (panel) panel.classList.toggle('open', _open);
    if (btn)   btn.classList.toggle('active', _open);
    if (_open) setTimeout(() => document.getElementById('chatbot-input')?.focus(), 150);
  }

  /* ── Quick send from suggestion chips ── */
  function quickSend(text) {
    const input = document.getElementById('chatbot-input');
    if (input) input.value = text;
    // Hide suggestions after first use
    const sug = document.getElementById('chatbot-suggestions');
    if (sug) sug.style.display = 'none';
    send();
  }

  /* ── Send message ── */
  async function send() {
    const input = document.getElementById('chatbot-input');
    const text  = input?.value.trim();
    if (!text) return;

    input.value = '';
    const sug = document.getElementById('chatbot-suggestions');
    if (sug) sug.style.display = 'none';

    _appendMsg('user', text);
    _history.push({ role: 'user', content: text });

    _appendTyping();
    const sendBtn = document.getElementById('chatbot-send');
    if (sendBtn) sendBtn.disabled = true;

    try {
      const raw             = await _callMistral();
      const { reply, actions } = _parseResponse(raw);

      _removeTyping();
      _history.push({ role: 'assistant', content: raw });
      _appendMsg('assistant', reply);

      for (const action of actions) {
        await _executeAction(action);
      }
    } catch (e) {
      _removeTyping();
      _appendMsg('assistant', `Erro ao contactar Mistral: ${e.message}. Verifica a tua API key nas Configurações.`);
    } finally {
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  /* ── Call Mistral API ── */
  async function _callMistral() {
    const key = Config.get('MISTRAL');
    if (!key) throw new Error('API key não configurada');

    // Inject live context about avatares
    const avatares = (typeof app !== 'undefined' && app.getAvatares?.()) || [];
    let systemWithCtx = SYSTEM;
    if (avatares.length) {
      systemWithCtx += `\n\nAvatares no sistema: ${avatares.map(a => `${a.nome} (${a.nicho})`).join(', ')}`;
    }

    const messages = [
      { role: 'system', content: systemWithCtx },
      ..._history,
    ];

    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model:       'mistral-small-latest',
        messages,
        temperature: 0.65,
        max_tokens:  400,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || '';
  }

  /* ── Parse response: extract text + actions ── */
  function _parseResponse(raw) {
    const match = raw.match(/```actions\n([\s\S]*?)\n```/);
    let actions = [];
    let reply   = raw;

    if (match) {
      try { actions = JSON.parse(match[1]); } catch (_) {}
      reply = raw.replace(/```actions\n[\s\S]*?\n```/g, '').trim();
    }
    return { reply, actions };
  }

  /* ── Execute app actions ── */
  async function _executeAction(action) {
    switch (action.action) {
      case 'navigate':
        if (action.section && typeof app !== 'undefined') {
          setTimeout(() => app.navigate(action.section), 300);
        }
        break;
      case 'toast':
        if (typeof app !== 'undefined') {
          app.toast(action.message || '', action.type || 'info');
        }
        break;
    }
  }

  /* ── DOM helpers ── */
  function _appendMsg(role, text) {
    const msgs = document.getElementById('chatbot-messages');
    if (!msgs) return;
    const div = document.createElement('div');
    div.className = `chatbot-msg ${role}`;
    div.innerHTML = `<div class="chatbot-bubble">${_sanitize(text)}</div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function _appendTyping() {
    const msgs = document.getElementById('chatbot-messages');
    if (!msgs) return;
    const div = document.createElement('div');
    div.id = 'chatbot-typing';
    div.className = 'chatbot-msg assistant';
    div.innerHTML = `
      <div class="chatbot-bubble chatbot-typing-indicator">
        <span></span><span></span><span></span>
      </div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function _removeTyping() {
    document.getElementById('chatbot-typing')?.remove();
  }

  /* Basic sanitize + light markdown */
  function _sanitize(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background:var(--bg-elevated);padding:1px 4px;border-radius:3px">$1</code>')
      .replace(/\n/g, '<br>');
  }

  return { init, toggle, send, quickSend };
})();

document.addEventListener('DOMContentLoaded', () => Chatbot.init());
