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


# ── Testes: get_due_posts() ───────────────────────────────────────────────
class TestGetDuePosts(unittest.TestCase):

    def setUp(self):
        self.supa = MagicMock()
        pub.supabase = self.supa

    def _mock_chain(self, data):
        """Configura a cadeia de chamadas do Supabase para retornar data."""
        chain = (
            self.supa.table.return_value
            .select.return_value
            .eq.return_value
            .lte.return_value
            .order.return_value
            .limit.return_value
            .execute.return_value
        )
        chain.data = data
        return chain

    def test_filtra_por_status_agendado(self):
        self._mock_chain([])
        pub.get_due_posts()
        eq_call = self.supa.table.return_value.select.return_value.eq
        eq_call.assert_called_once_with('status', 'agendado')

    def test_limita_a_20_posts(self):
        self._mock_chain([])
        pub.get_due_posts()
        limit_call = (
            self.supa.table.return_value
            .select.return_value
            .eq.return_value
            .lte.return_value
            .order.return_value
            .limit
        )
        limit_call.assert_called_once_with(20)

    def test_ordena_por_agendado_para(self):
        self._mock_chain([])
        pub.get_due_posts()
        order_call = (
            self.supa.table.return_value
            .select.return_value
            .eq.return_value
            .lte.return_value
            .order
        )
        order_call.assert_called_once_with('agendado_para')

    def test_retorna_lista_vazia_quando_sem_posts(self):
        self._mock_chain([])
        result = pub.get_due_posts()
        self.assertEqual(result, [])

    def test_retorna_dados_quando_ha_posts(self):
        posts = [
            {'id': 'p1', 'status': 'agendado', 'plataformas': ['instagram']},
            {'id': 'p2', 'status': 'agendado', 'plataformas': ['tiktok']},
        ]
        self._mock_chain(posts)
        result = pub.get_due_posts()
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]['id'], 'p1')

    def test_retorna_lista_vazia_quando_data_e_none(self):
        chain = (
            self.supa.table.return_value
            .select.return_value
            .eq.return_value
            .lte.return_value
            .order.return_value
            .limit.return_value
            .execute.return_value
        )
        chain.data = None
        result = pub.get_due_posts()
        self.assertEqual(result, [])

    def test_consulta_tabela_posts(self):
        self._mock_chain([])
        pub.get_due_posts()
        self.supa.table.assert_called_with('posts')

    def test_seleciona_campos_com_join_avatares(self):
        self._mock_chain([])
        pub.get_due_posts()
        select_call = self.supa.table.return_value.select
        args = select_call.call_args[0][0]
        self.assertIn('avatares', args)
        self.assertIn('nome', args)


# ── Testes: main() — fluxo completo ──────────────────────────────────────
class TestMainPublishFlow(unittest.TestCase):

    def setUp(self):
        self.supa = MagicMock()
        pub.supabase = self.supa
        pub.DRY_RUN = False

    def tearDown(self):
        pub.DRY_RUN = False
        pub.INSTAGRAM_TOKEN = ''
        pub.TIKTOK_TOKEN = ''
        pub.FACEBOOK_TOKEN = ''
        pub.YOUTUBE_TOKEN = ''

    def _setup_posts(self, posts):
        chain = (
            self.supa.table.return_value
            .select.return_value
            .eq.return_value
            .lte.return_value
            .order.return_value
            .limit.return_value
            .execute.return_value
        )
        chain.data = posts

    def test_marca_erro_quando_todas_plataformas_falham(self):
        self._setup_posts([{
            'id': 'p1',
            'plataformas': ['instagram'],
            'legenda': 'Teste',
            'avatar_id': 'av1',
        }])
        pub.INSTAGRAM_TOKEN = ''  # token em falta → publish_instagram retorna False

        with self.assertRaises(SystemExit) as cm:
            pub.main()

        update_call = self.supa.table.return_value.update
        update_call.assert_called()
        data = update_call.call_args[0][0]
        self.assertEqual(data['status'], 'erro')
        # Sai com código 1 quando há erros e 0 publicados
        self.assertEqual(cm.exception.code, 1)

    def test_marca_publicado_quando_plataforma_tem_sucesso(self):
        self._setup_posts([{
            'id': 'p2',
            'plataformas': ['facebook'],
            'legenda': 'Olá',
            'avatar_id': 'av1',
            'imagem_url': 'https://img.jpg',
        }])
        pub.FACEBOOK_TOKEN = 'fb-token'

        with patch('requests.post') as mock_post:
            mock_post.return_value = MagicMock(ok=True, json=lambda: {'id': 'fb-post-123'})
            with self.assertRaises(SystemExit) as cm:
                pub.main()

        update_call = self.supa.table.return_value.update
        data = update_call.call_args[0][0]
        self.assertEqual(data['status'], 'publicado')
        self.assertEqual(cm.exception.code, 0)

    def test_plataforma_desconhecida_marca_erro_no_post(self):
        """Plataforma não suportada é ignorada mas o post é marcado como erro.

        Em main(): `if platforms:` verifica se havia plataformas na lista (mesmo
        que nenhuma seja suportada). Como success_platforms fica vazio, marca
        o post como 'erro' e incrementa errors → sys.exit(1).
        """
        self._setup_posts([{
            'id': 'p3',
            'plataformas': ['reddit'],  # não suportado
            'legenda': 'Teste',
            'avatar_id': 'av1',
        }])

        with self.assertRaises(SystemExit) as cm:
            pub.main()
        # platforms=['reddit'] é truthy → marca como erro → errors=1, published=0 → exit 1
        self.assertEqual(cm.exception.code, 1)

    def test_post_sem_plataformas_nao_marca_erro(self):
        self._setup_posts([{
            'id': 'p4',
            'plataformas': [],
            'legenda': 'Sem plataformas',
            'avatar_id': 'av1',
        }])

        with self.assertRaises(SystemExit) as cm:
            pub.main()

        # Post sem plataformas não chama mark_post com erro
        update_call = self.supa.table.return_value.update
        if update_call.called:
            data = update_call.call_args[0][0]
            self.assertNotEqual(data.get('status'), 'erro')


