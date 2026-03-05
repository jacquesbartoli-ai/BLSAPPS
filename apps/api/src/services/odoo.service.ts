import { env } from "../config/env.js";

type OdooExecuteKwPayload = {
  model: string;
  method: string;
  args?: unknown[];
  kwargs?: Record<string, unknown>;
};

export class OdooService {
  async executeKw<T = unknown>(payload: OdooExecuteKwPayload): Promise<T> {
    if (!env.ODOO_BASE_URL || !env.ODOO_DATABASE || !env.ODOO_USERNAME || !env.ODOO_API_KEY) {
      throw new Error("Configuration Odoo incomplète.");
    }

    const body = {
      jsonrpc: "2.0",
      method: "call",
      id: Date.now(),
      params: {
        service: "object",
        method: "execute_kw",
        args: [
          env.ODOO_DATABASE,
          2,
          env.ODOO_API_KEY,
          payload.model,
          payload.method,
          payload.args ?? [],
          payload.kwargs ?? {}
        ]
      }
    };

    const response = await fetch(`${env.ODOO_BASE_URL}/jsonrpc`, {
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
