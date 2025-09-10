// src/database/index.js
require('dotenv').config();
const { Pool } = require('pg');

const {
  DB_USER = 'postgres',
  DB_HOST = '127.0.0.1',
  DB_NAME = 'estamparia',
  DB_PASSWORD = 'BT_2025$',
  DB_PORT = '5432',
} = process.env;

// Pool único da aplicação
const pool = new Pool({
  host: DB_HOST,
  port: Number(DB_PORT),
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30_000,
});

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

module.exports = { pool, query };