# ── Testes: publish_instagram() — fluxo completo ─────────────────────────
class TestPublishInstagramFullFlow(unittest.TestCase):

    def setUp(self):
        pub.INSTAGRAM_TOKEN = 'valid-token'
        pub.supabase = MagicMock()

    def tearDown(self):
        pub.INSTAGRAM_TOKEN = ''

    def test_post_com_imagem_cria_container_e_publica(self):
        post = {
            'id': 'p1', 'avatar_id': 'av1',
            'legenda': 'Foto linda', 'hashtags': '#teste',
            'imagem_url': 'https://img.jpg',
        }
        with patch('requests.get') as mock_get, patch('requests.post') as mock_post:
            mock_get.return_value = MagicMock(ok=True, json=lambda: {'id': 'ig_user_1'})
            mock_post.side_effect = [
                MagicMock(ok=True, json=lambda: {'id': 'creation_123'}),   # media container
                MagicMock(ok=True, json=lambda: {'id': 'ig_post_456'}),    # publish
            ]
            result = pub.publish_instagram(post)

        self.assertTrue(result)
        self.assertEqual(mock_post.call_count, 2)

    def test_post_com_video_usa_media_type_reels(self):
        post = {
            'id': 'p2', 'avatar_id': 'av1',
            'legenda': 'Reel', 'hashtags': '',
            'video_url': 'https://vid.mp4',
        }
        with patch('requests.get') as mock_get, patch('requests.post') as mock_post:
            mock_get.return_value = MagicMock(ok=True, json=lambda: {'id': 'ig_user_2'})
            mock_post.side_effect = [
                MagicMock(ok=True, json=lambda: {'id': 'creation_789'}),
                MagicMock(ok=True, json=lambda: {'id': 'ig_reel_101'}),
            ]
            result = pub.publish_instagram(post)

        self.assertTrue(result)
        # Verificar que o parâmetro media_type foi REELS
        first_post_data = mock_post.call_args_list[0][1].get('data', {})
        self.assertEqual(first_post_data.get('media_type'), 'REELS')

    def test_falha_quando_creation_id_ausente(self):
        post = {
            'id': 'p3', 'avatar_id': 'av1',
            'legenda': 'Teste', 'hashtags': '',
            'imagem_url': 'https://img.jpg',
        }
        with patch('requests.get') as mock_get, patch('requests.post') as mock_post:
            mock_get.return_value = MagicMock(ok=True, json=lambda: {'id': 'ig_user_1'})
            mock_post.return_value = MagicMock(ok=True, json=lambda: {})  # sem 'id'
            result = pub.publish_instagram(post)

        self.assertFalse(result)

    def test_legenda_e_hashtags_concatenados(self):
        post = {
            'id': 'p4', 'avatar_id': 'av1',
            'legenda': 'Legenda bonita', 'hashtags': '#tag1 #tag2',
            'imagem_url': 'https://img.jpg',
        }
        with patch('requests.get') as mock_get, patch('requests.post') as mock_post:
            mock_get.return_value = MagicMock(ok=True, json=lambda: {'id': 'ig_user_1'})
            mock_post.side_effect = [
                MagicMock(ok=True, json=lambda: {'id': 'creation_abc'}),
                MagicMock(ok=True, json=lambda: {'id': 'ig_post_def'}),
            ]
            pub.publish_instagram(post)

            first_post_data = mock_post.call_args_list[0][1].get('data', {})
            caption = first_post_data.get('caption', '')
            self.assertIn('Legenda bonita', caption)
            self.assertIn('#tag1 #tag2', caption)


