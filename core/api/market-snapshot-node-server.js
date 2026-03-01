/**
 * Skill: architecture/arch-infrastructure
 * Skill: process/process-env-sync-governance
 * Causality: GC.v6w7.fail-fast-external-contract
 * Formula: G.m1n2.fail-fast-migration && C.q1r2.external-contract-only
 */
import http from "http";

export class MarketSnapshotNodeServer {
  constructor(params = {}) {
    this.handler = params.handler;
    this.host = params.host || "127.0.0.1";
    this.port = Number.isFinite(params.port) ? Math.max(0, Math.floor(params.port)) : 18082;
    this.shutdownTimeoutMs = Number.isFinite(params.shutdownTimeoutMs) ? Math.max(100, Math.floor(params.shutdownTimeoutMs)) : 5000;
    this.requestLogger = typeof params.requestLogger === "function" ? params.requestLogger : null;
    this.server = null;
    this.activeSockets = new Set();
  }

  async start() {
    if (this.server) return { host: this.host, port: this.port };
    this.server = http.createServer(async (req, res) => {
      const startedAt = Date.now();
      try {
        const requestId = (typeof req.headers["x-request-id"] === "string" && req.headers["x-request-id"].trim())
          ? req.headers["x-request-id"].trim()
          : `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        const response = await this.handler.handle({
          method: req.method,
          url: req.url,
          headers: req.headers,
          requestId,
        });
        if (this.requestLogger) {
          this.requestLogger({
            method: req.method || "GET",
            url: req.url || "/",
            status: response.status || 500,
            requestId,
            durationMs: Date.now() - startedAt,
          });
        }
        res.statusCode = response.status || 500;
        const headers = response.headers || {};
        for (const [name, value] of Object.entries(headers)) {
          res.setHeader(name, value);
        }
        if (!res.getHeader("x-response-time-ms")) {
          res.setHeader("x-response-time-ms", String(Math.max(0, Date.now() - startedAt)));
        }
        if ((req.method || "").toUpperCase() === "HEAD") {
          res.end();
        } else {
          res.end(response.body || "");
        }
      } catch {
        const fallbackRequestId = (typeof req.headers["x-request-id"] === "string" && req.headers["x-request-id"].trim())
          ? req.headers["x-request-id"].trim()
          : `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        if (this.requestLogger) {
          this.requestLogger({
            method: req.method || "GET",
            url: req.url || "/",
            status: 500,
            requestId: fallbackRequestId,
            durationMs: Date.now() - startedAt,
          });
        }
        res.statusCode = 500;
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.setHeader("x-content-type-options", "nosniff");
        res.setHeader("x-request-id", fallbackRequestId);
        res.setHeader("x-api-version", "v1");
        res.setHeader("x-service-state", "degraded");
        res.setHeader("access-control-allow-origin", "*");
        res.setHeader("access-control-allow-methods", "GET,OPTIONS");
        res.setHeader("access-control-allow-headers", "content-type,x-request-id");
        res.setHeader("x-response-time-ms", String(Math.max(0, Date.now() - startedAt)));
        res.end(JSON.stringify({
          ok: false,
          error: { code: "INTERNAL_SERVER_ERROR", message: "Unhandled server failure", requestId: fallbackRequestId },
        }));
      }
    });

    await new Promise((resolve, reject) => {
      this.server.once("error", reject);
      this.server.on("connection", (socket) => {
        this.activeSockets.add(socket);
        socket.on("close", () => {
          this.activeSockets.delete(socket);
        });
      });
      this.server.listen(this.port, this.host, resolve);
    });
    const address = this.server.address();
    return {
      host: this.host,
      port: typeof address === "object" && address ? address.port : this.port,
    };
  }

  async stop() {
    if (!this.server) return;
    const srv = this.server;
    this.server = null;
    const forceCloseTimer = setTimeout(() => {
      try {
        srv.closeAllConnections?.();
        for (const socket of this.activeSockets) {
          socket.destroy();
        }
      } catch {
        // no-op best-effort fallback
      }
    }, this.shutdownTimeoutMs);
    await new Promise((resolve, reject) => {
      srv.close((error) => {
        clearTimeout(forceCloseTimer);
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

export function createMarketSnapshotNodeServer(params = {}) {
  return new MarketSnapshotNodeServer(params);
}
