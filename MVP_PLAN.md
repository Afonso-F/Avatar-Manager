# Plano MVP — ContentHub

## Contexto

O app já tem uma base sólida: auth, avatares, criação de posts com IA (Gemini + fal.ai), fila/kanban, analytics, monetização, YouTube e músicos. **O loop core está incompleto**: os posts são "agendados" mas nunca são publicados automaticamente.

O MVP precisa de fechar este loop:
> **Criar conteúdo → Agendar → Publicar automaticamente → Ver resultados**

---

## O que já está feito ✅

| Área | Estado |
|---|---|
| Auth (Supabase) | ✅ |
| Gestão de avatares (9 plataformas, categorias, profile_url) | ✅ |
| Criação de posts com IA (legenda, hashtags, imagem, vídeo) | ✅ |
| Upload para Supabase Storage | ✅ |
| Fila/kanban + agendamento | ✅ |
| Publicação TikTok (Content Posting API v2) | ✅ |
| Publicação YouTube (Data API v3) | ✅ |
| Dashboard analytics + charts | ✅ |
| Monetização (Fansly, YouTube, Músicos) | ✅ |
| Configurações e gestão de API keys | ✅ |

---

## Gaps para o MVP

### Gap 1 — Pipeline de auto-publicação (CRÍTICO)
O folder `.github/workflows/` existe mas está vazio. Sem este workflow, nenhum post agendado é publicado.

### Gap 2 — Publicação Instagram (Graph API)
Plataforma mais importante para criadores. O código de publicação está ausente.

### Gap 3 — Secção de Despesas
A tabela `despesas` existe na BD, mas não há UI. Essencial para o dashboard de monetização ser útil.

### Gap 4 — Notificações
`initBrowserNotifications()` é chamada mas não está implementada. O utilizador não sabe quando um post falha.

### Gap 5 — Botões CSV não funcionam
Export/import CSV mencionados em vários sítios, sem implementação.

---

## Plano de Implementação (por prioridade)

---

### Fase 1 — Auto-publicação (BLOCKER do MVP)

**Objetivo:** Posts agendados para o passado são publicados automaticamente a cada hora.

#### 1.1 — GitHub Actions workflow de publicação
**Ficheiro:** `.github/workflows/publish.yml`

```yaml
# Corre de hora a hora
# Chama um endpoint Supabase Edge Function que:
# 1. Seleciona posts com status='scheduled' e agendado_para <= now()
# 2. Para cada post, chama o publisher da plataforma correcta
# 3. Atualiza status para 'published' ou 'error'
# 4. Insere registo em 'publicados'
```

#### 1.2 — Supabase Edge Function: publish-scheduled
**Ficheiro:** `supabase/functions/publish-scheduled/index.ts`

- Recebe POST de trigger (GitHub Actions ou cron)
- Busca posts prontos a publicar
- Routing por plataforma: `tiktok` → TikTok API, `youtube` → YouTube API, `instagram` → Instagram API
- Atualiza `posts.status` + insere em `publicados`
- Retorna JSON com resumo (publicados: N, erros: M)

#### 1.3 — Migração: coluna `error_msg` em posts
**Ficheiro:** `supabase/migrations/20260225_posts_error.sql`

```sql
ALTER TABLE posts ADD COLUMN IF NOT EXISTS error_msg text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS publicado_em timestamptz;
```

---

### Fase 2 — Publicação Instagram

**Objetivo:** Suporte a imagem única + vídeo (Reels) via Meta Graph API.

#### 2.1 — Publisher Instagram
**Ficheiro:** `supabase/functions/publish-scheduled/publishers/instagram.ts`

Fluxo Graph API:
```
POST /{ig-user-id}/media        → cria container (retorna creation_id)
POST /{ig-user-id}/media_publish → publica com creation_id
GET  /{media-id}?fields=...     → confirma publicação
```

Suporte a:
- Imagem única (`IMAGE`)
- Vídeo/Reels (`REELS`)

Token necessário: `contas.access_token` para a plataforma `instagram` deste avatar.