# ── Testes: publish_tiktok() — fluxo completo ────────────────────────────
class TestPublishTikTokFullFlow(unittest.TestCase):

    def setUp(self):
        pub.TIKTOK_TOKEN = 'valid-tiktok-token'
        pub.supabase = MagicMock()

    def tearDown(self):
        pub.TIKTOK_TOKEN = ''

    def test_post_com_foto_usa_endpoint_content_init(self):
        post = {
            'id': 'p1', 'avatar_id': 'av1',
            'legenda': 'Foto', 'hashtags': '',
            'imagem_url': 'https://img.jpg',
        }
        with patch('requests.post') as mock_post:
            mock_post.return_value = MagicMock(
                ok=True,
                json=lambda: {'error': {'code': 'ok'}, 'data': {'publish_id': 'tt1'}},
            )
            result = pub.publish_tiktok(post)

        self.assertTrue(result)
        url = mock_post.call_args[0][0]
        self.assertIn('content/init', url)

    def test_post_com_video_usa_endpoint_video_init(self):
        post = {
            'id': 'p2', 'avatar_id': 'av1',
            'legenda': 'Vídeo', 'hashtags': '',
            'video_url': 'https://vid.mp4',
        }
        with patch('requests.post') as mock_post:
            mock_post.return_value = MagicMock(
                ok=True,
                json=lambda: {'error': {'code': 'ok'}, 'data': {'publish_id': 'tt2'}},
            )
            result = pub.publish_tiktok(post)

        self.assertTrue(result)
        url = mock_post.call_args[0][0]
        self.assertIn('video/init', url)

    def test_api_error_code_retorna_false(self):
        """TikTok retorna ok=True mas com error.code != 'ok' → falha."""
        post = {
            'id': 'p3', 'avatar_id': 'av1',
            'legenda': 'Teste', 'hashtags': '',
            'video_url': 'https://vid.mp4',
        }
        with patch('requests.post') as mock_post:
            mock_post.return_value = MagicMock(
                ok=True,
                json=lambda: {'error': {'code': 'spam_risk_too_many_posts'}, 'data': {}},
            )
            result = pub.publish_tiktok(post)

        self.assertFalse(result)

    def test_caption_combinada_com_hashtags(self):
        """O campo title deve combinar legenda + hashtags, truncado a 2200."""
        pub.supabase = MagicMock()
        post = {
            'id': 'p4', 'avatar_id': 'av1',
            'legenda': 'Legenda', 'hashtags': '#tag',
            'video_url': 'https://vid.mp4',
        }
        with patch('requests.post') as mock_post:
            mock_post.return_value = MagicMock(
                ok=True,
                json=lambda: {'error': {'code': 'ok'}, 'data': {'publish_id': 'tt3'}},
            )
            pub.publish_tiktok(post)
            payload = mock_post.call_args[1]['json']
            title = payload['post_info']['title']
            self.assertIn('Legenda', title)
            self.assertIn('#tag', title)


