#!/usr/bin/env python3
"""
Testes unitários para scripts/publish.py

Executa:
  python scripts/test_publish.py
  python -m pytest scripts/test_publish.py -v
"""
import os
import sys
import unittest
import importlib.util
from unittest.mock import MagicMock, patch, call

# ── Setup: variáveis de ambiente ───────────────────────────────────────────
os.environ.setdefault('SUPABASE_URL', 'https://test.supabase.co')
os.environ.setdefault('SUPABASE_KEY', 'test-key-xxx')

# Injectar um módulo supabase falso antes de importar publish.py
# (necessário quando as dependências nativas do supabase não estão disponíveis)
_mock_client = MagicMock()
_fake_supabase = MagicMock()
_fake_supabase.create_client.return_value = _mock_client
sys.modules.setdefault('supabase', _fake_supabase)

# Carregar publish.py como módulo isolado
_spec = importlib.util.spec_from_file_location(
    'publish',
    os.path.join(os.path.dirname(__file__), 'publish.py'),
)
pub = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(pub)


# ── Testes: mark_post() ────────────────────────────────────────────────────
class TestMarkPost(unittest.TestCase):

    def setUp(self):
        self.supa = MagicMock()
        pub.supabase = self.supa

    def test_marca_status_publicado(self):
        pub.mark_post('abc', 'publicado')
        self.supa.table.assert_called_with('posts')
        update = self.supa.table.return_value.update
        update.assert_called_once_with({'status': 'publicado'})

    def test_inclui_error_msg_quando_ha_erro(self):
        pub.mark_post('abc', 'erro', 'Token inválido')
        update = self.supa.table.return_value.update
        data = update.call_args[0][0]
        self.assertEqual(data['status'], 'erro')
        self.assertIn('error_msg', data)
        self.assertIn('Token inválido', data['error_msg'])

    def test_nao_inclui_error_msg_sem_erro(self):
        pub.mark_post('abc', 'publicado')
        update = self.supa.table.return_value.update
        data = update.call_args[0][0]
        self.assertNotIn('error_msg', data)

    def test_error_msg_truncado_a_500_chars(self):
        pub.mark_post('abc', 'erro', 'x' * 1000)
        data = self.supa.table.return_value.update.call_args[0][0]
        self.assertLessEqual(len(data['error_msg']), 500)

    def test_chama_eq_com_post_id(self):
        pub.mark_post('my-post-id', 'publicado')
        eq = self.supa.table.return_value.update.return_value.eq
        eq.assert_called_once_with('id', 'my-post-id')


# ── Testes: save_published() ───────────────────────────────────────────────
class TestSavePublished(unittest.TestCase):

    def setUp(self):
        self.supa = MagicMock()
        pub.supabase = self.supa

    def _inserted_data(self):
        return self.supa.table.return_value.insert.call_args[0][0]

    def test_insere_campos_obrigatorios(self):
        post = {'id': 'p1', 'avatar_id': 'av1'}
        pub.save_published(post, 'instagram', social_id='ig123', url='https://ig.com/p/1')
        data = self._inserted_data()
        self.assertEqual(data['post_id'],    'p1')
        self.assertEqual(data['avatar_id'],  'av1')
        self.assertEqual(data['plataforma'], 'instagram')
        self.assertEqual(data['post_id_social'], 'ig123')
        self.assertEqual(data['url_post'],   'https://ig.com/p/1')
        self.assertEqual(data['likes'],          0)
        self.assertEqual(data['comentarios'],     0)
        self.assertEqual(data['visualizacoes'],   0)

    def test_social_id_e_url_sao_opcionais(self):
        post = {'id': 'p2', 'avatar_id': 'av2'}
        pub.save_published(post, 'tiktok')
        data = self._inserted_data()
        self.assertIsNone(data['post_id_social'])
        self.assertIsNone(data['url_post'])

    def test_usa_avatar_id_do_post(self):
        post = {'id': 'p3', 'avatar_id': 'av-xyz'}
        pub.save_published(post, 'facebook')
        data = self._inserted_data()
        self.assertEqual(data['avatar_id'], 'av-xyz')

    def test_publicado_em_e_definido(self):
        post = {'id': 'p4', 'avatar_id': None}
        pub.save_published(post, 'youtube')
        data = self._inserted_data()
        self.assertIn('publicado_em', data)
        self.assertIsNotNone(data['publicado_em'])


