import pkg from 'pg';
const { Pool } = pkg;

console.log('Testing with HARDCODED values (no .env)...\n');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'cs554',
  password: 'cat',  // hardcoded password
  port: 5432,
});

pool.query('SELECT NOW() as time, current_user', (err, res) => {
  if (err) {
    console.log('❌ FAILED');
    console.log('Error code:', err.code);
    console.log('Error message:', err.message);
  } else {
    console.log('✅ SUCCESS!');
    console.log('Current time:', res.rows[0].time);
    console.log('Connected as:', res.rows[0].current_user);
  }
  pool.end();
});
