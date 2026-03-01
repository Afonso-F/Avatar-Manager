#!/usr/bin/env python3
"""
stripe_payout.py — Automated Stripe Connect payouts via GitHub Actions

Two-phase daily job:

  Phase 1 – Auto-collect (novo)
    Para cada conta_bancaria com auto_daily_payout=true:
      • Consulta o saldo disponível na conta Stripe Connect associada.
      • Se o saldo disponível for >= MIN_PAYOUT_CENTS, cria um levantamento
        automático e executa o payout imediatamente.
      • Salta contas já pagas hoje para evitar duplicados.

  Phase 2 – Processar pendentes (existente)
    Lê todos os levantamentos com status='pending' (criados manual ou
    automaticamente na fase 1) e chama o Stripe para os processar.

  Phase 3 – Payout da conta principal (novo)
    Se STRIPE_MAIN_BANK_ACCOUNT_ID estiver definido, verifica o saldo da
    conta Stripe principal e cria um payout para a conta bancária do titular
    caso o saldo seja >= MIN_PAYOUT_CENTS.

Environment variables (GitHub Secrets):
  SUPABASE_URL                — Supabase project URL
  SUPABASE_KEY                — Supabase service role key (não anon!)
  STRIPE_SECRET_KEY           — Stripe secret key (sk_live_xxx ou sk_test_xxx)
  STRIPE_MAIN_BANK_ACCOUNT_ID — (opcional) ID ba_xxx da conta bancária na
                                 conta Stripe principal para payout diário
  STRIPE_MIN_PAYOUT_CENTS     — (opcional) Montante mínimo em cêntimos para
                                 activar payout automático (default: 1000 = €10)

Usage:
  python scripts/stripe_payout.py [--dry-run]

  --dry-run: regista o que faria sem chamar o Stripe ou alterar a BD.
"""

import os
import sys
import json
import time
import argparse
import logging
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timezone

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)


# ── HTTP helpers ───────────────────────────────────────────────────────────────