# ── Testes: publish_instagram() ───────────────────────────────────────────
class TestPublishInstagram(unittest.TestCase):

    def setUp(self):
        pub.INSTAGRAM_TOKEN = ''

    def tearDown(self):
        pub.INSTAGRAM_TOKEN = ''

    def test_sem_token_retorna_false(self):
        result = pub.publish_instagram({'legenda': 'Teste', 'imagem_url': 'http://img.jpg'})
        self.assertFalse(result)

    def test_com_token_e_sem_media_retorna_false(self):
        pub.INSTAGRAM_TOKEN = 'valid-token'
        with patch('requests.get') as mock_get:
            mock_get.return_value = MagicMock(ok=True, json=lambda: {'id': 'ig_user_1'})
            result = pub.publish_instagram({'legenda': 'Teste'})
        self.assertFalse(result)

    def test_erro_na_chamada_me_retorna_false(self):
        pub.INSTAGRAM_TOKEN = 'valid-token'
        with patch('requests.get') as mock_get:
            mock_get.return_value = MagicMock(ok=False, status_code=401, text='Unauthorized')
            result = pub.publish_instagram({'legenda': 'Teste', 'imagem_url': 'http://img.jpg'})
        self.assertFalse(result)


# ── Testes: publish_tiktok() ───────────────────────────────────────────────
class TestPublishTikTok(unittest.TestCase):

    def setUp(self):
        pub.TIKTOK_TOKEN = ''

    def tearDown(self):
        pub.TIKTOK_TOKEN = ''

    def test_sem_token_retorna_false(self):
        result = pub.publish_tiktok({'legenda': 'Teste', 'imagem_url': 'http://img.jpg'})
        self.assertFalse(result)

    def test_sem_media_retorna_false(self):
        pub.TIKTOK_TOKEN = 'valid-token'
        result = pub.publish_tiktok({'legenda': 'Teste'})
        self.assertFalse(result)

    def test_caption_truncado_a_2200_chars(self):
        """O title enviado ao TikTok não deve exceder 2200 caracteres."""
        pub.TIKTOK_TOKEN = 'valid-token'
        long_caption = 'a' * 3000
        with patch('requests.post') as mock_post:
            mock_post.return_value = MagicMock(
                ok=True,
                json=lambda: {'error': {'code': 'ok'}, 'data': {'publish_id': 'tt1'}},
            )
            pub.supabase = MagicMock()
            pub.publish_tiktok({'id': 'p1', 'avatar_id': 'av1', 'legenda': long_caption, 'video_url': 'http://vid.mp4'})
            payload = mock_post.call_args[1]['json']
            self.assertLessEqual(len(payload['post_info']['title']), 2200)


# ── Testes: publish_facebook() ────────────────────────────────────────────
class TestPublishFacebook(unittest.TestCase):

    def setUp(self):
        pub.FACEBOOK_TOKEN = ''

    def tearDown(self):
        pub.FACEBOOK_TOKEN = ''

    def test_sem_token_retorna_false(self):
        result = pub.publish_facebook({'legenda': 'Teste'})
        self.assertFalse(result)

    def test_com_imagem_usa_endpoint_photos(self):
        pub.FACEBOOK_TOKEN = 'fb-token'
        pub.supabase = MagicMock()
        with patch('requests.post') as mock_post:
            mock_post.return_value = MagicMock(ok=True, json=lambda: {'id': 'fb123'})
            pub.publish_facebook({'id': 'p1', 'avatar_id': 'av1', 'legenda': 'Olá', 'imagem_url': 'http://img.jpg'})
            url = mock_post.call_args[0][0]
            self.assertIn('/photos', url)

    def test_sem_imagem_usa_endpoint_feed(self):
        pub.FACEBOOK_TOKEN = 'fb-token'
        pub.supabase = MagicMock()
        with patch('requests.post') as mock_post:
            mock_post.return_value = MagicMock(ok=True, json=lambda: {'id': 'fb456'})
            pub.publish_facebook({'id': 'p2', 'avatar_id': 'av1', 'legenda': 'Olá sem imagem'})
            url = mock_post.call_args[0][0]
            self.assertIn('/feed', url)


