const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const file = process.argv[2];
if (!file) { console.error('Usage: node run-migration.js <file.sql>'); process.exit(1); }

const sql = fs.readFileSync(path.resolve(file), 'utf8');

const client = new Client({
    host: 'rc1b-dgs1vgc130gbme2n.mdb.yandexcloud.net',
    port: 6432,
    database: 'app_db',
    user: 'app_admin',
    password: process.env.DB_PASSWORD || '********',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
});

client.connect()
    .then(() => client.query(sql))
    .then(() => { console.log('Migration OK:', file); return client.end(); })
    .catch(e => { console.error('Migration FAILED:', e.message); process.exit(1); });