def _supabase_request(method, path, body=None, *, url, key):
    """Make a Supabase REST request."""
    full_url = f"{url.rstrip('/')}/rest/v1/{path.lstrip('/')}"
    headers = {
        "apikey":        key,
        "Authorization": f"Bearer {key}",
        "Content-Type":  "application/json",
        "Prefer":        "return=representation",
    }
    data = json.dumps(body).encode() if body else None
    req  = urllib.request.Request(full_url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body_text = e.read().decode()
        raise RuntimeError(f"Supabase {method} {path} → {e.code}: {body_text}") from e


def _stripe_request(method, path, body=None, stripe_account=None, *, key):
    """Make a Stripe API request."""
    full_url = f"https://api.stripe.com/v1/{path.lstrip('/')}"
    headers  = {
        "Authorization": f"Bearer {key}",
        "Content-Type":  "application/x-www-form-urlencoded",
    }
    if stripe_account:
        headers["Stripe-Account"] = stripe_account

    data = urllib.parse.urlencode(body).encode() if body else None
    req  = urllib.request.Request(full_url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body_text = e.read().decode()
        raise RuntimeError(f"Stripe {method} {path} → {e.code}: {body_text}") from e


# ── Supabase helpers ───────────────────────────────────────────────────────────

def get_pending_levantamentos(supabase_url, supabase_key):
    """Devolve todos os levantamentos com status='pending' com stripe_account_id."""
    path = (
        "levantamentos"
        "?status=eq.pending"
        "&select=*,contas_bancarias(stripe_account_id,country,currency,iban,titular)"
        "&order=criado_em.asc"
        "&limit=50"
    )
    return _supabase_request("GET", path, url=supabase_url, key=supabase_key)


def get_auto_payout_contas(supabase_url, supabase_key):
    """Devolve contas bancárias com auto_daily_payout=true e stripe_account_id definido."""
    path = (
        "contas_bancarias"
        "?auto_daily_payout=eq.true"
        "&stripe_account_id=not.is.null"
        "&select=*"
        "&order=criado_em.asc"
    )
    return _supabase_request("GET", path, url=supabase_url, key=supabase_key)


def already_paid_today(conta_id, supabase_url, supabase_key):
    """Verifica se já existe um levantamento automático hoje para esta conta."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    path = (
        f"levantamentos"
        f"?conta_bancaria_id=eq.{conta_id}"
        f"&auto_created=eq.true"
        f"&criado_em=gte.{today}T00:00:00Z"
        f"&status=in.(pending,in_transit,paid)"
        f"&select=id"
        f"&limit=1"
    )
    rows = _supabase_request("GET", path, url=supabase_url, key=supabase_key)
    return bool(rows)


def create_levantamento(conta, amount_cents, currency, supabase_url, supabase_key):
    """Cria um registo de levantamento automático na BD e devolve o id."""
    today_str = datetime.now(timezone.utc).strftime("%Y-%m")
    desc = f"Auto-payout {today_str} — {conta.get('titular', 'ContentHub')}"
    body = {
        "conta_bancaria_id": conta["id"],
        "montante":          amount_cents,
        "moeda":             currency,
        "status":            "pending",
        "descricao":         desc,
        "auto_created":      True,
    }
    if conta.get("avatar_id"):
        body["avatar_id"] = conta["avatar_id"]
    elif conta.get("youtube_channel_id"):
        body["youtube_channel_id"] = conta["youtube_channel_id"]

    rows = _supabase_request("POST", "levantamentos", body, url=supabase_url, key=supabase_key)
    # Supabase devolve lista com Prefer: return=representation
    if isinstance(rows, list) and rows:
        return rows[0]["id"]
    if isinstance(rows, dict) and rows.get("id"):
        return rows["id"]
    raise RuntimeError(f"Erro ao criar levantamento: {rows}")


def update_levantamento_status(record_id, status, stripe_payout_id=None, *, supabase_url, supabase_key):
    """Actualiza o status de um levantamento (e payout id se fornecido)."""
    body = {"status": status}
    if stripe_payout_id:
        body["stripe_payout_id"] = stripe_payout_id
    path = f"levantamentos?id=eq.{record_id}"
    _supabase_request("PATCH", path, body, url=supabase_url, key=supabase_key)


# ── Stripe helpers ─────────────────────────────────────────────────────────────

def get_stripe_available_balance(stripe_account, stripe_key):
    """
    Devolve o saldo disponível de uma conta Stripe Connect.
    Retorna lista de {'currency': 'eur', 'amount': 12345} em cêntimos.
    """
    data = _stripe_request("GET", "/balance", stripe_account=stripe_account, key=stripe_key)
    return data.get("available", [])


def get_platform_balance(stripe_key):
    """Devolve o saldo disponível da conta Stripe principal (plataforma)."""
    data = _stripe_request("GET", "/balance", key=stripe_key)
    return data.get("available", [])


def create_stripe_payout(amount, currency, description, stripe_key, stripe_account=None):
    """
    Cria um payout Stripe.
    Se stripe_account for fornecido, o payout é da conta Connect.
    Caso contrário, é da conta principal da plataforma.
    """
    body = {
        "amount":      str(amount),
        "currency":    currency,
        "description": description,
    }
    payout = _stripe_request("POST", "/payouts", body, stripe_account=stripe_account, key=stripe_key)
    return payout["id"], payout.get("status", "pending")


# ── Phase 1: Auto-collect ──────────────────────────────────────────────────────

def auto_collect_all(min_cents, supabase_url, supabase_key, stripe_key, dry_run=False):
    """
    Fase 1: Para cada conta com auto_daily_payout=true, verifica o saldo
    Stripe e cria levantamentos automáticos para montantes >= min_cents.
    """
    log.info("── Fase 1: Auto-collect de saldos Stripe ──")
    contas = get_auto_payout_contas(supabase_url, supabase_key)

    if not contas:
        log.info("Nenhuma conta com payout automático activado.")
        return

    log.info("Encontradas %d conta(s) com payout automático.", len(contas))
    created = 0

    for conta in contas:
        conta_id     = conta["id"]
        stripe_acct  = conta["stripe_account_id"]
        titular      = conta.get("titular", "—")

        # Evitar duplicados: já foi pago hoje?
        try:
            if already_paid_today(conta_id, supabase_url, supabase_key):
                log.info("  ⏭  %s (%s) — já tem levantamento automático hoje, a saltar.", titular, stripe_acct)
                continue
        except Exception as e:
            log.warning("  ⚠  Erro ao verificar levantamento de hoje para %s: %s", titular, e)
            continue

        # Consultar saldo disponível na conta Connect
        try:
            balances = get_stripe_available_balance(stripe_acct, stripe_key)
        except Exception as e:
            log.warning("  ⚠  Não foi possível obter saldo de %s (%s): %s", titular, stripe_acct, e)
            continue

        for bal in balances:
            amount   = bal.get("amount", 0)
            currency = bal.get("currency", conta.get("currency", "eur")).lower()

            if amount < min_cents:
                log.info(
                    "  ↷  %s (%s) — saldo %s %s abaixo do mínimo (%s cêntimos), a saltar.",
                    titular, stripe_acct, amount, currency.upper(), min_cents,
                )
                continue

            log.info(
                "  ✚  %s (%s) — saldo disponível: %s %s → a criar payout automático.",
                titular, stripe_acct, amount / 100, currency.upper(),
            )

            if dry_run:
                log.info("    [DRY RUN] — não criou levantamento nem chamou Stripe.")
                created += 1
                continue

            try:
                lev_id = create_levantamento(conta, amount, currency, supabase_url, supabase_key)
                log.info("    ✓ Levantamento criado: %s", lev_id)
                created += 1
            except Exception as e:
                log.error("    ✗ Erro ao criar levantamento para %s: %s", titular, e)

    log.info("Fase 1 concluída: %d levantamento(s) criado(s).", created)


# ── Phase 2: Process pending ───────────────────────────────────────────────────

def process_payout(lev, stripe_key, dry_run=False):
    """
    Tenta criar um payout Stripe para um levantamento.
    Devolve (success, stripe_payout_id, error_msg).
    """
    conta = lev.get("contas_bancarias") or {}
    stripe_account = conta.get("stripe_account_id") or lev.get("stripe_account_id")

    if not stripe_account:
        return False, None, "Sem stripe_account_id na conta bancária — saltar."

    amount   = lev.get("montante")       # já em cêntimos
    currency = (lev.get("moeda") or conta.get("currency") or "eur").lower()
    desc     = lev.get("descricao") or "ContentHub payout"
    lev_id   = lev.get("id")

    if not amount or amount <= 0:
        return False, None, f"Montante inválido: {amount}"

    log.info(
        "Levantamento %s → Stripe acct %s — %s %s — \"%s\"",
        lev_id, stripe_account, amount / 100, currency.upper(), desc,
    )

    if dry_run:
        log.info("  [DRY RUN] — não chamou Stripe.")
        return True, "dry_run_payout_id", None

    payout_id, _ = create_stripe_payout(amount, currency, desc, stripe_key, stripe_account=stripe_account)
    return True, payout_id, None


def process_pending(supabase_url, supabase_key, stripe_key, dry_run=False):
    """Fase 2: Processa todos os levantamentos pendentes."""
    log.info("── Fase 2: Processar levantamentos pendentes ──")
    levantamentos = get_pending_levantamentos(supabase_url, supabase_key)

    if not levantamentos:
        log.info("Sem levantamentos pendentes. Nada a fazer.")
        return 0, 0

    log.info("Encontrados %d levantamento(s) pendente(s).", len(levantamentos))
    success_count = 0
    fail_count    = 0

    for lev in levantamentos:
        lev_id = lev.get("id")
        try:
            ok, payout_id, err = process_payout(lev, stripe_key, dry_run=dry_run)
            if ok:
                if not dry_run:
                    update_levantamento_status(
                        lev_id, "paid", payout_id,
                        supabase_url=supabase_url, supabase_key=supabase_key,
                    )
                log.info("  ✓ %s → pago (%s)", lev_id, payout_id)
                success_count += 1
            else:
                if not dry_run:
                    update_levantamento_status(
                        lev_id, "manual",
                        supabase_url=supabase_url, supabase_key=supabase_key,
                    )
                log.warning("  ⚠ %s saltado: %s", lev_id, err)
                fail_count += 1
        except Exception as exc:
            log.error("  ✗ %s falhou: %s", lev_id, exc)
            if not dry_run:
                try:
                    update_levantamento_status(
                        lev_id, "failed",
                        supabase_url=supabase_url, supabase_key=supabase_key,
                    )
                except Exception as upd_exc:
                    log.error("    Erro ao actualizar status: %s", upd_exc)
            fail_count += 1
            time.sleep(1)

    return success_count, fail_count


# ── Phase 3: Platform account payout ──────────────────────────────────────────

def payout_platform_account(main_bank_account_id, min_cents, stripe_key, dry_run=False):
    """
    Fase 3: Cria um payout da conta Stripe principal para a conta bancária
    do titular (STRIPE_MAIN_BANK_ACCOUNT_ID = ba_xxx).
    """
    log.info("── Fase 3: Payout da conta Stripe principal ──")

    try:
        balances = get_platform_balance(stripe_key)
    except Exception as e:
        log.error("Erro ao obter saldo da conta principal: %s", e)
        return

    for bal in balances:
        amount   = bal.get("amount", 0)
        currency = bal.get("currency", "eur").lower()

        if amount < min_cents:
            log.info(
                "  ↷  Saldo principal %s %s abaixo do mínimo (%s cêntimos), a saltar.",
                amount, currency.upper(), min_cents,
            )
            continue

        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        desc = f"ContentHub auto-payout principal {today_str}"

        log.info(
            "  ✚  Saldo disponível na conta principal: %s %s → a criar payout para %s.",
            amount / 100, currency.upper(), main_bank_account_id,
        )

        if dry_run:
            log.info("  [DRY RUN] — não chamou Stripe.")
            continue

        try:
            payout_id, status = create_stripe_payout(amount, currency, desc, stripe_key)
            log.info("  ✓ Payout principal criado: %s (status: %s)", payout_id, status)
        except Exception as e:
            log.error("  ✗ Erro ao criar payout principal: %s", e)


# ── Entry point ────────────────────────────────────────────────────────────────

def run(dry_run=False):
    supabase_url    = os.environ.get("SUPABASE_URL", "").strip()
    supabase_key    = os.environ.get("SUPABASE_KEY", "").strip()
    stripe_key      = os.environ.get("STRIPE_SECRET_KEY", "").strip()
    main_bank_acct  = os.environ.get("STRIPE_MAIN_BANK_ACCOUNT_ID", "").strip()
    min_cents       = int(os.environ.get("STRIPE_MIN_PAYOUT_CENTS", "1000"))

    if not supabase_url or not supabase_key:
        log.error("SUPABASE_URL e SUPABASE_KEY são obrigatórios.")
        sys.exit(1)
    if not stripe_key:
        log.warning(
            "STRIPE_SECRET_KEY não configurada — workflow ignorado. "
            "Define o secret STRIPE_SECRET_KEY no repositório para activar payouts automáticos."
        )
        sys.exit(0)

    log.info("=== ContentHub — Payout Automático Diário %s ===",
             "(DRY RUN)" if dry_run else "")
    log.info("Limiar mínimo: %s cêntimos (%.2f EUR)", min_cents, min_cents / 100)

    # Fase 1: auto-criar levantamentos para contas com payout automático
    auto_collect_all(min_cents, supabase_url, supabase_key, stripe_key, dry_run=dry_run)

    # Fase 2: processar todos os levantamentos pendentes (auto + manuais)
    success, failed = process_pending(supabase_url, supabase_key, stripe_key, dry_run=dry_run)

    # Fase 3: payout da conta Stripe principal para a conta bancária do titular
    if main_bank_acct:
        payout_platform_account(main_bank_acct, min_cents, stripe_key, dry_run=dry_run)
    else:
        log.info("── Fase 3: STRIPE_MAIN_BANK_ACCOUNT_ID não definido — a saltar payout principal.")

    log.info("=== Concluído: %d pago(s), %d falhado(s) ===", success, failed)
    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Stripe Connect automated payouts")
    parser.add_argument("--dry-run", action="store_true",
                        help="Mostra o que faria sem chamar o Stripe ou actualizar a BD")
    args = parser.parse_args()
    run(dry_run=args.dry_run)
