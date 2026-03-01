/* ============================================================
   stripe-client.js — Stripe Connect API wrapper
   All calls go via the Stripe API using the secret key stored
   in Config.  The browser calls the API directly (no backend
   needed for a single-user tool) using fetch to api.stripe.com.
   ============================================================ */
const Stripe = (() => {
  const BASE = 'https://api.stripe.com/v1';

  function _key() {
    return Config.get('STRIPE_SECRET');
  }

  function _headers() {
    const key = _key();
    if (!key) throw new Error('Stripe Secret Key não configurada.');
    return {
      'Authorization': `Bearer ${key}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    };
  }

  // Encode a flat JS object as application/x-www-form-urlencoded
  function _encode(obj, prefix = '') {
    const parts = [];
    for (const [k, v] of Object.entries(obj)) {
      if (v === null || v === undefined) continue;
      const key = prefix ? `${prefix}[${k}]` : k;
      if (typeof v === 'object' && !Array.isArray(v)) {
        parts.push(_encode(v, key));
      } else {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
      }
    }
    return parts.join('&');
  }

  async function _request(method, path, body = null) {
    const opts = { method, headers: _headers() };
    if (body) opts.body = typeof body === 'string' ? body : _encode(body);
    const res = await fetch(`${BASE}${path}`, opts);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || `Stripe erro ${res.status}`);
    return json;
  }

  /* ── Balance ── */
  async function getBalance() {
    return _request('GET', '/balance');
  }

  /* ── External Bank Accounts (connected to platform) ── */
  // Creates or retrieves a bank account token then attaches it.
  // accountId: Stripe Connect account id (acct_xxx)
  // params: { country, currency, account_holder_name, account_holder_type, iban }
  async function createExternalAccount(accountId, params) {
    // First create a bank account token
    const tokenBody = {
      'bank_account[country]':              params.country,
      'bank_account[currency]':             params.currency,
      'bank_account[account_holder_name]':  params.account_holder_name,
      'bank_account[account_holder_type]':  params.account_holder_type || 'individual',
      'bank_account[account_number]':       params.iban,
    };
    const token = await _request('POST', '/tokens', tokenBody);
    // Attach to the connected account
    return _request('POST', `/accounts/${accountId}/external_accounts`, {
      external_account: token.id,
    });
  }

  async function listExternalAccounts(accountId) {
    return _request('GET', `/accounts/${accountId}/external_accounts?object=bank_account&limit=20`);
  }

  async function deleteExternalAccount(accountId, bankAccountId) {
    return _request('DELETE', `/accounts/${accountId}/external_accounts/${bankAccountId}`);
  }

  /* ── Payouts ── */
  // Creates a payout from the connected account's available balance to its default bank account.
  // amount in cents (e.g. 1000 = 10.00 EUR), currency e.g. 'eur'
  // stripeAccountId: the Stripe Connect acct_xxx to pay out from (uses Stripe-Account header)
  async function createPayout(stripeAccountId, amount, currency, description) {
    const key = _key();
    if (!key) throw new Error('Stripe Secret Key não configurada.');
    const res = await fetch(`${BASE}/payouts`, {
      method:  'POST',
      headers: {
        'Authorization':  `Bearer ${key}`,
        'Content-Type':   'application/x-www-form-urlencoded',
        'Stripe-Account': stripeAccountId,
      },
      body: _encode({ amount, currency, description: description || 'ContentHub payout' }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || `Stripe payout erro ${res.status}`);
    return json;
  }

  async function listPayouts(stripeAccountId, { limit = 20, starting_after } = {}) {
    const key = _key();
    if (!key) throw new Error('Stripe Secret Key não configurada.');
    let url = `${BASE}/payouts?limit=${limit}`;
    if (starting_after) url += `&starting_after=${starting_after}`;
    const res = await fetch(url, {
      headers: {
        'Authorization':  `Bearer ${key}`,
        'Stripe-Account': stripeAccountId,
      },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || `Stripe payouts erro ${res.status}`);
    return json;
  }

  /* ── Connected Accounts ── */
  // Lists all Stripe Connect Express/Standard connected accounts
  async function listAccounts({ limit = 20 } = {}) {
    return _request('GET', `/accounts?limit=${limit}`);
  }

  async function getAccount(accountId) {
    return _request('GET', `/accounts/${accountId}`);
  }

  // Creates a minimal Express connected account
  async function createAccount(params) {
    const body = {
      type:                 'express',
      country:              params.country || 'PT',
      email:                params.email,
      'capabilities[card_payments][requested]': true,
      'capabilities[transfers][requested]':     true,
    };
    return _request('POST', '/accounts', body);
  }

  // Retrieve available balance of a connected account
  async function getAccountBalance(stripeAccountId) {
    const key = _key();
    if (!key) throw new Error('Stripe Secret Key não configurada.');
    const res = await fetch(`${BASE}/balance`, {
      headers: {
        'Authorization':  `Bearer ${key}`,
        'Stripe-Account': stripeAccountId,
      },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || `Stripe balance erro ${res.status}`);
    return json;
  }

  /* ── Validation ── */
  async function testConnection() {
    const data = await _request('GET', '/balance');
    return !!data.object;
  }

  return {
    getBalance,
    getAccountBalance,
    createExternalAccount,
    listExternalAccounts,
    deleteExternalAccount,
    createPayout,
    listPayouts,
    listAccounts,
    getAccount,
    createAccount,
    testConnection,
  };
})();
