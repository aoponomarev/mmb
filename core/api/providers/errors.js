/**
 * #JS-ETumeEQi
 * @description Standard error models and HTTP status mapping for all providers and services.
 * @skill id:sk-bb7c8e
 */

export const BACKEND_ERROR_CODES = Object.freeze({
    InvalidProvider: "INVALID_PROVIDER",
    ProviderNotFound: "PROVIDER_NOT_FOUND",
    MissingProviderApiKey: "MISSING_PROVIDER_API_KEY",
    NoProviderRegistered: "NO_PROVIDER_REGISTERED",
    InvalidInput: "INVALID_INPUT",
    RateLimitBlocked: "RATE_LIMIT_BLOCKED",
    ExternalHttp: "EXTERNAL_HTTP",
    ExternalTimeout: "EXTERNAL_TIMEOUT",
    ExternalUnknown: "EXTERNAL_UNKNOWN",
});

export class BackendCoreError extends Error {
    constructor(code, message, details = {}) {
        super(message);
        this.name = "BackendCoreError";
        this.code = code;
        this.details = details;
    }
}

export function isRetriableBackendErrorCode(code) {
    return code === BACKEND_ERROR_CODES.ExternalTimeout || code === BACKEND_ERROR_CODES.ExternalHttp;
}

export function toBackendCoreError(error, fallbackCode, fallbackMessage, details = {}) {
    if (error instanceof BackendCoreError) return error;
    return new BackendCoreError(fallbackCode, fallbackMessage, {
        ...details,
        cause: error?.message || String(error),
    });
}

export function toBackendHttpStatus(code) {
    if (code === BACKEND_ERROR_CODES.InvalidInput) return 400;
    if (code === BACKEND_ERROR_CODES.RateLimitBlocked) return 429;
    if (code === BACKEND_ERROR_CODES.ProviderNotFound || code === BACKEND_ERROR_CODES.NoProviderRegistered) return 503;
    if (code === BACKEND_ERROR_CODES.ExternalHttp || code === BACKEND_ERROR_CODES.ExternalTimeout || code === BACKEND_ERROR_CODES.ExternalUnknown) return 502;
    return 500;
}
