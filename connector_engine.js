/**
 * ConnectorEngine
 * Pronoia External Integration Layer
 *
 * Architecture:
 *   ConnectorEngine.register(connector) — plug in any connector
 *   ConnectorEngine.dispatch(actionId, params) — execute an action
 *   ConnectorEngine.getTools() — returns Mistral function-calling schema
 *   ConnectorEngine.callWithIntent(userIntent, context) — AI picks + executes
 *
 * Each connector must conform to:
 * {
 *   id: string,               // unique identifier
 *   name: string,             // display name
 *   icon: string,             // emoji or icon string
 *   description: string,      // what this connector does
 *   actions: Action[],        // list of available actions
 *   execute: async (actionId, params) => ConnectorResult
 * }
 *
 * Action:
 * {
 *   id: string,
 *   name: string,
 *   description: string,
 *   params: { [key]: { type, description, required } }
 * }
 *
 * ConnectorResult:
 * {
 *   success: boolean,
 *   message: string,
 *   data?: any,
 *   confirmUrl?: string      // optional: URL for user to confirm/complete
 * }
 */

export class ConnectorEngine {
  constructor() {
    this._registry = new Map(); // id -> connector
    this._log = [];             // execution log
    this._listeners = [];       // event callbacks

    // Register built-in stub connectors on init
    this._registerBuiltins();
  }

  // ─── Registration ─────────────────────────────────────────────

  /**
   * Register a connector in the engine.
   * @param {object} connector
   */
  register(connector) {
    if (!connector.id || !connector.name || !connector.actions || !connector.execute) {
      console.error('[ConnectorEngine] Invalid connector schema:', connector);
      return false;
    }
    this._registry.set(connector.id, connector);
    console.log(`[ConnectorEngine] Registered: ${connector.name} (${connector.actions.length} actions)`);
    this._emit('connector:registered', { connector });
    return true;
  }

  /**
   * Unregister a connector.
   * @param {string} id
   */
  unregister(id) {
    this._registry.delete(id);
    this._emit('connector:unregistered', { id });
  }

  /**
   * Get all registered connectors.
   */
  getAll() {
    return Array.from(this._registry.values());
  }

  /**
   * Get a single connector by id.
   * @param {string} id
   */
  get(id) {
    return this._registry.get(id);
  }

  // ─── Dispatch ─────────────────────────────────────────────────

  /**
   * Execute an action on a connector.
   * Format: "connectorId.actionId"
   * @param {string} actionRef  e.g. "notion.create_page"
   * @param {object} params
   * @param {boolean} requireConfirm  If true, shows confirm dialog first
   * @returns {Promise<ConnectorResult>}
   */
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

    // Confirmation gate
    if (requireConfirm) {
      const confirmed = await this._confirmDialog(connector, action, params);
      if (!confirmed) {
        return this._result(false, 'Aktion vom Nutzer abgebrochen.');
      }
    }

    // Execute
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

  // ─── Mistral Tool Calling Integration ─────────────────────────

  /**
   * Returns the tools schema for Mistral function calling.
   * Call this to get the `tools` parameter for the API.
   */
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

