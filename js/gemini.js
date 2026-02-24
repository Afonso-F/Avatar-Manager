/* ============================================================
   gemini.js — Gemini API (texto + imagem via Imagen)
   ============================================================ */
const Gemini = (() => {
  const TEXT_MODEL  = 'gemini-1.5-flash';
  const IMAGE_MODEL = 'imagen-3.0-generate-001';
  const BASE        = 'https://generativelanguage.googleapis.com/v1beta';

  function key() { return Config.get('GEMINI'); }

  /* Gerar texto (legenda, hashtags, etc.) */
  async function generateText(prompt, { temperature = 0.8, maxTokens = 1024 } = {}) {
    if (!key()) throw new Error('Gemini API key não configurada.');
    const res = await fetch(`${BASE}/models/${TEXT_MODEL}:generateContent?key=${key()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature, maxOutputTokens: maxTokens }
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Erro ${res.status}`);
    }
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  /* Gerar imagem via Imagen */
  async function generateImage(prompt, { aspectRatio = '1:1' } = {}) {
    if (!key()) throw new Error('Gemini API key não configurada.');
    const res = await fetch(`${BASE}/models/${IMAGE_MODEL}:predict?key=${key()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio }
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Erro ${res.status}`);
    }
    const data = await res.json();
    const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
    const mime = data?.predictions?.[0]?.mimeType || 'image/png';
    if (!b64) throw new Error('Nenhuma imagem gerada.');
    return `data:${mime};base64,${b64}`;
  }

  /* Gerar legenda + hashtags para um avatar */
  async function generateCaption(avatar, topic) {
    const prompt = `
Tens o papel de ${avatar.nome}, um criador de conteúdo ${avatar.nicho}.
O teu estilo: ${avatar.prompt_base || 'criativo, envolvente, autêntico'}.

Cria uma legenda cativante para um post sobre: "${topic}"
- Tom: natural, humano, sem parecer gerado por IA
- Comprimento: 2-4 frases
- Inclui 1 chamada à ação subtil
- Devolve APENAS a legenda, sem aspas nem explicações
    `.trim();
    return generateText(prompt, { temperature: 0.9 });
  }

  async function generateHashtags(nicho, topic, count = 20) {
    const prompt = `
Gera ${count} hashtags relevantes para Instagram/TikTok sobre "${topic}" no nicho "${nicho}".
Mistura hashtags populares (>500k posts) e de nicho (<100k posts).
Formato: apenas as hashtags separadas por espaço, com #, sem texto extra.
    `.trim();
    return generateText(prompt, { temperature: 0.5 });
  }

  async function generateImagePrompt(avatar, topic) {
    const prompt = `
Cria um prompt em inglês para gerar uma imagem de redes sociais para ${avatar.nome} (${avatar.nicho}) sobre "${topic}".
- Estilo: fotografia profissional, alta qualidade, aesthetically pleasing
- Adequado para Instagram/TikTok
- Sem texto na imagem
- Máximo 100 palavras
- Devolve APENAS o prompt, sem explicações
    `.trim();
    return generateText(prompt, { temperature: 0.7 });
  }

  return { generateText, generateImage, generateCaption, generateHashtags, generateImagePrompt };
})();
