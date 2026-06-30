/**
 * ConnectorEngine
 * Pronoia External Integration Layer
 */

export class ConnectorEngine {
  constructor() {
    this._registry = new Map(); // id -> connector
    this._log = [];             // execution log
    this._listeners = [];       // event callbacks
    this._ctx = {
      getIdToken: null,         // async () => Firebase ID token (for authed routes)
      connectors: {},           // user-entered creds: { notionToken, notionDatabaseId, zapierWebhookUrl, ... }
    };

    this._registerBuiltins();
  }

  /** App wires in the signed-in user's token provider and connector settings. */
  setContext(partial = {}) {
    this._ctx = { ...this._ctx, ...partial };
  }

  async _authHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (typeof this._ctx.getIdToken === 'function') {
      try {
        const token = await this._ctx.getIdToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
      } catch {
        /* unauthenticated — route will reject if it requires auth */
      }
    }
    return headers;
  }

  async _postJson(url, body, withAuth = false) {
    const headers = withAuth ? await this._authHeaders() : { 'Content-Type': 'application/json' };
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body || {}) });
    let data = {};
    try { data = await res.json(); } catch { /* non-JSON */ }
    return { ok: res.ok, status: res.status, data };
  }

  register(connector) {
    if (!connector.id || !connector.name || !connector.actions || !connector.execute) {
      console.error('[ConnectorEngine] Invalid connector schema:', connector);
      return false;
    }
    const alreadyRegistered = this._registry.has(connector.id);
    this._registry.set(connector.id, connector);
    if (!alreadyRegistered) {
      console.log(`[ConnectorEngine] Registered: ${connector.name} (${connector.actions.length} actions)`);
      this._emit('connector:registered', { connector });
    }
    return true;
  }

  unregister(id) {
    this._registry.delete(id);
    this._emit('connector:unregistered', { id });
  }

  getAll() {
    return Array.from(this._registry.values());
  }

  get(id) {
    return this._registry.get(id);
  }

  async dispatch(actionRef, params = {}, requireConfirm = true) {
    const [connectorId, actionId] = actionRef.split('.');
    const connector = this._registry.get(connectorId);

    if (!connector) {
      return this._result(false, `Connector "${connectorId}" nicht gefunden.`);
    }

    const action = connector.actions.find(a => a.id === actionId);
    if (!action) {
      return this._result(false, `Action "${actionId}" in "${connectorId}" nicht gefunden.`);
    }

    if (requireConfirm) {
      const confirmed = window.confirm(
        `${connector.icon} ${connector.name}: ${action.name}\n\n` +
        Object.entries(params).map(([k, v]) => `${k}: ${v}`).join('\n') +
        `\n\nAusführen?`
      );
      if (!confirmed) {
        return this._result(false, 'Aktion vom Nutzer abgebrochen.');
      }
    }

    try {
      console.log(`[ConnectorEngine] Dispatching: ${actionRef}`, params);
      const result = await connector.execute(actionId, params);
      this._logAction(actionRef, params, result);
      this._emit('action:executed', { actionRef, params, result });
      return result;
    } catch (err) {
      const result = this._result(false, `Ausführungsfehler: ${err.message}`);
      this._logAction(actionRef, params, result);
      return result;
    }
  }

  getTools() {
    const tools = [];
    for (const connector of this._registry.values()) {
      for (const action of connector.actions) {
        const properties = {};
        const required = [];
        for (const [key, def] of Object.entries(action.params || {})) {
          properties[key] = { type: def.type || 'string', description: def.description || '' };
          if (def.required) required.push(key);
        }
        tools.push({
          type: 'function',
          function: {
            name: `${connector.id}__${action.id}`,
            description: `[${connector.name}] ${action.description}`,
            parameters: {
              type: 'object',
              properties,
              required
            }
          }
        });
      }
    }
    return tools;
  }

  async callWithIntent(userIntent, context = {}, toastFn = null) {
    const tools = this.getTools();
    if (tools.length === 0) {
      return this._result(false, 'Keine Konnektoren registriert.');
    }

    try {
      const response = await fetch('/api/mistral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `User Intent: "${userIntent}". Identify if this intent matches any of our tools: ${JSON.stringify(tools)}. Return JSON format with function name and arguments or null if no match.`,
          systemPrompt: "You are the Pronoia Action Dispatcher. Analyze the user intent and pick a tool. Output JSON only."
        })
      });

      if (!response.ok) throw new Error(`API ${response.status}`);

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return this._result(false, 'Kein passender Konnektor gefunden.');

      const parsed = JSON.parse(content.replace(/```json|```/g, '').trim());
      if (!parsed || !parsed.name) {
        return this._result(false, 'Kein passender Konnektor gefunden.');
      }

      const actionRef = parsed.name.replace('__', '.');
      const params = parsed.arguments || {};

      if (toastFn) toastFn('Agent Action', `Führe aus: ${actionRef}`);

      return await this.dispatch(actionRef, params, true);
    } catch (err) {
      console.warn('[ConnectorEngine] callWithIntent failed:', err.message);
      return this._result(false, `Intent-Auflösung fehlgeschlagen: ${err.message}`);
    }
  }

  _registerBuiltins() {
    // WHOOP
    this.register({
      id: 'whoop',
      name: 'WHOOP',
      icon: '⌚',
      description: 'Synchronisiere Schlaf, HRV und Erholungs-Metriken direkt von deinem WHOOP Strap.',
      actions: [
        {
          id: 'sync_biometrics',
          name: 'Biometrie abgleichen',
          description: 'Hole die neuesten Daten zu Schlaf und HRV ab.',
          params: {
            clientId: { type: 'string', description: 'WHOOP Client ID', required: false },
            clientSecret: { type: 'string', description: 'WHOOP Client Secret', required: false }
          }
        }
      ],
      execute: async (actionId) => {
        const { ok, data } = await this._postJson('/api/connectors/whoop/sync', {}, true);
        if (ok && data.connected) {
          return { success: true, message: data.message, data: data.data };
        }
        if (data && data.connected === false) {
          // Not linked yet: start the OAuth flow.
          try {
            const headers = await this._authHeaders();
            const res = await fetch('/api/connectors/whoop/authorize', { headers });
            const auth = await res.json();
            if (auth.authorizeUrl && typeof window !== 'undefined') {
              window.location.href = auth.authorizeUrl;
              return { success: true, message: 'WHOOP: Leite zur Autorisierung weiter…' };
            }
          } catch (e) {
            return { success: false, message: `WHOOP: Autorisierung fehlgeschlagen (${e.message}).` };
          }
        }
        return { success: false, message: data?.message || 'WHOOP: Sync fehlgeschlagen.' };
      }
    });

    // Notion
    this.register({
      id: 'notion',
      name: 'Notion',
      icon: '📝',
      description: 'Erstelle Seiten, Datenbank-Einträge und verwalte Wissen in Notion.',
      actions: [
        {
          id: 'create_page',
          name: 'Seite erstellen',
          description: 'Erstelle eine neue Seite in Notion mit Titel und Inhalt.',
          params: {
            title: { type: 'string', description: 'Titel der Seite', required: true },
            content: { type: 'string', description: 'Inhalt der Seite', required: false }
          }
        },
        {
          id: 'export_protocol',
          name: 'Protokoll exportieren',
          description: 'Übertrage das Tagesprotokoll in deine Notion-Datenbank.',
          params: {
            date: { type: 'string', description: 'Datum des Protokolls', required: true },
            blocksCount: { type: 'number', description: 'Anzahl der Blöcke', required: true }
          }
        }
      ],
      execute: async (actionId, params) => {
        const conn = this._ctx.connectors || {};
        const body = { action: actionId, token: conn.notionToken, ...params };
        if (actionId === 'export_protocol') body.databaseId = params.databaseId || conn.notionDatabaseId;
        if (actionId === 'create_page') body.parentPageId = params.parentPageId || conn.notionParentPageId;
        const { data } = await this._postJson('/api/connectors/notion', body);
        return { success: !!data.success, message: data.message, data: data.data };
      }
    });

    // Stripe / PayPal
    this.register({
      id: 'paypal',
      name: 'PayPal',
      icon: '💳',
      description: 'Zahlungen und Bestellungen via PayPal initiieren.',
      actions: [
        {
          id: 'create_order',
          name: 'Bestellung initiieren',
          description: 'Erstelle eine PayPal-Zahlungsanforderung für ein Produkt.',
          params: {
            item: { type: 'string', description: 'Produktname', required: true },
            amount: { type: 'number', description: 'Betrag in EUR', required: true }
          }
        }
      ],
      execute: async (actionId, params) => {
        const { data } = await this._postJson('/api/connectors/paypal', {
          action: 'create_order',
          item: params.item,
          amount: params.amount,
        });
        if (data.success && data.data?.approveLink && typeof window !== 'undefined') {
          window.open(data.data.approveLink, '_blank', 'noopener');
        }
        return { success: !!data.success, message: data.message, data: data.data };
      }
    });

    // Zapier
    this.register({
      id: 'zapier',
      name: 'Zapier',
      icon: '⚡',
      description: 'Triggere beliebige Zapier-Workflows via Webhook.',
      actions: [
        {
          id: 'trigger_webhook',
          name: 'Webhook auslösen',
          description: 'Sende Daten an einen konfigurierten Zapier Webhook.',
          params: {
            event: { type: 'string', description: 'Event-Name z.B. "stack_reorder"', required: true }
          }
        }
      ],
      execute: async (actionId, params) => {
        const conn = this._ctx.connectors || {};
        const webhookUrl = params.webhookUrl || conn.zapierWebhookUrl;
        const { data } = await this._postJson('/api/connectors/zapier', {
          webhookUrl,
          event: params.event,
          data: params.data,
        });
        return { success: !!data.success, message: data.message };
      }
    });
  }

  _result(success, message, data = null) {
    return { success, message, data };
  }

  _logAction(actionRef, params, result) {
    this._log.unshift({
      ts: new Date().toLocaleTimeString(),
      actionRef,
      params,
      success: result.success,
      message: result.message
    });
    if (this._log.length > 50) this._log.pop();
  }

  on(event, cb) {
    this._listeners.push({ event, cb });
  }

  _emit(event, data) {
    this._listeners.filter(l => l.event === event).forEach(l => l.cb(data));
  }

  getLog() {
    return this._log;
  }
}

let Connectors;
if (process.env.NODE_ENV === 'production') {
  Connectors = new ConnectorEngine();
} else {
  if (!globalThis.Connectors) {
    globalThis.Connectors = new ConnectorEngine();
  }
  Connectors = globalThis.Connectors;
}
export { Connectors };
