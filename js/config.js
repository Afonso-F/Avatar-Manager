/* ============================================================
   config.js — API keys e configurações (localStorage)
   ============================================================ */
const Config = (() => {
  const KEYS = {
    MISTRAL:       'as_mistral_key',
    SUPABASE_URL:  'as_supabase_url',
    SUPABASE_KEY:  'as_supabase_key',
    INSTAGRAM:     'as_instagram_token',
    TIKTOK:        'as_tiktok_token',
    FACEBOOK:      'as_facebook_token',
    YOUTUBE:       'as_youtube_token',
    ACTIVE_AVATAR: 'as_active_avatar',
    FANSLY:        'as_fansly_token',
    SPOTIFY:       'as_spotify_token',
    FAL_AI:        'as_fal_ai_key',
    VIDEO_MODEL:   'as_video_model',
  };

  // Valores pré-configurados (podem ser sobrescritos nas Configurações)
  const DEFAULTS = {
    SUPABASE_URL: 'https://fjbqaminivgcyzjrjqsb.supabase.co',
    SUPABASE_KEY: 'sb_publishable_ERR4k-d8X5sAohBSlxlptw_rfpTH2fb',
  };

  function get(key) {
    return localStorage.getItem(KEYS[key]) || DEFAULTS[key] || '';
  }

  function set(key, value) {
    localStorage.setItem(KEYS[key], value.trim());
  }

  function getAll() {
    const result = {};
    for (const k in KEYS) result[k] = get(k);
    return result;
  }

  function isReady() {
    return !!(get('MISTRAL') && get('SUPABASE_URL') && get('SUPABASE_KEY'));
  }

  return { get, set, getAll, isReady, KEYS };
})();