---

### Fase 3 — Secção de Despesas

**Objetivo:** CRUD de despesas + integração com dashboard de monetização.

#### 3.1 — UI da secção
**Ficheiro:** `js/sections/despesas.js` (novo)

- Lista de despesas com paginação
- Filtros: categoria, mês
- Modal de criar/editar: descrição, valor, categoria (ferramentas, subscriptions, freelancers, equipamento, outros), data
- Totais por categoria (cards no topo)
- Mini gráfico pizza por categoria

#### 3.2 — Adicionar à navegação
**Ficheiro:** `js/app.js`

Adicionar item `despesas` à sidebar entre "Monetização" e "Configurações".

#### 3.3 — Incluir script
**Ficheiro:** `index.html`

Adicionar `<script src="js/sections/despesas.js"></script>`.

#### 3.4 — Total despesas no dashboard de monetização
**Ficheiro:** `js/sections/monetizacao.js`

Adicionar KPI card "Despesas do Mês" e calcular lucro líquido = receita total − despesas.

---

### Fase 4 — Notificações browser

**Objetivo:** O utilizador é notificado quando um post é publicado ou falha.

#### 4.1 — Implementar `initBrowserNotifications()`
**Ficheiro:** `js/sections/fila.js`

- Pedir permissão `Notification.requestPermission()`
- Polling leve (30s) ao Supabase para posts que mudaram para `published`/`error` desde a última verificação
- `new Notification(...)` com título e corpo

---

### Fase 5 — CSV Export

**Objetivo:** Exportar posts e publicações para análise externa.

#### 5.1 — Export CSV na Fila
**Ficheiro:** `js/sections/fila.js`

Botão "Exportar CSV" já existe → implementar `exportFilaCSV()`:
- Colunas: avatar, legenda, plataformas, status, agendado_para
- `Blob` + download link

#### 5.2 — Export CSV em Publicados
**Ficheiro:** `js/sections/publicados.js`

Colunas: avatar, plataforma, legenda, publicado_em, likes, comentarios, visualizacoes

---

## Resumo de ficheiros a criar/modificar

| Ficheiro | Ação | Fase |
|---|---|---|
| `.github/workflows/publish.yml` | Criar | 1.1 |
| `supabase/functions/publish-scheduled/index.ts` | Criar | 1.2 |
| `supabase/functions/publish-scheduled/publishers/tiktok.ts` | Criar | 1.2 |
| `supabase/functions/publish-scheduled/publishers/youtube.ts` | Criar | 1.2 |
| `supabase/functions/publish-scheduled/publishers/instagram.ts` | Criar | 2.1 |
| `supabase/migrations/20260225_posts_error.sql` | Criar | 1.3 |
| `js/sections/despesas.js` | Criar | 3.1 |
| `js/app.js` | Modificar (sidebar + handler) | 3.2 |
| `index.html` | Modificar (script tag) | 3.3 |
| `js/sections/monetizacao.js` | Modificar (KPI despesas) | 3.4 |
| `js/sections/fila.js` | Modificar (notificações + CSV) | 4.1 + 5.1 |
| `js/sections/publicados.js` | Modificar (CSV export) | 5.2 |

---

## Ordem de execução recomendada

```
Fase 1 (auto-publish) → Fase 2 (Instagram) → Fase 3 (despesas) → Fase 4 (notif) → Fase 5 (CSV)
```

**Fase 1 + 2** = MVP core (posts publicam-se sozinhos)
**Fase 3** = MVP financeiro completo
**Fase 4 + 5** = polish para lançamento

---

## Dependências externas necessárias

| Serviço | Onde configurar | Para quê |
|---|---|---|
| Meta Developer App + Instagram Business Account | Configurações do app | Publicação Instagram |
| GitHub Actions secrets (SUPABASE_URL, SUPABASE_SERVICE_KEY) | Repo Settings → Secrets | Trigger da Edge Function |
| Supabase CLI (para deploy das Edge Functions) | Local dev | Deploy functions |