# ── Testes: publish_youtube() ─────────────────────────────────────────────
class TestPublishYouTube(unittest.TestCase):

    def setUp(self):
        pub.YOUTUBE_TOKEN = ''

    def tearDown(self):
        pub.YOUTUBE_TOKEN = ''

    def test_sem_token_retorna_false(self):
        result = pub.publish_youtube({'legenda': 'Teste', 'video_url': 'http://vid.mp4'})
        self.assertFalse(result)

    def test_sem_video_url_retorna_false(self):
        pub.YOUTUBE_TOKEN = 'yt-token'
        result = pub.publish_youtube({'legenda': 'Teste'})
        self.assertFalse(result)

    def test_titulo_truncado_a_100_chars(self):
        pub.YOUTUBE_TOKEN = 'yt-token'
        long_title = 'T' * 200
        with patch('requests.get') as mock_get, \
             patch('requests.post') as mock_post, \
             patch('requests.put') as mock_put:
            mock_get.return_value = MagicMock(ok=True, content=b'video-data',
                headers={'Content-Type': 'video/mp4'}, raise_for_status=lambda: None)
            mock_post.return_value = MagicMock(
                ok=True, headers={'Location': 'https://upload.googleapis.com/upload/abc'}
            )
            mock_put.return_value = MagicMock(
                status_code=200, json=lambda: {'id': 'yt-vid-id'}
            )
            pub.supabase = MagicMock()
            pub.publish_youtube({'id': 'p1', 'avatar_id': 'av1', 'legenda': long_title, 'video_url': 'http://vid.mp4'})
            metadata = mock_post.call_args[1]['json']
            self.assertLessEqual(len(metadata['snippet']['title']), 100)


# ── Testes: roteamento de plataformas ─────────────────────────────────────
class TestPlatformRouting(unittest.TestCase):

    def test_publishers_tem_as_4_plataformas(self):
        for platform in ('instagram', 'tiktok', 'facebook', 'youtube'):
            self.assertIn(platform, pub.PUBLISHERS)

    def test_publishers_apontam_para_funcoes_corretas(self):
        self.assertIs(pub.PUBLISHERS['instagram'], pub.publish_instagram)
        self.assertIs(pub.PUBLISHERS['tiktok'],    pub.publish_tiktok)
        self.assertIs(pub.PUBLISHERS['facebook'],  pub.publish_facebook)
        self.assertIs(pub.PUBLISHERS['youtube'],   pub.publish_youtube)


# ── Testes: main() em DRY_RUN ─────────────────────────────────────────────
class TestMainDryRun(unittest.TestCase):

    def setUp(self):
        self.supa = MagicMock()
        pub.supabase = self.supa
        pub.DRY_RUN  = True
        # Simular 1 post pronto a publicar
        mock_chain = (
            self.supa.table.return_value
            .select.return_value
            .eq.return_value
            .lte.return_value
            .order.return_value
            .limit.return_value
            .execute.return_value
        )
        mock_chain.data = [{
            'id': 'p1',
            'plataformas': ['instagram', 'tiktok'],
            'legenda': 'Teste DRY RUN',
            'avatar_id': 'av1',
        }]

    def tearDown(self):
        pub.DRY_RUN = False

    def test_nao_chama_nenhum_publisher(self):
        with patch.object(pub, 'publish_instagram') as mock_ig, \
             patch.object(pub, 'publish_tiktok') as mock_tt:
            try:
                pub.main()
            except SystemExit:
                pass
            mock_ig.assert_not_called()
            mock_tt.assert_not_called()

    def test_sai_com_codigo_0_sem_erros(self):
        with self.assertRaises(SystemExit) as cm:
            pub.main()
        self.assertEqual(cm.exception.code, 0)


class TestMainSemPosts(unittest.TestCase):

    def setUp(self):
        self.supa = MagicMock()
        pub.supabase = self.supa
        pub.DRY_RUN  = False
        mock_chain = (
            self.supa.table.return_value
            .select.return_value
            .eq.return_value
            .lte.return_value
            .order.return_value
            .limit.return_value
            .execute.return_value
        )
        mock_chain.data = []

    def test_sai_com_0_quando_sem_posts(self):
        with self.assertRaises(SystemExit) as cm:
            pub.main()
        self.assertEqual(cm.exception.code, 0)


if __name__ == '__main__':
    unittest.main(verbosity=2)