  /**
   * Let Mistral pick and execute a connector action based on user intent.
   * @param {string} userIntent  Natural language intent
   * @param {object} context     Current agent context (stack, profile, etc.)
   * @param {Function} toastFn   Optional: function(title, msg) to show UI feedback
   * @returns {Promise<ConnectorResult>}
   */
  async callWithIntent(userIntent, context = {}, toastFn = null) {
    const tools = this.getTools();
    if (tools.length === 0) {
      return this._result(false, 'Keine Konnektoren registriert.');
    }

    const contextStr = JSON.stringify({
      stack: context.stack?.map(s => ({ name: s.name, supply: s.supply })) || [],
      profile: context.profile?.goals || '',
    });

    const systemPrompt = `Du bist der Pronoia Action Dispatcher. 
Nutzerkontext: ${contextStr}
Wähle die passende Funktion/Aktion für die Anfrage. 
Antworte NUR mit einem Tool Call, keine Erklärung.`;

    try {
      const response = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userIntent,
          systemPrompt,
          tools,
          tool_choice: 'auto'
        })
      });

      if (!response.ok) throw new Error(`API ${response.status}`);

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

      if (!toolCall) {
        return this._result(false, 'Kein passender Konnektor gefunden.');
      }

      // Convert Mistral function name back to actionRef (double underscore → dot)
      const actionRef = toolCall.function.name.replace('__', '.');
      const params = JSON.parse(toolCall.function.arguments || '{}');

      if (toastFn) toastFn('Agent Action', `Führe aus: ${actionRef}`);

      return await this.dispatch(actionRef, params, true);
    } catch (err) {
      console.warn('[ConnectorEngine] callWithIntent failed:', err.message);
      return this._result(false, `Intent-Auflösung fehlgeschlagen: ${err.message}`);
    }
  }

  // ─── Built-in Stub Connectors ──────────────────────────────────

  _registerBuiltins() {
    // ── NOTION ──────────────────────────────────────────────────
    this.register({
      id: 'notion',
      name: 'Notion',
      icon: '📝',
      description: 'Erstelle Seiten, Datenbank-Einträge und verwalte Wissen in Notion.',
      connected: false, // user must configure
      actions: [
        {
          id: 'create_page',
          name: 'Seite erstellen',
          description: 'Erstelle eine neue Seite in Notion mit Titel und Inhalt.',
          params: {
            title: { type: 'string', description: 'Titel der Seite', required: true },
            content: { type: 'string', description: 'Inhalt der Seite', required: false },
            database_id: { type: 'string', description: 'Notion Database ID (optional)', required: false }
          }
        },
        {
          id: 'log_supplement',
          name: 'Supplement loggen',
          description: 'Logge eine Supplement-Einnahme in die Notion Datenbank.',
          params: {
            supplement: { type: 'string', description: 'Name des Supplements', required: true },
            dose: { type: 'string', description: 'Dosis', required: false },
            timestamp: { type: 'string', description: 'Zeitstempel', required: false }
          }
        }
      ],
      execute: async (actionId, params) => {
        const apiKey = localStorage.getItem('connector_notion_key');
        if (!apiKey) {
          return {
            success: false,
            message: 'Notion API Key nicht konfiguriert. Bitte in den Connector-Einstellungen hinterlegen.',
            requiresSetup: true,
            setupKey: 'connector_notion_key'
          };
        }
        // Stub: in production, call Notion API here
        console.log('[Notion Connector] Would execute:', actionId, params);
        return {
          success: true,
          message: `Notion: "${params.title || params.supplement}" erfolgreich übertragen.`,
          data: { actionId, params }
        };
      }
    });

    // ── PAYPAL ──────────────────────────────────────────────────
    this.register({
      id: 'paypal',
      name: 'PayPal',
      icon: '💳',
      description: 'Zahlungen und Bestellungen via PayPal initiieren.',
      connected: false,
      actions: [
        {
          id: 'create_order',
          name: 'Bestellung initiieren',
          description: 'Erstelle eine PayPal-Zahlungsanforderung für ein Produkt.',
          params: {
            item: { type: 'string', description: 'Produktname', required: true },
            amount: { type: 'number', description: 'Betrag in EUR', required: true },
            description: { type: 'string', description: 'Beschreibung', required: false }
          }
        }
      ],
      execute: async (actionId, params) => {
        const clientId = localStorage.getItem('connector_paypal_client_id');
        if (!clientId) {
          return {
            success: false,
            message: 'PayPal Client ID nicht konfiguriert.',
            requiresSetup: true,
            setupKey: 'connector_paypal_client_id'
          };
        }
        // Stub: in production, create PayPal order via API
        console.log('[PayPal Connector] Would create order:', params);
        return {
          success: true,
          message: `PayPal: Bestellung für "${params.item}" (€${params.amount}) initiiert.`,
          confirmUrl: `https://www.paypal.com`, // placeholder
          data: { actionId, params }
        };
      }
    });

    // ── ZAPIER WEBHOOK ──────────────────────────────────────────
    this.register({
      id: 'zapier',
      name: 'Zapier',
      icon: '⚡',
      description: 'Triggere beliebige Zapier-Workflows via Webhook.',
      connected: false,
      actions: [
        {
          id: 'trigger_webhook',
          name: 'Webhook auslösen',
          description: 'Sende Daten an einen konfigurierten Zapier Webhook.',
          params: {
            event: { type: 'string', description: 'Event-Name z.B. "stack_reorder"', required: true },
            payload: { type: 'string', description: 'JSON Payload als String', required: false }
          }
        }
      ],
      execute: async (actionId, params) => {
        const webhookUrl = localStorage.getItem('connector_zapier_webhook');
        if (!webhookUrl) {
          return {
            success: false,
            message: 'Zapier Webhook URL nicht konfiguriert.',
            requiresSetup: true,
            setupKey: 'connector_zapier_webhook'
          };
        }
        try {
          const payload = params.payload ? JSON.parse(params.payload) : {};
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: params.event, ...payload, source: 'pronoia' })
          });
          return { success: true, message: `Zapier: Event "${params.event}" ausgelöst.` };
        } catch (err) {
          return { success: false, message: `Zapier Webhook Fehler: ${err.message}` };
        }
      }
    });

    // ── EMAIL (via API route) ────────────────────────────────────
    this.register({
      id: 'email',
      name: 'E-Mail',
      icon: '✉️',
      description: 'Sende automatisierte E-Mails z.B. Bestellanfragen.',
      connected: false,
      actions: [
        {
          id: 'send',
          name: 'E-Mail senden',
          description: 'Sende eine E-Mail mit Betreff und Inhalt.',
          params: {
            to: { type: 'string', description: 'Empfänger E-Mail', required: true },
            subject: { type: 'string', description: 'Betreff', required: true },
            body: { type: 'string', description: 'E-Mail Inhalt', required: true }
          }
        }
      ],
      execute: async (actionId, params) => {
        try {
          const res = await fetch('/api/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
          });
          if (!res.ok) throw new Error(`Status ${res.status}`);
          return { success: true, message: `E-Mail an "${params.to}" gesendet.` };
        } catch (err) {
          return { success: false, message: `E-Mail Fehler: ${err.message}` };
        }
      }
    });

    // ── CUSTOM WEBHOOK (generic) ─────────────────────────────────
    this.register({
      id: 'webhook',
      name: 'Custom Webhook',
      icon: '🔗',
      description: 'Sende HTTP POST an einen beliebigen Endpoint.',
      connected: false,
      actions: [
        {
          id: 'post',
          name: 'POST senden',
          description: 'Sende einen HTTP POST Request mit JSON-Payload.',
          params: {
            url: { type: 'string', description: 'Ziel-URL', required: true },
            payload: { type: 'string', description: 'JSON Payload als String', required: false }
          }
        }
      ],
      execute: async (actionId, params) => {
        try {
          const body = params.payload ? JSON.parse(params.payload) : {};
          await fetch(params.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...body, source: 'pronoia', ts: Date.now() })
          });
          return { success: true, message: `Webhook an "${params.url}" gesendet.` };
        } catch (err) {
          return { success: false, message: `Webhook Fehler: ${err.message}` };
        }
      }
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────

  /**
   * Show a native confirm dialog (can be replaced with custom UI).
   */
  _confirmDialog(connector, action, params) {
    return new Promise((resolve) => {
      // Build a custom overlay if possible, fall back to window.confirm
      const paramStr = Object.entries(params)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
      const msg = `${connector.icon} ${connector.name}: ${action.name}\n\n${paramStr || '(keine Parameter)'}\n\nAusführen?`;

      // Use custom UI confirm if available (pronoia toast system)
      if (window.Agent && window.Agent.UI && window.Agent.UI.confirmDialog) {
        window.Agent.UI.confirmDialog(msg, resolve);
      } else {
        resolve(window.confirm(msg));
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

// Export singleton
export const Connectors = new ConnectorEngine();
