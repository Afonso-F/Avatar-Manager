#!/usr/bin/env python3
"""
AvatarStudio — Script de publicação automática
Corre via GitHub Actions a cada hora para publicar posts agendados.

Variáveis de ambiente necessárias (GitHub Secrets):
  GEMINI_API_KEY, SUPABASE_URL, SUPABASE_KEY,
  INSTAGRAM_TOKEN, TIKTOK_TOKEN, FACEBOOK_TOKEN, YOUTUBE_TOKEN
"""
import os
import sys
import logging
import requests
from datetime import datetime, timezone
from supabase import create_client

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
log = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────
SUPABASE_URL  = os.environ['SUPABASE_URL']
SUPABASE_KEY  = os.environ['SUPABASE_KEY']
INSTAGRAM_TOKEN = os.environ.get('INSTAGRAM_TOKEN', '')
TIKTOK_TOKEN    = os.environ.get('TIKTOK_TOKEN', '')
FACEBOOK_TOKEN  = os.environ.get('FACEBOOK_TOKEN', '')
DRY_RUN         = os.environ.get('DRY_RUN', 'false').lower() == 'true'

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def get_due_posts():
    """Busca posts agendados com data <= agora."""
    now = datetime.now(timezone.utc).isoformat()
    res = (supabase.table('posts')
           .select('*, avatares(nome, nicho, prompt_base)')
           .eq('status', 'agendado')
           .lte('agendado_para', now)
           .order('agendado_para')
           .limit(20)
           .execute())
    return res.data or []


def mark_post(post_id: str, status: str, error: str = None):
    supabase.table('posts').update({
        'status': status,
        'atualizado_em': datetime.now(timezone.utc).isoformat(),
    }).eq('id', post_id).execute()
    log.info(f"Post {post_id} → {status}" + (f" ({error})" if error else ""))


def save_published(post, platform: str, social_id: str = None, url: str = None):
    supabase.table('publicados').insert({
        'post_id':        post['id'],
        'avatar_id':      post.get('avatar_id'),
        'plataforma':     platform,
        'publicado_em':   datetime.now(timezone.utc).isoformat(),
        'post_id_social': social_id,
        'url_post':       url,
        'likes':          0,
        'comentarios':    0,
        'visualizacoes':  0,
    }).execute()


# ── Publishers ────────────────────────────────────────────────

def publish_instagram(post: dict) -> bool:
    if not INSTAGRAM_TOKEN:
        log.warning("Instagram token não configurado — a saltar")
        return False

    caption  = post.get('legenda', '')
    hashtags = post.get('hashtags', '')
    full_cap = f"{caption}\n\n{hashtags}".strip()
    img_url  = post.get('imagem_url')

    # Step 1: criar container
    params = {'caption': full_cap, 'access_token': INSTAGRAM_TOKEN}
    if img_url:
        params['image_url'] = img_url
        params['media_type'] = 'IMAGE'
    else:
        # Story sem imagem não é permitido — cria post de texto
        log.warning("Post Instagram sem imagem — a usar placeholder")
        return False

    r = requests.post('https://graph.instagram.com/v19.0/me/media', params=params, timeout=30)
    if not r.ok:
        log.error(f"Instagram media create: {r.status_code} {r.text}")
        return False

    media_id = r.json().get('id')

    # Step 2: publicar
    r2 = requests.post(
        'https://graph.instagram.com/v19.0/me/media_publish',
        params={'creation_id': media_id, 'access_token': INSTAGRAM_TOKEN},
        timeout=30
    )
    if not r2.ok:
        log.error(f"Instagram publish: {r2.status_code} {r2.text}")
        return False

    post_id = r2.json().get('id')
    log.info(f"Instagram publicado: {post_id}")
    save_published(post, 'instagram', social_id=post_id)
    return True


def publish_tiktok(post: dict) -> bool:
    if not TIKTOK_TOKEN:
        log.warning("TikTok token não configurado — a saltar")
        return False
    # TikTok Content Posting API (v2)
    # Necessita de implementação completa conforme documentação oficial
    log.info("TikTok: publicação via API ainda não implementada neste script")
    return False


def publish_facebook(post: dict) -> bool:
    if not FACEBOOK_TOKEN:
        log.warning("Facebook token não configurado — a saltar")
        return False

    caption  = post.get('legenda', '')
    hashtags = post.get('hashtags', '')
    message  = f"{caption}\n\n{hashtags}".strip()
    img_url  = post.get('imagem_url')

    if img_url:
        r = requests.post('https://graph.facebook.com/v19.0/me/photos', params={
            'url': img_url, 'caption': message, 'access_token': FACEBOOK_TOKEN
        }, timeout=30)
    else:
        r = requests.post('https://graph.facebook.com/v19.0/me/feed', params={
            'message': message, 'access_token': FACEBOOK_TOKEN
        }, timeout=30)

    if not r.ok:
        log.error(f"Facebook: {r.status_code} {r.text}")
        return False

    post_id = r.json().get('id')
    log.info(f"Facebook publicado: {post_id}")
    save_published(post, 'facebook', social_id=post_id)
    return True


PUBLISHERS = {
    'instagram': publish_instagram,
    'tiktok':    publish_tiktok,
    'facebook':  publish_facebook,
}


# ── Main ──────────────────────────────────────────────────────

def main():
    posts = get_due_posts()
    log.info(f"Posts para publicar: {len(posts)}" + (" [DRY RUN]" if DRY_RUN else ""))

    published = 0
    errors    = 0

    for post in posts:
        post_id   = post['id']
        platforms = post.get('plataformas') or []
        log.info(f"Post {post_id}: plataformas={platforms}")

        if DRY_RUN:
            log.info(f"  [DRY RUN] Não publicado: {post.get('legenda', '')[:60]}…")
            continue

        success_platforms = []
        for platform in platforms:
            publisher = PUBLISHERS.get(platform)
            if not publisher:
                log.warning(f"Plataforma '{platform}' não suportada")
                continue
            try:
                ok = publisher(post)
                if ok:
                    success_platforms.append(platform)
            except Exception as e:
                log.error(f"Erro a publicar em {platform}: {e}")
                errors += 1

        if success_platforms:
            mark_post(post_id, 'publicado')
            published += 1
        else:
            if platforms:  # só marca erro se havia plataformas para publicar
                mark_post(post_id, 'erro', 'Sem plataformas com sucesso')
                errors += 1

    log.info(f"Resultado: {published} publicados, {errors} erros")
    sys.exit(1 if errors > 0 and published == 0 else 0)


if __name__ == '__main__':
    main()