# ── Testes: publish_facebook() — fluxo completo ──────────────────────────
class TestPublishFacebookFullFlow(unittest.TestCase):

    def setUp(self):
        pub.FACEBOOK_TOKEN = 'fb-token'
        pub.supabase = MagicMock()

    def tearDown(self):
        pub.FACEBOOK_TOKEN = ''

    def test_retorna_true_ao_publicar_com_imagem(self):
        post = {
            'id': 'p1', 'avatar_id': 'av1',
            'legenda': 'Olá', 'hashtags': '',
            'imagem_url': 'https://img.jpg',
        }
        with patch('requests.post') as mock_post:
            mock_post.return_value = MagicMock(ok=True, json=lambda: {'id': 'fb123'})
            result = pub.publish_facebook(post)

        self.assertTrue(result)

    def test_retorna_false_em_erro_http(self):
        post = {'id': 'p2', 'avatar_id': 'av1', 'legenda': 'Teste', 'hashtags': ''}
        with patch('requests.post') as mock_post:
            mock_post.return_value = MagicMock(ok=False, status_code=403, text='Forbidden')
            result = pub.publish_facebook(post)

        self.assertFalse(result)

    def test_mensagem_combina_legenda_e_hashtags(self):
        post = {
            'id': 'p3', 'avatar_id': 'av1',
            'legenda': 'Legenda FB', 'hashtags': '#fb',
        }
        with patch('requests.post') as mock_post:
            mock_post.return_value = MagicMock(ok=True, json=lambda: {'id': 'fb456'})
            pub.publish_facebook(post)

            params = mock_post.call_args[1].get('params', {})
            msg = params.get('message', '')
            self.assertIn('Legenda FB', msg)
            self.assertIn('#fb', msg)


# ── Testes: publish_youtube() — fluxo completo ──────────────────────────
class TestPublishYouTubeFullFlow(unittest.TestCase):

    def setUp(self):
        pub.YOUTUBE_TOKEN = 'yt-token'
        pub.supabase = MagicMock()

    def tearDown(self):
        pub.YOUTUBE_TOKEN = ''

    def test_retorna_false_ao_falhar_download(self):
        post = {
            'id': 'p1', 'avatar_id': 'av1',
            'legenda': 'Vídeo', 'hashtags': '',
            'video_url': 'https://vid.mp4',
        }
        with patch('requests.get') as mock_get:
            mock_get.return_value = MagicMock(ok=False, raise_for_status=lambda: (_ for _ in ()).throw(Exception('404')))
            result = pub.publish_youtube(post)

        self.assertFalse(result)

    def test_retorna_false_quando_location_ausente(self):
        """YouTube init retorna ok=True mas sem header Location."""
        post = {
            'id': 'p2', 'avatar_id': 'av1',
            'legenda': 'Vídeo', 'hashtags': '',
            'video_url': 'https://vid.mp4',
        }
        with patch('requests.get') as mock_get, patch('requests.post') as mock_post:
            mock_get.return_value = MagicMock(
                ok=True, content=b'video-data',
                headers={'Content-Type': 'video/mp4'},
                raise_for_status=lambda: None,
            )
            mock_post.return_value = MagicMock(
                ok=True, headers={}  # sem Location
            )
            result = pub.publish_youtube(post)

        self.assertFalse(result)

    def test_retorna_false_quando_upload_falha(self):
        """Upload PUT retorna 400."""
        post = {
            'id': 'p3', 'avatar_id': 'av1',
            'legenda': 'Vídeo', 'hashtags': '',
            'video_url': 'https://vid.mp4',
        }
        with patch('requests.get') as mock_get, \
             patch('requests.post') as mock_post, \
             patch('requests.put') as mock_put:
            mock_get.return_value = MagicMock(
                ok=True, content=b'data',
                headers={'Content-Type': 'video/mp4'},
                raise_for_status=lambda: None,
            )
            mock_post.return_value = MagicMock(
                ok=True,
                headers={'Location': 'https://upload.googleapis.com/abc'},
            )
            mock_put.return_value = MagicMock(status_code=400, text='Bad Request')
            result = pub.publish_youtube(post)

        self.assertFalse(result)

    def test_retorna_true_em_upload_bem_sucedido(self):
        post = {
            'id': 'p4', 'avatar_id': 'av1',
            'legenda': 'Vídeo ótimo', 'hashtags': '#yt',
            'video_url': 'https://vid.mp4',
        }
        with patch('requests.get') as mock_get, \
             patch('requests.post') as mock_post, \
             patch('requests.put') as mock_put:
            mock_get.return_value = MagicMock(
                ok=True, content=b'vid-data',
                headers={'Content-Type': 'video/mp4'},
                raise_for_status=lambda: None,
            )
            mock_post.return_value = MagicMock(
                ok=True,
                headers={'Location': 'https://upload.googleapis.com/upload/xyz'},
            )
            mock_put.return_value = MagicMock(
                status_code=200,
                json=lambda: {'id': 'yt-vid-id-789'},
            )
            result = pub.publish_youtube(post)

        self.assertTrue(result)

    def test_aceita_status_201_alem_de_200(self):
        """YouTube upload pode retornar 201 Created."""
        post = {
            'id': 'p5', 'avatar_id': 'av1',
            'legenda': 'Vídeo', 'hashtags': '',
            'video_url': 'https://vid.mp4',
        }
        with patch('requests.get') as mock_get, \
             patch('requests.post') as mock_post, \
             patch('requests.put') as mock_put:
            mock_get.return_value = MagicMock(
                ok=True, content=b'data',
                headers={'Content-Type': 'video/mp4'},
                raise_for_status=lambda: None,
            )
            mock_post.return_value = MagicMock(
                ok=True,
                headers={'Location': 'https://upload.googleapis.com/abc'},
            )
            mock_put.return_value = MagicMock(
                status_code=201,
                json=lambda: {'id': 'yt-vid-201'},
            )
            result = pub.publish_youtube(post)

        self.assertTrue(result)

    def test_content_type_detectado_do_header(self):
        """O Content-Type deve ser lido do header da resposta do download."""
        post = {
            'id': 'p6', 'avatar_id': 'av1',
            'legenda': 'Vídeo', 'hashtags': '',
            'video_url': 'https://vid.webm',
        }
        with patch('requests.get') as mock_get, \
             patch('requests.post') as mock_post, \
             patch('requests.put') as mock_put:
            mock_get.return_value = MagicMock(
                ok=True, content=b'webm-data',
                headers={'Content-Type': 'video/webm'},
                raise_for_status=lambda: None,
            )
            mock_post.return_value = MagicMock(
                ok=True,
                headers={'Location': 'https://upload.googleapis.com/abc'},
            )
            mock_put.return_value = MagicMock(
                status_code=200,
                json=lambda: {'id': 'yt-vid-webm'},
            )
            pub.publish_youtube(post)

            # Verificar que o init_headers inclui o Content-Type correto
            init_headers = mock_post.call_args[1].get('headers', {})
            self.assertEqual(init_headers.get('X-Upload-Content-Type'), 'video/webm')


