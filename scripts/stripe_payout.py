#!/usr/bin/env python3
"""
stripe_payout.py — Automated Stripe Connect payouts via GitHub Actions

Reads pending levantamentos from Supabase, submits them to Stripe,
and updates the status back in the database.

Environment variables (GitHub Secrets):
  SUPABASE_URL      — Supabase project URL
  SUPABASE_KEY      — Supabase service role key (not anon!)
  STRIPE_SECRET_KEY — Stripe secret key (sk_live_xxx or sk_test_xxx)

Usage:
  python scripts/stripe_payout.py [--dry-run]

  --dry-run: logs what would be done without calling Stripe or updating DB.
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

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)


# ── HTTP helpers ──────────────────────────────────────────────────────────────

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


# ── Core logic ────────────────────────────────────────────────────────────────

def get_pending_levantamentos(supabase_url, supabase_key):
    """Return all levantamentos with status='pending' that have a stripe_account_id."""
    path = (
        "levantamentos"
        "?status=eq.pending"
        "&select=*,contas_bancarias(stripe_account_id,country,currency,iban,titular)"
        "&order=criado_em.asc"
        "&limit=50"
    )
    return _supabase_request("GET", path, url=supabase_url, key=supabase_key)


def update_levantamento_status(record_id, status, stripe_payout_id=None, *, supabase_url, supabase_key):
    """Patch a levantamento row with new status (and payout id if provided)."""
    body = {"status": status}
    if stripe_payout_id:
        body["stripe_payout_id"] = stripe_payout_id
    path = f"levantamentos?id=eq.{record_id}"
    _supabase_request("PATCH", path, body, url=supabase_url, key=supabase_key)


def process_payout(lev, stripe_key, dry_run=False):
    """
    Attempt a Stripe payout for a single levantamento record.
    Returns (success: bool, stripe_payout_id: str|None, error_msg: str|None).
    """
    conta = lev.get("contas_bancarias") or {}
    stripe_account = conta.get("stripe_account_id") or lev.get("stripe_account_id")

    if not stripe_account:
        return False, None, "Sem stripe_account_id na conta bancária — saltar."

    amount   = lev.get("montante")       # already in cents
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

    body = {
        "amount":      str(amount),
        "currency":    currency,
        "description": desc,
    }

    payout = _stripe_request("POST", "/payouts", body, stripe_account=stripe_account, key=stripe_key)
    return True, payout["id"], None


def run(dry_run=False):
    supabase_url = os.environ.get("SUPABASE_URL", "").strip()
    supabase_key = os.environ.get("SUPABASE_KEY", "").strip()
    stripe_key   = os.environ.get("STRIPE_SECRET_KEY", "").strip()

    if not supabase_url or not supabase_key:
        log.error("SUPABASE_URL e SUPABASE_KEY são obrigatórios.")
        sys.exit(1)
    if not stripe_key:
        log.error("STRIPE_SECRET_KEY é obrigatória.")
        sys.exit(1)

    log.info("A buscar levantamentos pendentes…")
    levantamentos = get_pending_levantamentos(supabase_url, supabase_key)

    if not levantamentos:
        log.info("Sem levantamentos pendentes. Nada a fazer.")
        return

    log.info("Encontrados %d levantamentos pendentes.", len(levantamentos))

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
                # Skipped (no stripe account) — mark as manual to avoid re-processing
                if not dry_run:
                    update_levantamento_status(
                        lev_id, "manual",
                        supabase_url=supabase_url, supabase_key=supabase_key,
                    )
                log.warning("  ⚠ %s skipped: %s", lev_id, err)
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
            # Brief pause between requests to avoid rate limits
            time.sleep(1)

    log.info("Concluído: %d pagos, %d falhados.", success_count, fail_count)
    if fail_count > 0:
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Stripe Connect automated payouts")
    parser.add_argument("--dry-run", action="store_true", help="Log actions without calling Stripe or updating DB")
    args = parser.parse_args()
    run(dry_run=args.dry_run)
