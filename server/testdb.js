// server/test-db.js
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

console.log('\n=== Testing Database Connection ===');
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD); // Show actual password temporarily
console.log('Password length:', process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 0);
console.log('Password as array:', process.env.DB_PASSWORD ? process.env.DB_PASSWORD.split('') : []);

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT),
});

pool.query('SELECT NOW() as time', (err, res) => {
  if (err) {
    console.log('\n❌ CONNECTION FAILED');
    console.error('Error code:', err.code);
    console.error('Error message:', err.message);
  } else {
    console.log('\n✅ SUCCESS!');
    console.log('Server time:', res.rows[0].time);
  }
  pool.end();
  process.exit(err ? 1 : 0);
});