# ── Testes: save_published() — campos adicionais ─────────────────────────
class TestSavePublishedEdgeCases(unittest.TestCase):

    def setUp(self):
        self.supa = MagicMock()
        pub.supabase = self.supa

    def _inserted_data(self):
        return self.supa.table.return_value.insert.call_args[0][0]

    def test_insere_na_tabela_publicados(self):
        pub.save_published({'id': 'p1', 'avatar_id': 'av1'}, 'instagram')
        self.supa.table.assert_called_with('publicados')

    def test_likes_comentarios_visualizacoes_sao_zero(self):
        pub.save_published({'id': 'p1', 'avatar_id': 'av1'}, 'tiktok')
        data = self._inserted_data()
        self.assertEqual(data['likes'], 0)
        self.assertEqual(data['comentarios'], 0)
        self.assertEqual(data['visualizacoes'], 0)

    def test_publicado_em_e_string_iso(self):
        pub.save_published({'id': 'p1', 'avatar_id': 'av1'}, 'youtube')
        data = self._inserted_data()
        self.assertIsInstance(data['publicado_em'], str)
        self.assertIn('T', data['publicado_em'])  # formato ISO

    def test_plataforma_correcta(self):
        for platform in ('instagram', 'tiktok', 'facebook', 'youtube'):
            self.supa.reset_mock()
            pub.save_published({'id': 'p1', 'avatar_id': 'av1'}, platform)
            data = self._inserted_data()
            self.assertEqual(data['plataforma'], platform)

    def test_url_e_social_id_podem_ser_nulos(self):
        pub.save_published({'id': 'p1', 'avatar_id': 'av1'}, 'facebook')
        data = self._inserted_data()
        self.assertIsNone(data['post_id_social'])
        self.assertIsNone(data['url_post'])

    def test_url_e_social_id_quando_fornecidos(self):
        pub.save_published(
            {'id': 'p1', 'avatar_id': 'av1'},
            'youtube',
            social_id='yt-vid-123',
            url='https://youtube.com/watch?v=yt-vid-123',
        )
        data = self._inserted_data()
        self.assertEqual(data['post_id_social'], 'yt-vid-123')
        self.assertEqual(data['url_post'], 'https://youtube.com/watch?v=yt-vid-123')


if __name__ == '__main__':
    unittest.main(verbosity=2)
