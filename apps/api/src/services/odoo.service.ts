import { env } from "../config/env.js";

type OdooExecuteKwPayload = {
  model: string;
  method: string;
  args?: unknown[];
  kwargs?: Record<string, unknown>;
};

export class OdooService {
  private normalizedBaseUrl() {
    if (!env.ODOO_BASE_URL) {
      throw new Error("ODOO_BASE_URL manquant.");
    }
    try {
      const url = new URL(env.ODOO_BASE_URL);
      return url.origin;
    } catch {
      return env.ODOO_BASE_URL.replace(/\/+$/, "");
    }
  }

  private async resolveUid() {
    if (env.ODOO_USER_ID) {
      return env.ODOO_USER_ID;
    }
    if (!env.ODOO_DATABASE || !env.ODOO_USERNAME || !env.ODOO_API_KEY) {
      throw new Error("Configurer ODOO_USER_ID ou ODOO_DATABASE + ODOO_USERNAME + ODOO_API_KEY.");
    }

    const response = await fetch(`${this.normalizedBaseUrl()}/jsonrpc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        id: Date.now(),
        params: {
          service: "common",
          method: "authenticate",
          args: [env.ODOO_DATABASE, env.ODOO_USERNAME, env.ODOO_API_KEY, {}]
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Erreur auth Odoo HTTP ${response.status}`);
    }
    const payload = (await response.json()) as { result?: unknown; error?: unknown };
    if (payload.error) {
      throw new Error(`Erreur auth JSON-RPC Odoo: ${JSON.stringify(payload.error)}`);
    }
    if (typeof payload.result !== "number" || payload.result <= 0) {
      throw new Error("Impossible de résoudre l'UID Odoo.");
    }
    return payload.result;
  }

  async executeKw<T = unknown>(payload: OdooExecuteKwPayload): Promise<T> {
    if (!env.ODOO_BASE_URL || !env.ODOO_DATABASE || !env.ODOO_API_KEY) {
      throw new Error("Configuration Odoo incomplète: ODOO_BASE_URL, ODOO_DATABASE et ODOO_API_KEY requis.");
    }
    const uid = await this.resolveUid();

    const body = {
      jsonrpc: "2.0",
      method: "call",
      id: Date.now(),
      params: {
        service: "object",
        method: "execute_kw",
        args: [
          env.ODOO_DATABASE,
          uid,
          env.ODOO_API_KEY,
          payload.model,
          payload.method,
          payload.args ?? [],
          payload.kwargs ?? {}
        ]
      }
    };

    const response = await fetch(`${this.normalizedBaseUrl()}/jsonrpc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`Erreur Odoo HTTP ${response.status}`);
    }

    const result = await response.json() as { result?: T; error?: unknown };
    if (result.error) {
      throw new Error(`Erreur JSON-RPC Odoo: ${JSON.stringify(result.error)}`);
    }
    return result.result as T;
  }
}

export const odooService = new OdooService();
