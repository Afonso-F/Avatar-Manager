/* ============================================================
   config.js — API keys e configurações (localStorage)
   ============================================================ */
const Config = (() => {
  const KEYS = {
    GEMINI:      'as_gemini_key',
    SUPABASE_URL:'as_supabase_url',
    SUPABASE_KEY:'as_supabase_key',
    INSTAGRAM:   'as_instagram_token',
    TIKTOK:      'as_tiktok_token',
    FACEBOOK:    'as_facebook_token',
    YOUTUBE:     'as_youtube_token',
    ACTIVE_AVATAR:'as_active_avatar',
  };

  function get(key) {
    return localStorage.getItem(KEYS[key]) || '';
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
    return !!(get('GEMINI') && get('SUPABASE_URL') && get('SUPABASE_KEY'));
  }

  return { get, set, getAll, isReady, KEYS };
})();
