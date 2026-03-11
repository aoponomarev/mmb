/**
 * @description Shared PostgreSQL adapter for Yandex Functions; wraps client lifecycle, query execution, and optional transactions.
 * @skill-anchor id:sk-bb7c8e #for-layer-separation
 * @skill-anchor id:sk-224210 #for-adapter-mandatory
 *
 * PURPOSE: Keep pg.Client lifecycle behind a reusable adapter while each function injects its own pg ClientClass.
 */
'use strict';

class PostgresAdapter {
    constructor(config, options = {}) {
        if (!config || typeof config !== 'object') {
            throw new Error('PostgresAdapter requires a config object');
        }

        const clientFactory = typeof options.clientFactory === 'function'
            ? options.clientFactory
            : (typeof options.ClientClass === 'function'
                ? () => new options.ClientClass(config)
                : null);

        if (!clientFactory) {
            throw new Error('PostgresAdapter requires ClientClass or clientFactory');
        }

        this.config = config;
        this.clientFactory = clientFactory;
        this.client = options.client || null;
        this.connected = false;
    }

    async connect() {
        if (!this.client) {
            this.client = this.clientFactory();
        }

        if (!this.connected) {
            await this.client.connect();
            this.connected = true;
        }

        return this;
    }

    // @causality #for-adapter-mandatory
    async query(sql, params = []) {
        if (!this.client || !this.connected) {
            throw new Error('PostgresAdapter query called before connect()');
        }
        return this.client.query(sql, params);
    }

    async transaction(work) {
        if (typeof work !== 'function') {
            throw new Error('PostgresAdapter transaction requires a callback');
        }

        await this.query('BEGIN');
        try {
            const result = await work(this);
            await this.query('COMMIT');
            return result;
        } catch (error) {
            await this.query('ROLLBACK');
            throw error;
        }
    }

    async close() {
        if (!this.client) {
            return;
        }
        await this.client.end().catch(() => {});
        this.connected = false;
    }
}

module.exports = { PostgresAdapter };
