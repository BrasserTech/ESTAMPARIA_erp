// src/database/index.js
// Módulo único de conexão ao PostgreSQL para toda a aplicação.

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Carrega .env de forma resiliente (portable/empacotado/dev)
(function loadEnvOnce() {
  const candidates = [
    path.join(process.cwd(), '.env'),
    path.join(process.execPath, '..', '.env'),
    path.join(process.resourcesPath || '', '.env'),
  ];
  let loaded = false;
  for (const p of candidates) {
    try {
      if (p && fs.existsSync(p)) {
        require('dotenv').config({ path: p });
        loaded = true;
        break;
      }
    } catch { /* ignore */ }
  }
  if (!loaded) {
    try { require('dotenv').config(); } catch { /* ignore */ }
  }
})();

let currentConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || ''), // sempre string
  max: 10,
  idleTimeoutMillis: 30_000,
};

if (!currentConfig.password || currentConfig.password.trim() === '') {
  console.error('[PG] Atenção: DB_PASSWORD ausente/vazia. Verifique o .env.');
}

let pool = new Pool(currentConfig);

pool.on('error', (err) => {
  console.error('[PG] erro no pool:', err);
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

function getConfig() {
  const { password, ...safe } = currentConfig;
  return safe;
}

async function reconfigure(nextPartial = {}) {
  const next = {
    ...currentConfig,
    ...nextPartial,
  };
  next.port = Number(next.port || 5432);
  next.password = String(
    nextPartial.password ?? currentConfig.password ?? ''
  );

  try { await pool.end(); } catch { /* ignore */ }
  pool = new Pool(next);
  pool.on('error', (err) => console.error('[PG] erro no pool (reconfig):', err));
  currentConfig = next;
  return getConfig();
}

module.exports = { query, getConfig, reconfigure };
