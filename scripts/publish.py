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
YOUTUBE_TOKEN   = os.environ.get('YOUTUBE_TOKEN', '')
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
    data = {'status': status}
    if error:
        data['error_msg'] = str(error)[:500]
    supabase.table('posts').update(data).eq('id', post_id).execute()
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

    GRAPH    = 'https://graph.facebook.com/v19.0'
    caption  = post.get('legenda', '')
    hashtags = post.get('hashtags', '')
    full_cap = f"{caption}\n\n{hashtags}".strip()
    img_url  = post.get('imagem_url')
    vid_url  = post.get('video_url')

    # Obter IG Business User ID
    me_r = requests.get(f'{GRAPH}/me', params={'fields': 'id', 'access_token': INSTAGRAM_TOKEN}, timeout=15)
    if not me_r.ok:
        log.error(f"Instagram /me: {me_r.status_code} {me_r.text}")
        return False
    ig_user_id = me_r.json().get('id')
    if not ig_user_id:
        log.error(f"Instagram: sem user ID na resposta: {me_r.json()}")
        return False

    # Step 1: criar media container
    if vid_url:
        # Reels
        params = {
            'media_type':    'REELS',
            'video_url':     vid_url,
            'caption':       full_cap,
            'share_to_feed': 'true',
            'access_token':  INSTAGRAM_TOKEN,
        }
    elif img_url:
        params = {
            'image_url':    img_url,
            'caption':      full_cap,
            'access_token': INSTAGRAM_TOKEN,
        }
    else:
        log.warning("Post Instagram sem imagem ou vídeo — a saltar")
        return False

    r = requests.post(f'{GRAPH}/{ig_user_id}/media', data=params, timeout=30)
    if not r.ok:
        log.error(f"Instagram media create: {r.status_code} {r.text}")
        return False

    creation_id = r.json().get('id')
    if not creation_id:
        log.error(f"Instagram: sem creation_id na resposta: {r.json()}")
        return False

    # Step 2: publicar
    r2 = requests.post(
        f'{GRAPH}/{ig_user_id}/media_publish',
        data={'creation_id': creation_id, 'access_token': INSTAGRAM_TOKEN},
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
    """TikTok Content Posting API v2 — suporta vídeo e foto."""
    if not TIKTOK_TOKEN:
        log.warning("TikTok token não configurado — a saltar")
        return False

    caption  = post.get('legenda', '')
    hashtags = post.get('hashtags', '')
    title    = f"{caption} {hashtags}".strip()[:2200]
    vid_url  = post.get('video_url')
    img_url  = post.get('imagem_url')

    headers = {
        'Authorization': f'Bearer {TIKTOK_TOKEN}',
        'Content-Type':  'application/json; charset=UTF-8',
    }

    if vid_url:
        # Vídeo via URL
        payload = {
            'post_info': {
                'title':                    title,
                'privacy_level':            'PUBLIC_TO_EVERYONE',
                'disable_duet':             False,
                'disable_comment':          False,
                'disable_stitch':           False,
                'video_cover_timestamp_ms': 1000,
            },
            'source_info': {
                'source':    'PULL_FROM_URL',
                'video_url': vid_url,
            },
        }
        endpoint = 'https://open.tiktokapis.com/v2/post/publish/video/init/'
    elif img_url:
        # Foto
        payload = {
            'post_info': {
                'title':                title,
                'privacy_level':        'PUBLIC_TO_EVERYONE',
                'disable_duet':         False,
                'disable_comment':      False,
                'disable_stitch':       False,
                'brand_content_toggle': False,
                'brand_organic_toggle': False,
            },
            'source_info': {
                'source':            'PULL_FROM_URL',
                'photo_cover_index': 0,
                'photo_images':      [img_url],
                'post_mode':         'DIRECT_POST',
                'media_type':        'PHOTO',
            },
        }
        endpoint = 'https://open.tiktokapis.com/v2/post/publish/content/init/'
    else:
        log.warning("TikTok: post sem imagem ou vídeo — a saltar")
        return False

    r = requests.post(endpoint, headers=headers, json=payload, timeout=30)
    if not r.ok:
        log.error(f"TikTok: {r.status_code} {r.text}")
        return False

    data     = r.json()
    err_code = data.get('error', {}).get('code', '')
    if err_code not in ('ok', ''):
        log.error(f"TikTok API error: {data.get('error')}")
        return False

    publish_id = data.get('data', {}).get('publish_id')
    log.info(f"TikTok publicado: {publish_id}")
    save_published(post, 'tiktok', social_id=publish_id)
    return True


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


def publish_youtube(post: dict) -> bool:
    """YouTube Data API v3 — Resumable video upload."""
    if not YOUTUBE_TOKEN:
        log.warning("YouTube token não configurado — a saltar")
        return False

    video_url = post.get('video_url')
    if not video_url:
        log.warning("YouTube: post sem URL de conteúdo — a saltar")
        return False

    caption     = post.get('legenda', '')
    hashtags    = post.get('hashtags', '')
    title       = caption[:100] or 'Novo vídeo'
    description = f"{caption}\n\n{hashtags}".strip()

    # Descarregar conteúdo
    try:
        content_r = requests.get(video_url, timeout=60)
        content_r.raise_for_status()
    except Exception as e:
        log.error(f"YouTube: erro a descarregar conteúdo: {e}")
        return False

    content_type = content_r.headers.get('Content-Type', 'video/mp4')
    content_data = content_r.content

    # Step 1: iniciar upload resumível
    init_headers = {
        'Authorization':          f'Bearer {YOUTUBE_TOKEN}',
        'Content-Type':           'application/json; charset=UTF-8',
        'X-Upload-Content-Type':  content_type,
        'X-Upload-Content-Length': str(len(content_data)),
    }
    metadata = {
        'snippet': {
            'title':       title,
            'description': description,
            'categoryId':  '22',   # People & Blogs
        },
        'status': {'privacyStatus': 'public'},
    }
    init_r = requests.post(
        'https://www.googleapis.com/upload/youtube/v3/videos'
        '?uploadType=resumable&part=snippet,status',
        headers=init_headers, json=metadata, timeout=30
    )
    if not init_r.ok:
        log.error(f"YouTube init: {init_r.status_code} {init_r.text}")
        return False

    upload_url = init_r.headers.get('Location')
    if not upload_url:
        log.error("YouTube: sem URL de upload na resposta")
        return False

    # Step 2: enviar conteúdo
    upload_r = requests.put(
        upload_url,
        data=content_data,
        headers={'Content-Type': content_type},
        timeout=120
    )
    if upload_r.status_code not in (200, 201):
        log.error(f"YouTube upload: {upload_r.status_code} {upload_r.text}")
        return False

    video_id = upload_r.json().get('id')
    url      = f"https://www.youtube.com/watch?v={video_id}"
    log.info(f"YouTube publicado: {video_id}")
    save_published(post, 'youtube', social_id=video_id, url=url)
    return True


PUBLISHERS = {
    'instagram': publish_instagram,
    'tiktok':    publish_tiktok,
    'facebook':  publish_facebook,
    'youtube':   publish_youtube,
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
    if errors > 0:
        log.warning(
            f"{errors} post(s) não publicados — marcados como 'erro' na base de dados. "
            "Verifica se os tokens (INSTAGRAM_TOKEN, TIKTOK_TOKEN, etc.) estão configurados."
        )
    sys.exit(1 if errors > 0 else 0)


if __name__ == '__main__':
    main()
