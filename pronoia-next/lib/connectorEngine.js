/**
 * ConnectorEngine
 * Pronoia External Integration Layer
 */

export class ConnectorEngine {
  constructor() {
    this._registry = new Map(); // id -> connector
    this._log = [];             // execution log
    this._listeners = [];       // event callbacks

    this._registerBuiltins();
  }

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
        }
      ],
      execute: async (actionId, params) => {
        console.log('[Notion Connector] Executing:', actionId, params);
        return {
          success: true,
          message: `Notion: "${params.title}" erfolgreich übertragen.`
        };
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
        console.log('[PayPal Connector] Executing:', params);
        return {
          success: true,
          message: `PayPal: Bestellung für "${params.item}" (€${params.amount}) initiiert.`
        };
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
        console.log('[Zapier Connector] Webhook trigger:', params);
        return { success: true, message: `Zapier: Event "${params.event}" ausgelöst.` };
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

export const Connectors = new ConnectorEngine();
